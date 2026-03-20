#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const packageJsonPath = resolve(process.cwd(), "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const allDeps = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {}),
};

const isStableRange = (range) => !/[a-zA-Z]/.test(range);
const compareVersions = (left, right) => {
  const leftParts = left.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const max = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < max; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;
    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
};

const failures = [];

for (const [name, range] of Object.entries(allDeps)) {
  if (!isStableRange(String(range))) {
    failures.push(`${name}: non-stable range "${range}"`);
    continue;
  }

  try {
    const outdatedJson = execSync(`npm outdated ${name} --json || true`, { encoding: "utf8" }).trim();
    const outdated = outdatedJson ? JSON.parse(outdatedJson) : {};
    const entry = outdated[name];
    const wanted = entry?.wanted;
    const deprecated = execSync(`npm view ${name} deprecated --json`, { encoding: "utf8" }).trim();
    const normalized = String(range).replace(/^[~^]/, "");

    // Enforce latest stable within compatible major (npm "wanted").
    if (wanted && compareVersions(normalized, wanted) < 0) {
      failures.push(`${name}: installed ${normalized}, wanted ${wanted}`);
    }

    if (deprecated && deprecated !== "null" && deprecated !== "\"\"") {
      failures.push(`${name}: deprecated (${deprecated})`);
    }
  } catch (error) {
    failures.push(`${name}: failed to validate via npm registry`);
  }
}

if (failures.length > 0) {
  console.error("Dependency compliance check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Dependency compliance check passed.");
