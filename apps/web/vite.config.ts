import { fileURLToPath, URL } from "node:url";

import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import rootPkg from "../../package.json" with { type: "json" };

const sentryRelease = `${rootPkg.name}@${rootPkg.version}`;

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            {
              name: "react",
              priority: 3,
              test: /node_modules[\\/](?<pkg>react|react-dom|scheduler)[\\/]/u,
            },
            {
              name: "tanstack",
              priority: 2,
              test: /node_modules[\\/]@tanstack[\\/]/u,
            },
            {
              name: "radix",
              priority: 2,
              test: /node_modules[\\/]@radix-ui[\\/]/u,
            },
          ],
        },
      },
    },
    sourcemap: "hidden",
  },
  define: {
    __SENTRY_RELEASE__: JSON.stringify(sentryRelease),
  },
  plugins: [
    react(),
    tailwindcss(),
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      disable: !process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      release: { name: sentryRelease },
      sourcemaps: { filesToDeleteAfterUpload: ["dist/**/*.map"] },
    }),
  ],
  resolve: {
    alias: {
      "#shared": fileURLToPath(
        new URL("../../packages/shared", import.meta.url),
      ),
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": { changeOrigin: true, target: "http://127.0.0.1:3001", ws: true },
    },
  },
});
