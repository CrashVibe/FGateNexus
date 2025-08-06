import AutoImport from "unplugin-auto-import/vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";

export default defineNuxtConfig({
    compatibilityDate: "latest",
    devtools: { enabled: true },
    ssr: false,

    css: ["~/assets/css/main.less"],
    typescript: {
        strict: true,
        // typeCheck: true,
        tsConfig: {
            compilerOptions: {
                // Enable latest features
                lib: ["ESNext", "DOM"],
                target: "ESNext",
                module: "ESNext",
                moduleDetection: "force",
                jsx: "react-jsx",
                allowJs: true,
                types: ["bun-types"],

                // Bundler mode
                moduleResolution: "bundler",
                allowImportingTsExtensions: true,
                verbatimModuleSyntax: true,
                noEmit: true,

                // Best practices
                strict: true,
                skipLibCheck: true,
                noFallthroughCasesInSwitch: true,

                // Some stricter flags
                noUnusedLocals: true,
                noUnusedParameters: true,
                noPropertyAccessFromIndexSignature: true
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
        writeEarlyHints: true
    },
    devServer: {
        host: "0.0.0.0",
        port: 3001
    },
    modules: ["nuxtjs-naive-ui", "@nuxt/eslint", "@nuxtjs/tailwindcss"],
    vite: {
        cacheDir: "node_modules/.vite_cache",
        optimizeDeps: {
            include: ["naive-ui", "vue", "vue-router"],
            exclude: ["@prisma/client"],
            esbuildOptions: {
                target: "esnext",
                keepNames: true
            }
        },
        build: {
            rollupOptions: {
                external: ["@prisma/client", ".prisma/client"]
            },
            target: "esnext",
            minify: "terser",
            terserOptions: {
                compress: {
                    drop_console: true,
                    drop_debugger: true,
                    pure_funcs: ["console.log"]
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
        },
        esbuild: {
            options: {
                target: "esnext"
            }
        }
    }
});
