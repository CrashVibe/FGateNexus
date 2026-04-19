import tailwindcss from "@tailwindcss/vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";

const isDev = process.env.NODE_ENV !== "production";
const isBuild = !isDev;

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
      meta: [{ content: "noindex, nofollow, noarchive", name: "robots" }],
      title: "FlowGate Nexus",
    },
    pageTransition: {
      mode: "out-in",
      name: "page",
    },
    rootId: "root",
    teleportId: "popovers",
  },
  compatibilityDate: "2025-08-06",
  css: ["~/assets/css/main.css", "~/assets/css/animate.scss"],
  devServer: {
    host: "0.0.0.0",
    port: 3000,
  },
  devtools: {
    enabled: true,
    timeline: {
      enabled: true,
    },
  },
  experimental: {
    asyncContext: true,
  },
  imports: {
    presets: [
      {
        from: "naive-ui",
        imports: [
          "useMessage",
          "useDialog",
          "useNotification",
          "useLoadingBar",
        ],
      },
    ],
  },
  modules: [
    "@pinia/nuxt",
    "nuxtjs-naive-ui",
    "@nuxt/eslint",
    "nuxt-auth-utils",
    "@nuxt/ui",
    "@nuxt/icon",
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
    node: true,
    preset: "bun",
    serveStatic: "inline",
  },
  runtimeConfig: {
    public: {
      commitHash: process.env.NUXT_PUBLIC_COMMIT_HASH,
      isDev,
    },
  },
  sourcemap: {
    client: isDev,
    server: isDev,
  },
  ssr: false,
  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        allowImportingTsExtensions: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        strictNullChecks: true,
        types: ["bun-types", "node"],
      },
      include: [
        "../drizzle.config.ts",
        "../entry.ts",
        "../eslint.config.ts",
        "../oxlint.config.ts",
        "../oxfmt.config.ts",
      ],
    },
  },
  vite: {
    build: {
      cssCodeSplit: true,
      minify: isBuild ? "esbuild" : false,
      rollupOptions: {
        output: {
          manualChunks: {
            highlight: ["highlight.js"],
            "moment-tz": ["moment-timezone"],
            ui: ["naive-ui"],
            utils: ["uuid", "zod"],
          },
        },
      },
      sourcemap: isDev,
      target: "esnext",
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "esnext",
      },
      include: [
        "moment-timezone",
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "@vicons/ionicons5",
        "naive-ui",
        "@tanstack/vue-table",
        "vooks",
        "highlight.js/lib/core",
        "highlight.js/lib/languages/typescript",
        "uuid",
        "zod",
        "http-status-codes",
        "@zxcvbn-ts/core",
        "@zxcvbn-ts/language-common",
        "lodash-es",
      ],
    },
    plugins: [
      Components({
        dts: true,
        resolvers: [NaiveUiResolver()],
      }),
      tailwindcss(),
    ],
    worker: {
      format: "es",
    },
  },
});
