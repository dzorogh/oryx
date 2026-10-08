import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const srcRoot = path.resolve(import.meta.dirname, "../src");

const resolveFile = (base) => {
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")];
  for (const file of candidates) {
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      return { url: pathToFileURL(file).href, shortCircuit: true };
    }
  }
  return null;
};

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = resolveFile(path.join(srcRoot, specifier.slice(2)));
    if (resolved) return resolved;
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const parent = fileURLToPath(context.parentURL);
    if (parent.startsWith(srcRoot) && !path.extname(specifier)) {
      const resolved = resolveFile(path.resolve(path.dirname(parent), specifier));
      if (resolved) return resolved;
    }
  }
  return nextResolve(specifier, context);
}
