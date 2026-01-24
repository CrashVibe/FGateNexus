import withNuxt from "./.nuxt/eslint.config.mjs";
import oxlint from "eslint-plugin-oxlint";

export default withNuxt(
    {
        rules: {
            "vue/html-self-closing": 0
        }
    },
    ...oxlint.configs["flat/recommended"]
);
