import nextVitals from "eslint-config-next/core-web-vitals";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextVitals,
  {
    files: ["src/domain/packing/**/*.ts"],
    rules: {
      complexity: ["warn", 25],
      "max-depth": ["warn", 5],
      "max-lines-per-function": ["warn", { max: 220, skipBlankLines: true, skipComments: true }],
    },
  },
];

export default config;
