/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
// @ts-nocheck

const config = {
  testRunner: "vitest",
  vitest: {
    configFile: "vitest.config.ts",
  },
  mutate: ["src/domain/packing/packing-engine.ts"],
  reporters: ["clear-text", "progress", "html"],
  coverageAnalysis: "perTest",
  tempDirName: ".stryker-tmp",
  thresholds: {
    high: 80,
    low: 60,
    break: 50,
  },
};

export default config;
