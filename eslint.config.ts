import oxlint from "eslint-plugin-oxlint";

import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt(
  {
    rules: {
      "vue/html-self-closing": 0
    }
  },
  ...oxlint.configs["flat/recommended"]
);
