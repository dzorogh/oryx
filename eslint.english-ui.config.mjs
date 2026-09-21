import nextVitals from "eslint-config-next/core-web-vitals";
import oryxUiPlugin from "./eslint-rules/oryx-ui-plugin.mjs";

/** ESLint config for English-only UI copy (Cyrillic check). */
/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextVitals,
  {
    files: ["app/**/*.{tsx,jsx}", "src/**/*.{tsx,jsx}", "src/**/*-demo-data.ts", "src/**/demo-data.ts"],
    plugins: {
      "oryx-ui": oryxUiPlugin,
    },
    rules: {
      "oryx-ui/no-cyrillic-ui": "error",
    },
  },
];

export default config;
