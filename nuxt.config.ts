import tailwindcss_postcss from "@tailwindcss/postcss";
import tailwindcss from "@tailwindcss/vite";
import autoprefixer from "autoprefixer";
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
    [
      "@pinia/nuxt",
      {
        AutoImport: ["defineStore", ["defineStore", "definePiniaStore"]],
      },
    ],
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
    externals: {
      inline: [
        "vue",
        "@vue/shared",
        "@vue/runtime-dom",
        "@vue/compiler-dom",
        "@vue/runtime-core",
        "@vue/reactivity",
      ],
    },
    minify: true,
    node: true,
    preset: "bun",
    serveStatic: "inline",
  },
  runtimeConfig: {
    public: {
      commitHash: process.env.NUXT_PUBLIC_COMMIT_HASH ?? undefined,
      isDev: isDev,
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
        paths: {
          "#shared": ["./shared"],
          "#shared/*": ["./shared/*"],
          "@": ["./app"],
          "@/*": ["./app/*"],
          "~": ["./app"],
          "~/*": ["./app/*"],
          "~~": ["."],
          "~~/*": ["./*"],
        },
        // 支持解析 json 文件
        resolveJsonModule: true,
        strictNullChecks: true,
        types: ["bun-types", "node"],
      },
      include: ["../drizzle.config.ts", "../entry.ts", "../eslint.config.ts"],
    },
    typeCheck: "build",
  },
  vite: {
    build: {
      cssCodeSplit: true,
      minify: isBuild,
      rollupOptions: {
        output: {
          manualChunks: {
            highlight: ["highlight.js"],
            ui: ["naive-ui"],
            vendor: ["moment-timezone", "uuid", "zod"],
          },
        },
      },
      sourcemap: isDev,
      target: "esnext",
    },
    css: {
      postcss: {
        plugins: [tailwindcss_postcss(), autoprefixer()],
      },
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
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    plugins: [
      Components({
        dts: true,
        resolvers: [NaiveUiResolver()],
      }),
      tailwindcss(),
      // oxlint-disable-next-line typescript/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any[],
    worker: {
      format: "es",
    },
  },
});
