// @ts-nocheck
import { execSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const started = performance.now();
execSync("npx vitest run tests/unit/home-page.test.tsx --passWithNoTests", {
  stdio: "inherit",
});
const elapsedMs = performance.now() - started;

console.log(`\n[bench:packing] total elapsed: ${elapsedMs.toFixed(2)}ms`);
