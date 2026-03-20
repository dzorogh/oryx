import { execSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const started = performance.now();
execSync("npx vitest run tests/integration/performance.bench.test.ts --passWithNoTests", {
  stdio: "inherit",
});
const elapsedMs = performance.now() - started;

console.log(`\n[bench:packing] total elapsed: ${elapsedMs.toFixed(2)}ms`);
