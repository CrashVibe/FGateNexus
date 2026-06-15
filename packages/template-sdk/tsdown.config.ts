import { defineConfig } from "tsdown";

export default defineConfig({
  deps: { neverBundle: ["vite", "zod"] },
  dts: { eager: true, resolver: "tsc" },
  entry: ["src/index.ts", "src/vite-plugin.ts"],
  fixedExtension: false,
  format: "esm",
  platform: "node",
});
