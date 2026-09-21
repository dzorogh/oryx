import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const srcRoot = path.resolve(import.meta.dirname, "../src");

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const rest = specifier.slice(2);
    const candidates = [
      path.join(srcRoot, rest),
      path.join(srcRoot, `${rest}.ts`),
      path.join(srcRoot, `${rest}.tsx`),
      path.join(srcRoot, rest, "index.ts"),
    ];
    for (const file of candidates) {
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        return { url: pathToFileURL(file).href, shortCircuit: true };
      }
    }
  }
  return nextResolve(specifier, context);
}
