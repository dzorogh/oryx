#!/usr/bin/env node
// @ts-nocheck
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const docsFile = resolve(process.cwd(), "src/lib/docs-links.ts");
const content = readFileSync(docsFile, "utf8");

const requiredIds = ["nextjs", "react", "three", "r3f", "drei", "zod", "vitest", "playwright"];

const missingIds = requiredIds.filter((id) => !content.includes(`id: "${id}"`));
const links = [...content.matchAll(/url:\s*"([^"]+)"/g)].map((match) => match[1]);
const invalidLinks = links.filter((url) => !url.startsWith("https://"));

if (missingIds.length > 0 || invalidLinks.length > 0) {
  console.error("Official docs links check failed:");
  if (missingIds.length > 0) {
    console.error(`- Missing ids: ${missingIds.join(", ")}`);
  }
  if (invalidLinks.length > 0) {
    console.error(`- Invalid urls: ${invalidLinks.join(", ")}`);
  }
  process.exit(1);
}

console.log("Official docs links check passed.");
