import AutoImport from "unplugin-auto-import/vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";

export default defineNuxtConfig({
    compatibilityDate: "latest",
    devtools: { enabled: true },
    sourcemap: {
        server: true,
        client: true
    },
    ssr: false,
    css: ["~/assets/css/main.scss"],
    typescript: {
        // typeCheck: true,
        strict: true,
        tsConfig: {
            compilerOptions: {
                types: ["bun-types"],
                // 支持解析json文件
                resolveJsonModule: true
            }
        }
    },
    runtimeConfig: {
        public: {
            commitHash: process.env.NUXT_PUBLIC_COMMIT_HASH || undefined
        }
    },
    experimental: {
        asyncEntry: true,
        asyncContext: true
    },
    devServer: {
        host: "0.0.0.0",
        port: 3000
    },
    modules: ["nuxtjs-naive-ui", "@nuxt/eslint", "@nuxtjs/tailwindcss", "nuxt-auth-utils"],
    vite: {
        build: {
            target: "esnext",
            minify: "terser",
            terserOptions: {
                compress: {
                    drop_console: true,
                    drop_debugger: true
                },
                format: {
                    comments: false
                }
            },
            cssCodeSplit: true,
            sourcemap: true
        },
        esbuild: {
            target: "esnext"
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
        ]
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
        }
    },
    nitro: {
        experimental: {
            websocket: true
        },
        preset: "bun",
        serveStatic: "inline",
        minify: true,
        compressPublicAssets: true,
        inlineDynamicImports: true,
        node: true,
        externals: {
            inline: [
                "vue",
                "@vue/shared",
                "@vue/runtime-dom",
                "@vue/compiler-dom",
                "@vue/runtime-core",
                "@vue/reactivity",
                "@vue/compiler-core",
                "@vue/compiler-sfc",
                "source-map-js"
            ]
        }
    }
});
