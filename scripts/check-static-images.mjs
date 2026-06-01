#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import {
  scanPublicImageFiles,
  scanSourceStaticImagePaths,
  shouldScanSourceFile,
} from "./lib/static-image-scan.mjs";

const rootDir = process.cwd();

/**
 * @param {string} dir
 * @param {string[]} files
 */
const walk = (dir, files) => {
  if (!existsSync(dir)) {
    return;
  }
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
  if (!shouldScanSourceFile(relativePath)) {
    continue;
  }

  const content = readFileSync(filePath, "utf8");
  for (const violation of scanSourceStaticImagePaths(content, relativePath)) {
    violations.push({
      file: relativePath,
      line: violation.line,
      column: violation.column,
      kind: violation.kind,
      text: violation.text,
    });
  }
}

/** @type {string[]} */
const publicFiles = [];
walk(resolve(rootDir, "public"), publicFiles);
for (const filePath of publicFiles) {
  const relativePath = relative(rootDir, filePath).replaceAll("\\", "/");
  for (const violation of scanPublicImageFiles([relativePath])) {
    violations.push({
      file: relativePath,
      line: violation.line,
      column: violation.column,
      kind: violation.kind,
      text: violation.text,
    });
  }
}

if (violations.length === 0) {
  console.log("check:static-images — OK");
  process.exit(0);
}

console.error("check:static-images — failed\n");
console.error("Use static imports from src/assets/ (see docs/conventions/assets/static-images.md).\n");

for (const entry of violations) {
  console.error(`${entry.file}:${entry.line}:${entry.column} [${entry.kind}] ${entry.text}`);
}

process.exit(1);
