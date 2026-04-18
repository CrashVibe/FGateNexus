import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  arrowParens: "always",
  bracketSameLine: false,
  bracketSpacing: true,
  endOfLine: "lf",
  extends: [ultracite],
  ignorePatterns: ["migrations/*", "bun.lock"],
  jsxSingleQuote: false,
  printWidth: 80,
  quoteProps: "as-needed",
  rangeStart: 0,
  semi: true,
  singleQuote: false,
  sortImports: {
    ignoreCase: true,
    newlinesBetween: true,
    order: "asc",
  },
  sortPackageJson: true,
  sortTailwindcss: {
    functions: ["clsx", "cn"],
    preserveWhitespace: true,
  },
  tabWidth: 2,
  trailingComma: "all",
  useTabs: false,
});
