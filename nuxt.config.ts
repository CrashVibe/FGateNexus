import AutoImport from "unplugin-auto-import/vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";

const isDev = process.env.NODE_ENV !== "production";

export default defineNuxtConfig({
    compatibilityDate: "2025-08-06",
    devtools: {
        enabled: true,
        timeline: {
            enabled: true
        }
    },
    sourcemap: {
        client: isDev,
        server: isDev
    },
    ssr: false,
    css: ["~/assets/css/main.scss", "~/assets/css/animate.scss"],
    typescript: {
        strict: true,
        tsConfig: {
            compilerOptions: {
                types: ["bun-types", "node"],
                // 支持解析 json 文件
                resolveJsonModule: true
            }
        }
    },
    runtimeConfig: {
        public: {
            commitHash: process.env.NUXT_PUBLIC_COMMIT_HASH || undefined,
            isDev: isDev
        }
    },
    experimental: {
        asyncContext: true
    },
    devServer: {
        host: "0.0.0.0",
        port: 3000
    },
    modules: [
        [
            "@pinia/nuxt",
            {
                AutoImport: ["defineStore", ["defineStore", "definePiniaStore"]]
            }
        ],
        "nuxtjs-naive-ui",
        "@nuxt/eslint",
        "@nuxtjs/tailwindcss",
        "nuxt-auth-utils"
    ],
    vite: {
        optimizeDeps: {
            include: [
                "moment-timezone",
                "@vue/devtools-core",
                "@vue/devtools-kit",
                "@vueuse/core",
                "@vicons/ionicons5",
                "vooks",
                "highlight.js/lib/core",
                "highlight.js/lib/languages/typescript",
                "uuid",
                "zod",
                "http-status-codes",
                "@zxcvbn-ts/core",
                "@zxcvbn-ts/language-common"
            ],
            esbuildOptions: {
                target: "esnext"
            }
        },
        build: {
            target: "esnext",
            minify: "esbuild",
            cssCodeSplit: true,
            rollupOptions: {
                output: {
                    manualChunks: {
                        ui: ["naive-ui"],
                        highlight: ["highlight.js"],
                        vendor: ["moment-timezone", "uuid", "zod"]
                    }
                }
            }
        },
        plugins: [
            AutoImport({
                imports: [
                    {
                        "naive-ui": ["useDialog", "useMessage", "useNotification", "useLoadingBar"]
                    }
                ]
            }),
            Components({
                resolvers: [NaiveUiResolver()]
            })
        ],
        worker: {
            format: "es"
        }
    },
    app: {
        head: {
            link: [
                {
                    rel: "icon",
                    type: "image/x-icon",
                    href: "/favicon.ico"
                }
            ]
        },
        pageTransition: {
            name: "page",
            mode: "out-in"
        },
        layoutTransition: {
            name: "layout",
            mode: "out-in"
        },
        rootId: "root",
        teleportId: "popovers"
    },
    nitro: {
        esbuild: {
            options: {
                target: "esnext"
            }
        },
        experimental: {
            websocket: true
        },
        preset: "bun",
        serveStatic: "inline",
        minify: true,
        compressPublicAssets: true,
        node: true,
        externals: {
            inline: [
                "vue",
                "@vue/shared",
                "@vue/runtime-dom",
                "@vue/compiler-dom",
                "@vue/runtime-core",
                "@vue/reactivity"
            ]
        }
    }
});