#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { scanEnglishUi, shouldScanFile } from "./lib/english-ui-scan.mjs";

const rootDir = process.cwd();
const args = new Set(process.argv.slice(2));
const updateBaseline = args.has("--update-baseline");
const baselinePath = resolve(rootDir, "scripts/english-ui-baseline.json");

/**
 * @param {string} dir
 * @param {string[]} files
 */
const walk = (dir, files) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "coverage") {
        continue;
      }
      walk(fullPath, files);
      continue;
    }
    if (entry.isFile()) {
      files.push(fullPath);
    }
  }
};

/** @type {string[]} */
const allFiles = [];
walk(resolve(rootDir, "app"), allFiles);
walk(resolve(rootDir, "src"), allFiles);

/** @type {{ file: string, line: number, column: number, kind: string, text: string }[]} */
const violations = [];

for (const filePath of allFiles) {
  const relativePath = relative(rootDir, filePath).replaceAll("\\", "/");
  if (!shouldScanFile(relativePath)) {
    continue;
  }

  const content = readFileSync(filePath, "utf8");
  const fileViolations = scanEnglishUi(content, relativePath);

  for (const violation of fileViolations) {
    violations.push({
      file: relativePath,
      line: violation.line,
      column: violation.column,
      kind: violation.kind,
      text: violation.text,
    });
  }
}

/** @type {Set<string>} */
let baselineSet = new Set();

try {
  const baselineRaw = readFileSync(baselinePath, "utf8");
  const baselineJson = JSON.parse(baselineRaw);
  if (Array.isArray(baselineJson.entries)) {
    baselineSet = new Set(
      baselineJson.entries.map(
        (entry) => `${entry.file}:${entry.line}:${entry.column}:${entry.kind}:${entry.text}`,
      ),
    );
  }
} catch {
  // No baseline yet.
}

const formatEntry = (entry) =>
  `${entry.file}:${entry.line}:${entry.column}:${entry.kind}:${entry.text}`;

const unmatchedViolations = violations.filter((entry) => !baselineSet.has(formatEntry(entry)));

if (updateBaseline) {
  const payload = {
    description:
      "Known Cyrillic UI copy allowed until migrated to English. Regenerate with: npm run check:ui-english -- --update-baseline",
    entries: violations,
  };
  writeFileSync(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`English UI baseline updated (${violations.length} entries).`);
  process.exit(0);
}

if (unmatchedViolations.length > 0) {
  console.error("English UI copy check failed. User-facing text must be in English.");
  console.error("Use // english-ui:ignore on a line or // english-ui:ignore-file at the top to exempt.");
  console.error("");

  for (const entry of unmatchedViolations) {
    console.error(
      `- ${entry.file}:${entry.line}:${entry.column} [${entry.kind}] "${entry.text}"`,
    );
  }

  console.error("");
  console.error(
    `Found ${unmatchedViolations.length} violation(s)` +
      (baselineSet.size > 0 ? ` (${baselineSet.size} baselined).` : "."),
  );
  console.error("Run: npm run check:ui-english -- --update-baseline  (only when intentionally allowing existing copy)");
  process.exit(1);
}

console.log(
  `English UI copy check passed (${violations.length} baselined, 0 new violations).`,
);
