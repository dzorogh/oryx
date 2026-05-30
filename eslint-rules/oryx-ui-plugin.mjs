import noCyrillicUi from "./no-cyrillic-ui.mjs";

/** @type {import('eslint').ESLint.Plugin} */
const oryxUiPlugin = {
  meta: {
    name: "oryx-ui",
    version: "1.0.0",
  },
  rules: {
    "no-cyrillic-ui": noCyrillicUi,
  },
};

export default oryxUiPlugin;
