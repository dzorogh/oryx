import nextVitals from "eslint-config-next/core-web-vitals";

// Store layering (docs/conventions/code/store-module-layers.md).
const STORE_BASE_FILES = [
  "src/features/store/domain/**",
  "src/features/store/region-context.tsx",
  "src/features/store/region-selection.ts",
  "src/features/store/region-switcher.tsx",
  "src/features/store/product-photo.tsx",
  "src/features/store/store-load-notice.tsx",
  "src/features/store/packing/**",
];

const STORE_BASE_IMPORT =
  "^@/features/store/(?!(domain|packing)/|(region-context|region-selection|region-switcher|product-photo|store-load-notice)$)";

const NO_PIM_UI = {
  group: ["@/components/store/*"],
  message: "features/store must not depend on PIM UI in components/store — move the shared piece into features/store.",
};

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextVitals,
  {
    files: ["src/features/store/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [NO_PIM_UI] }],
    },
  },
  {
    files: STORE_BASE_FILES,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            NO_PIM_UI,
            {
              group: ["@/features/logistics/*"],
              message: "Store base modules are shared with logistics and must not import it back.",
            },
            {
              regex: STORE_BASE_IMPORT,
              message: "Store base modules import only the base layer, so logistics cannot reach the rest of store through them.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/store/domain/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            NO_PIM_UI,
            {
              regex: "^@/features/(logistics/|store/(?!domain/))",
              message: "store/domain holds pure types and guards; it imports only other domain modules.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/logistics/**/*.{ts,tsx}", "app/store/logistics/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/store/*"],
              message: "Logistics must not depend on PIM UI in components/store.",
            },
            {
              regex: STORE_BASE_IMPORT,
              message: "Logistics may import only the store base layer (domain, region, product photo, packing).",
            },
          ],
        },
      ],
    },
  },
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
