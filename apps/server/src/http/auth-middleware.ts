import type { Context, Next } from "hono";

import { db } from "#server/db/client";

import { requireUserSession } from "./session";

/**
 * 鉴权中间件。
 *
 * 套在 `/api/*` 上：公开端点白名单放行；仅当「已存在带密码的用户」时才强制
 * 会话（首次安装尚未设密码时全开放，以便设置密码）。MC 桥的 `/api` WebSocket
 * 在 Bun.serve 的 fetch 层就被分流，不会进到这里。
 */
const publicEndpoints = [
  { method: "POST", path: "/api/auth/login" },
  { method: "POST", path: "/api/auth/logout" },
  { method: "GET", path: "/api/auth/status" },
  { method: "POST", path: "/api/auth/password" },
  { method: "GET", path: "/api/health" },
] as const;

export const authMiddleware = async (c: Context, next: Next): Promise<void> => {
  const { method, path } = c.req;

  const isPublic = publicEndpoints.some(
    (endpoint) => path.startsWith(endpoint.path) && method === endpoint.method,
  );
  if (isPublic) {
    await next();
    return;
  }

  const user = await db.query.userTable.findFirst();
  if (!user || user.passwordHash === null || user.passwordHash === "") {
    await next();
    return;
  }

  await requireUserSession(c);
  await next();
};
