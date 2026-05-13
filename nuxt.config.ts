import tailwindcss from "@tailwindcss/vite";

const isDev = process.env.NODE_ENV !== "production";
const enableSentry = process.env.SENTRY_RELEASE === "true";
const sentryRelease = enableSentry
  ? `${process.env.npm_package_name}@${process.env.npm_package_version}`
  : undefined;

export default defineNuxtConfig({
  app: {
    head: {
      link: [
        {
          href: "/favicon.ico",
          rel: "icon",
          type: "image/x-icon",
        },
      ],
      meta: [
        { content: "width=device-width, initial-scale=1", name: "viewport" },
        { content: "noindex, nofollow, noarchive", name: "robots" },
      ],
      title: "FlowGate Nexus",
    },
    pageTransition: {
      mode: "out-in",
      name: "page",
    },
    rootId: "root",
    teleportId: "popovers",
  },
  compatibilityDate: "2026-05-07",
  css: ["~/assets/css/main.css", "~/assets/css/animate.scss"],
  devServer: {
    host: "0.0.0.0",
    port: 3000,
  },
  devtools: {
    enabled: true,
  },
  experimental: {
    asyncContext: true,
  },
  modules: [
    "@pinia/nuxt",
    "nuxt-auth-utils",
    "@nuxt/ui",
    "@nuxt/icon",
    "nuxt-qrcode",
    "@sentry/nuxt/module",
  ],
  nitro: {
    compressPublicAssets: true,
    esbuild: {
      options: {
        target: "esnext",
      },
    },
    experimental: {
      websocket: true,
    },
    minify: true,
    preset: "node-server",
    serveStatic: "inline",
  },
  runtimeConfig: {
    public: {
      isDev,
      release: process.env.npm_package_version,
      sentry: {
        dsn: process.env.SENTRY_DSN,
        enabled: !isDev && enableSentry,
        release: sentryRelease,
      },
    },
  },
  sentry: {
    org: "crashvibe",
    project: "flowgate",
    release: {
      name: sentryRelease,
    },
    sourcemaps: {
      disable: isDev || !enableSentry,
      filesToDeleteAfterUpload: [".*/**/*.map"],
    },
  },
  sourcemap: {
    client: "hidden",
    server: true,
  },
  ssr: false,
  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        allowImportingTsExtensions: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        strictNullChecks: true,
        types: ["bun-types", "node"],
      },
      include: [
        "../drizzle.config.ts",
        "../entry.ts",
        "../eslint.config.ts",
        "../oxlint.config.ts",
        "../oxfmt.config.ts",
        "../sentry.server.config.ts",
        "../sentry.client.config.ts",
      ],
    },
  },
  vite: {
    optimizeDeps: {
      include: [
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "@tanstack/vue-table",
        "vooks",
        "uuid",
        "zod",
        "http-status-codes",
        "@zxcvbn-ts/core",
        "@zxcvbn-ts/language-common",
        "lodash-es",
        "nanoid",
        "dayjs",
        "vue-qrcode-reader",
      ],
    },
    plugins: [tailwindcss()],
  },
});
