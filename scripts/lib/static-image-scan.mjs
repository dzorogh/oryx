/**
 * Detects string paths to bundled images in app code and disallowed files under public/.
 */

/** @typedef {{ line: number, column: number, text: string, kind: string }} StaticImageViolation */

const IGNORE_LINE_RE = /static-images:\s*ignore\b/;
const IGNORE_FILE_RE = /static-images:\s*ignore-file\b/;

const SOURCE_FILE_RE = /^(app|src)\/.*\.(tsx?|jsx?)$/;
const ASSETS_INDEX_RE = /^src\/assets\/.*\/index\.(tsx?|mts?)$/;

/** Root-absolute or public-folder string paths to raster/vector images. */
const ROOT_IMAGE_PATH_RE = /(["'`])\/([^"'`]+?\.(?:png|jpe?g|svg|webp|gif|ico))\1/gi;

/** Legacy imports from public/ in source. */
const PUBLIC_IMPORT_RE = /from\s+["'](?:\.\.\/)*public\//g;

const PUBLIC_ALLOWED = new Set(["favicon.ico", "robots.txt", ".gitkeep", ".DS_Store"]);

const IMAGE_EXT_RE = /\.(png|jpe?g|svg|webp|gif|ico)$/i;

/**
 * @param {string} relativePath
 */
export const shouldScanSourceFile = (relativePath) => {
  if (!SOURCE_FILE_RE.test(relativePath)) {
    return false;
  }
  if (ASSETS_INDEX_RE.test(relativePath)) {
    return false;
  }
  return true;
};

/**
 * @param {string} content
 * @param {string} relativePath
 * @returns {StaticImageViolation[]}
 */
export const scanSourceStaticImagePaths = (content, relativePath) => {
  if (IGNORE_FILE_RE.test(content)) {
    return [];
  }

  /** @type {StaticImageViolation[]} */
  const violations = [];
  const lines = content.split("\n");

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? "";
    if (IGNORE_LINE_RE.test(line)) {
      continue;
    }

    for (const match of line.matchAll(ROOT_IMAGE_PATH_RE)) {
      const path = match[2] ?? "";
      if (/^https?:\/\//i.test(path)) {
        continue;
      }
      violations.push({
        line: lineIndex + 1,
        column: (match.index ?? 0) + 1,
        text: `/${path}`,
        kind: "root-image-path",
      });
    }

    for (const match of line.matchAll(PUBLIC_IMPORT_RE)) {
      violations.push({
        line: lineIndex + 1,
        column: (match.index ?? 0) + 1,
        text: match[0],
        kind: "public-import",
      });
    }
  }

  return violations;
};

/**
 * @param {string} relativePath path under public/
 */
export const isAllowedPublicFile = (relativePath) => {
  const base = relativePath.split("/").pop() ?? relativePath;
  if (PUBLIC_ALLOWED.has(base)) {
    return true;
  }
  return !IMAGE_EXT_RE.test(base);
};

/**
 * @param {string[]} publicFiles paths relative to repo root, e.g. public/foo.png
 * @returns {StaticImageViolation[]}
 */
export const scanPublicImageFiles = (publicFiles) => {
  /** @type {StaticImageViolation[]} */
  const violations = [];

  for (const filePath of publicFiles) {
    const underPublic = filePath.replace(/^public\//, "");
    if (isAllowedPublicFile(underPublic)) {
      continue;
    }
    violations.push({
      line: 1,
      column: 1,
      text: filePath,
      kind: "public-image-file",
    });
  }

  return violations;
};
