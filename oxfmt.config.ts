import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: ["migrations/*", "bun.lock", ".codewhale/", ".zed/"],
  trailingComma: "all",
});
