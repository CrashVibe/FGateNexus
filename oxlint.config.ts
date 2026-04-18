import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import vue from "ultracite/oxlint/vue";

export default defineConfig({
  extends: [core, vue],
  options: { typeAware: true },
  rules: {
    "class-methods-use-this": [
      "error",
      {
        ignoreClassesWithImplements: "public-fields",
        ignoreOverrideMethods: true,
      },
    ],
    "eslint/max-statements": "off",
    "eslint/no-inline-comments": "allow",
    "eslint/no-void": [
      "error",
      {
        allowAsStatement: true,
      },
    ],
    "eslint/require-await": "off",
    "import/no-cycle": "off",
    "jsdoc/require-param-type": "off",
    "jsdoc/require-returns-type": "off",
    "typescript/no-non-null-assertion": "allow",
    "typescript/no-unnecessary-type-conversion": "allow",
    "typescript/no-unnecessary-type-parameters": "allow",
    "typescript/no-unsafe-argument": "allow",
    "typescript/no-unsafe-assignment": "allow",
    "typescript/no-unsafe-call": "allow",
    "typescript/no-unsafe-enum-comparison": "allow",
    "typescript/no-unsafe-member-access": "allow",
    "typescript/prefer-readonly-parameter-types": "allow",
    "typescript/strict-boolean-expressions": "allow",
    "typescript/strict-void-return": "allow",
    "vue/max-props": ["error", { maxProps: 5 }],
  },
});
