# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FGate Nexus is a **Minecraft server chat bridge**: it connects Minecraft servers (via the separate [FGateClient](https://github.com/CrashVibe/FGateClient)) to chat platforms (OneBot/QQ, Discord) for message sync, account binding, event notifications, and remote command execution.

It is a **Bun workspaces monorepo**:

- `apps/server/` — **Hono on Bun**: HTTP API + native WebSocket + the whole service layer (Koishi chat bridge, MC WebSocket bridge, binding manager, puppeteer rendering). Drizzle ORM + SQLite.
- `apps/web/` — **React 19 + Vite 6 SPA**: shadcn/ui (Tailwind v4) + TanStack Router/Query + Zustand + React Hook Form. SSR-free, dark-theme-first admin panel.
- `packages/shared/` (`@fgate/shared`) — Zod request/response schemas, validators, and shared utils (binding codes, minecraft-format, message templates). **The boundary shared by both client and server.**

The runtime target is **Bun**; production ships as a **single compiled Bun binary** (`bun build --compile`) with the built frontend and DB migrations embedded inline. (This project was migrated off Nuxt 4 — if you find Nuxt/Nitro/Vue references anywhere, they are stale.)

## Commands

The package manager is **Bun** (`bun.lock`). Use `bun` / `bun run`, not npm/pnpm.

```bash
bun run dev            # run server (Bun, --watch) and web (Vite) together; web proxies /api + ws to :3000
bun run dev:server     # backend only: bun --watch apps/server/src/index.ts
bun run dev:web        # frontend only: vite dev (apps/web)
bun run typecheck      # tsc --noEmit for both web and server
bun run check          # ultracite check  (wraps oxlint+oxfmt; run before committing)
bun run fix            # ultracite fix
bun run knip           # knip — find unused files, deps, and exports
bun run db:generate    # drizzle-kit generate — create a migration from schema changes
bun run db:migrate     # bun scripts/migrate.ts — apply migrations to ./data/sqlite.db
bun run build:web      # vite build → apps/web/dist (同时生成 apps/server/dist/assets.ts)
bun run build:bundle   # build:web + gen-embedded-migrations (no compile)
bun run build:all      # build:bundle, then cross-compile binaries (mac/linux/win) into ./dist
bun run build          # alias for build:all
```

`postinstall` 自动运行 `gen-embedded-migrations.ts`，生成 `apps/server/dist/migrations.ts` 并在 `apps/server/dist/assets.ts` 不存在时写入空占位，确保 fresh clone 后 TypeScript 编译通过。`apps/server/dist/assets.ts` 的正式内容由 `build:web`（Vite 插件 `embedServerAssets`）写入。

There is **no test suite or test runner** configured. Do not invent test commands.

Lint/format runs automatically on commit via Husky + lint-staged (`oxlint --fix` + `oxfmt --write`). Linting/formatting is Oxlint + Oxfmt under the "Ultracite" preset (`oxlint.config.ts` extends `core` + `react`); `.github/copilot-instructions.md` documents the enforced code standards.

## Architecture

### Two distinct bridges, joined by services

The core data flow connects a Minecraft server on one side to a chat platform on the other. Two subsystems handle each side, both living in `apps/server/src/service/`:

1. **`mcwsbridge/`** — the Minecraft side. FGateClient instances connect over **WebSocket**. The Bun-native WS handler lives in `apps/server/src/ws/mc-bridge.ts` (open/message/close), wired into `Bun.serve({ websocket })` from `index.ts`. A thin **Peer adapter** (`service/mcwsbridge/peer.ts`) wraps Bun's `ServerWebSocket` into the `Peer` shape the session layer expects (carrying id/headers via `ws.data`). Auth (in the WS upgrade/open path) is a per-server `token` (Bearer header) checked against `serverTable`, plus an `x-api-version` header validated against `apps/server/src/utils/version.ts` (API version from `package.json` `apiVersion`). `ConnectionManager` (singleton, `connection-manager.ts`) tracks one `ServerSession` per server, indexed by both `serverId` and `peerId`. Incoming MC events dispatch to `handler/*-handler.ts` (chat, join, leave, death, login).

2. **`chatbridge/`** — the chat-platform side, built on **Koishi**. `ChatBridge` (singleton, `index.ts`) owns a Koishi `Context`, spins up bots via `BotFactory`, tracks them in `ConnectionStore`, and routes inbound platform messages through `message-router.ts`. Outbound messages go through `sender/platform/{onebot,discord}.ts` (each extends `sender/platform/base.ts`); `event-config-map.ts` maps MC event types to per-target send config.

The bridges are linked by an `EventHandlerMap` in `chatbridge/index.ts` mapping each `MCEventType` (`player.chat`, `player.join`, `player.death`, `system.notify`, `execute.command`, …) to a `PlatformSender` method.

3. **`bindingmanager/`** — account binding/unbinding between Minecraft players and platform accounts. `BindingService` (singleton facade, `index.ts`) keeps pending bindings in an in-memory `PendingBindingStore` (with TTL) and dispatches platform sessions to ordered `handlers/` (bind-code, unbind-command, group-leave). Expired-binding cleanup is registered via the cleanup registry.

All three services are **singletons**. They are initialized and torn down by `apps/server/src/index.ts` (which replaced the old Nitro plugins): config → DB → banner → image renderer → `chatBridge.init()` → `Bun.serve`. On `SIGTERM`/`SIGINT`/`SIGQUIT` it closes the bridge / image renderer and runs the cleanup registry.

### Server entry / lifecycle

`apps/server/src/index.ts` is the single entry point for both `dev` and the compiled binary (it replaced `entry.ts` + the `server/plugins/10~40` ordering). Startup order: `configManager.init()` → resolve `CHROMIUM_PATH`/Sentry into config → `prepareDatabase()` + `runMigrations()` (`boot/database.ts`) → `printBanner()` (`boot/banner.ts`) → dynamic-import DB-touching modules → `imageRenderer.start()` (if Chromium available) → `chatBridge.init()` → `Bun.serve({ fetch: app.fetch, websocket })`. It detects single-binary mode via `process.execPath` basename (`isCompiledBinary`) and only then loads the inline static handler.

### Graceful shutdown / cleanup registry

`apps/server/src/utils/cleanup-registry.ts` collects named cleanup functions via `registerCleanup(name, fn)`; they all run on shutdown (`runCleanups`). Use this for any resource that needs teardown rather than wiring a new signal handler — `index.ts` drives it from the signal handlers.

### Database (Drizzle + SQLite)

- Schema lives in `apps/server/src/db/schema/` (one file per table: server, bot, player, player-server, social-accounts, target, user; relations in `relation.ts`). DB client is `apps/server/src/db/client.ts` (`db`), reusable queries in `apps/server/src/db/queries/`.
- Migrations are generated into `migrations/` by `drizzle-kit` (config: `drizzle.config.ts`, `schema: "./apps/server/src/db/schema"`, db at `./data/sqlite.db`).
- **Production migration is self-contained**: `apps/server/scripts/gen-embedded-migrations.ts` (a build-time script, run by `build:bundle` / `postinstall`) inlines every migration's SQL into `apps/server/dist/migrations.ts`. At runtime `boot/database.ts` applies pending migrations from that embedded module (it does **not** read `migrations/` at runtime) and migrates a legacy root `sqlite.db` into `data/`. So after changing schema you must `db:generate`, and the build re-embeds them.

### Static asset embedding (single binary)

`apps/web/vite.config.ts` 的 `embedServerAssets` Vite 插件在 `closeBundle` 钩子中遍历 `apps/web/dist`，把每个产物内联为字符串（文本直存、二进制 base64）写入 `apps/server/dist/assets.ts`。`build:web` 结束后即可直接进入 `bun build --compile`，无需额外脚本。运行时 `boot/static.ts` 提供这些资源并对未知路径回退 `index.html`（SPA 路由）；开发态由 Vite dev server 提供前端，不走这里。

### Config

App config (browser/chromium path, koishi host+port, server host+port, sentry) is a Zod-validated JSON file managed by `configManager` (`apps/server/src/utils/config.ts`), persisted to `config/appsettings.json`. Defaults come from the Zod schema; env vars (`CHROMIUM_PATH`, `SENTRY_ENABLED`) can override at startup.

Sentry is integrated on both sides: `@sentry/bun` in `index.ts` (backend), `@sentry/react` + `@sentry/vite-plugin` (frontend). Required env vars: `SENTRY_DSN` (backend) / `VITE_SENTRY_DSN` (frontend); sourcemap upload also needs `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

### Image rendering

`apps/server/src/service/` (image renderer + browser downloader) plus `apps/server/src/utils/mc-image-render.ts` use **puppeteer-core** with a headless Chromium (path from config / `CHROMIUM_PATH`; the Docker image installs `chromium-headless-shell`) to render Minecraft-styled text/images for chat output.

### Auth

Server-side auth is hand-rolled on Hono (it replaced `nuxt-auth-utils`):

- `apps/server/src/http/auth-middleware.ts` gates everything under `/api/*` except a public-endpoint allowlist (login/logout/status/password POST), and only enforces a session **once a user with a password exists** (first-run is open so the admin can set a password).
- Passwords: **`@adonisjs/hash` Scrypt** (`http/password.ts`) — same PHC `$scrypt$…` format the old `nuxt-auth-utils` used, so existing hashes need no migration. **Do not** use `Bun.password` (argon2id, incompatible).
- Session: signed cookie via `hono/cookie` (`http/session.ts`), key from the config session password.
- 2FA: TOTP via `otplib`; password strength via `@zxcvbn-ts` (in `packages/shared`).
- HTTP responses use the helpers in `http/respond.ts`.

### Frontend (`apps/web`)

React 19 SPA, dark-theme-first, shadcn/ui (new-york style) over Tailwind v4.

- **Routing**: TanStack Router, **code-based** (no codegen) in `src/router.tsx`. A pathless layout route `id: "dashboard"` holds the auth guard (`beforeLoad` throws `redirect({ to: "/login" })`) and the dirty-page blocker. Note `useParams({ from })` takes the route **ID** (with the `/dashboard` prefix, e.g. `"/dashboard/servers/$id/binding"`); `to`/`Link`/`navigate` use plain paths without it.
- **State**: Zustand stores in `src/stores/` (`auth`, `page-state`).
- **Data layer**: TanStack Query + per-domain API wrappers in `src/lib/api.ts` over the `request()` fetch helper in `src/lib/http.ts`; responses validated with the `#shared` Zod schemas. Query hooks live in `src/queries/`.
- **Forms**: React Hook Form + `@hookform/resolvers/zod`, reusing `#shared` schemas.
- **Dirty-page guard**: TanStack Router `useBlocker` in `DashboardLayout`, backed by the `page-state` store + the `useRegisterPageState` hook.
- **SSE**: native `EventSource` (`src/hooks/use-download-stream.ts`) for browser-download progress.
- shadcn primitives live in `src/components/ui/`; reuse them rather than pulling in new component libs.

## Path aliases

- **Everywhere**: `#shared` / `#shared/*` → `packages/shared/`.
- **`apps/server`**: `#server/*` → `apps/server/src/*`; `~~/*` → repo root.
- **`apps/web`**: `@` / `@/*` → `apps/web/src/`.

Prefer these aliases over deep relative paths, matching existing imports.

## Conventions worth matching

- Code comments and user-facing log/error strings are predominantly in **Chinese**; follow the surrounding language when editing a file.
- Server logging uses a shared `pino` `logger` (`apps/server/src/utils/logger.ts`), often `logger.child({}, { msgPrefix: "[Name] " })` per service. Don't use `console.*` in server code.
- Core services are singletons exposed via `getInstance()` / a pre-instantiated export — extend the existing instance rather than constructing new ones.
- Reuse the `packages/shared` Zod schemas on both client and server rather than redefining types.

## Coding guidelines

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Architecture notes (post-migration)

- `POST /api/auth/password`: the original had an inverted condition that rejected first-time password setup; the new `routes/auth.ts` requires a session only when changing an existing password (first set is open).
- MC WS auth failure returns an HTTP 401/400/409 at handshake (was a post-upgrade `close(1008)`).
