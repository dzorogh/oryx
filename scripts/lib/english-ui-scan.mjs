/**
 * Scans TSX/JSX sources for Cyrillic in user-facing UI copy.
 * Comments and non-UI technical strings are ignored.
 */

/** @typedef {{ line: number, column: number, text: string, kind: string }} UiViolation */

const CYRILLIC_RE = /[А-Яа-яЁё]/;

const IGNORE_LINE_RE = /english-ui:\s*ignore\b/;
const IGNORE_FILE_RE = /english-ui:\s*ignore-file\b/;

const UI_JSX_ATTRS = new Set([
  "placeholder",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-placeholder",
  "ariaLabel",
  "title",
  "alt",
  "label",
  "helperText",
  "emptyText",
  "description",
]);

const NON_UI_JSX_ATTRS = new Set([
  "className",
  "class",
  "href",
  "src",
  "id",
  "key",
  "type",
  "variant",
  "size",
  "role",
  "name",
  "htmlFor",
  "rel",
  "target",
  "method",
  "encType",
  "data-slot",
  "data-testid",
  "strokeWidth",
  "viewBox",
  "xmlns",
  "fill",
  "stroke",
  "d",
  "asChild",
  "side",
  "align",
  "sideOffset",
  "alignOffset",
  "collisionPadding",
  "sticky",
  "position",
  "mode",
  "value",
  "defaultValue",
  "open",
  "dir",
  "lang",
  "slot",
  "suppressHydrationWarning",
]);

const UI_OBJECT_KEYS = new Set([
  "label",
  "title",
  "description",
  "message",
  "placeholder",
  "emptyText",
  "helperText",
  "ariaLabel",
  "buttonLabel",
  "confirmLabel",
  "cancelLabel",
  "hint",
  "subtitle",
  "heading",
  "badge",
  "statusLabel",
  "tooltip",
]);

const IMPORT_EXPORT_RE = /^\s*(import|export)\s+/;

const STRING_LITERAL_RE = /(['"`])((?:\\.|(?!\1)[^\\])*)(\1)/g;
const JSX_TEXT_RE = />([^<>{}]+)</g;
const JSX_UI_ATTR_RE = new RegExp(
  `\\b(${[...UI_JSX_ATTRS].join("|")})\\s*=\\s*(['"\`])([^'"\`]*)(\\2)`,
  "g",
);
const OBJECT_UI_KEY_RE = new RegExp(
  `\\b(${[...UI_OBJECT_KEYS].join("|")})\\s*:\\s*(['"\`])([^'"\`]*)(\\2)`,
  "g",
);

/**
 * @param {string} source
 */
export const stripComments = (source) => {
  let result = "";
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "/" && next === "/") {
      const end = source.indexOf("\n", index);
      const lineEnd = end === -1 ? source.length : end;
      result += " ".repeat(lineEnd - index);
      index = lineEnd;
      continue;
    }

    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      const blockEnd = end === -1 ? source.length : end + 2;
      result += " ".repeat(blockEnd - index);
      index = blockEnd;
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      const quote = char;
      let cursor = index + 1;
      let escaped = false;

      while (cursor < source.length) {
        const current = source[cursor];
        if (escaped) {
          escaped = false;
          cursor += 1;
          continue;
        }
        if (current === "\\") {
          escaped = true;
          cursor += 1;
          continue;
        }
        if (quote === "`" && current === "$" && source[cursor + 1] === "{") {
          break;
        }
        if (current === quote) {
          cursor += 1;
          break;
        }
        cursor += 1;
      }

      result += source.slice(index, cursor);
      index = cursor;
      continue;
    }

    result += char;
    index += 1;
  }

  return result;
};

/**
 * @param {string} source
 * @param {number} index
 */
const getPosition = (source, index) => {
  const before = source.slice(0, index);
  const lines = before.split("\n");
  const line = lines.length;
  const column = (lines.at(-1)?.length ?? 0) + 1;
  return { line, column };
};

/**
 * @param {string} snippet
 */
const truncate = (snippet) => {
  const normalized = snippet.replace(/\s+/g, " ").trim();
  if (normalized.length <= 72) {
    return normalized;
  }
  return `${normalized.slice(0, 69)}...`;
};

/**
 * @param {UiViolation[]} violations
 * @param {string} source
 * @param {number} index
 * @param {string} text
 * @param {string} kind
 */
const pushViolation = (violations, source, index, text, kind) => {
  if (!CYRILLIC_RE.test(text)) {
    return;
  }
  const { line, column } = getPosition(source, index);
  violations.push({
    line,
    column,
    text: truncate(text),
    kind,
  });
};

/**
 * @param {string} line
 */
const isIgnoredLine = (line) => IGNORE_LINE_RE.test(line);

/**
 * @param {string} line
 */
const shouldSkipGenericStringLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || IMPORT_EXPORT_RE.test(trimmed)) {
    return true;
  }
  if (
    /\b(className|href|src|pathname|key|id|type|variant|size|role|data-[a-zA-Z-]+)\s*=/.test(
      line,
    )
  ) {
    return true;
  }
  if (/\bcn\s*\(/.test(line) || /\bconsole\./.test(line)) {
    return true;
  }
  return false;
};

/**
 * @param {string} content
 * @param {string} [filePath]
 * @returns {UiViolation[]}
 */
const isDemoDataFile = (filePath) => /-demo-data\.ts$/.test(filePath) || /\/demo-data\.ts$/.test(filePath);

export const scanEnglishUi = (content, filePath = "") => {
  if (IGNORE_FILE_RE.test(content.slice(0, 500))) {
    return [];
  }

  const violations = [];
  const rawLines = content.split("\n");
  const withoutComments = stripComments(content);
  const lines = withoutComments.split("\n");
  const scanDemoDataStrings = isDemoDataFile(filePath);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const rawLine = rawLines[lineIndex] ?? "";
    const previousRawLine = lineIndex > 0 ? (rawLines[lineIndex - 1] ?? "") : "";

    if (isIgnoredLine(rawLine) || isIgnoredLine(previousRawLine)) {
      continue;
    }

    if (!CYRILLIC_RE.test(line)) {
      continue;
    }

    let lineOffset = 0;
    for (let index = 0; index < lineIndex; index += 1) {
      lineOffset += lines[index].length + 1;
    }

    JSX_TEXT_RE.lastIndex = 0;
    let jsxMatch = JSX_TEXT_RE.exec(line);
    while (jsxMatch) {
      const text = jsxMatch[1].trim();
      if (text && CYRILLIC_RE.test(text)) {
        pushViolation(
          violations,
          withoutComments,
          lineOffset + jsxMatch.index + 1,
          text,
          "jsx-text",
        );
      }
      jsxMatch = JSX_TEXT_RE.exec(line);
    }

    JSX_UI_ATTR_RE.lastIndex = 0;
    let attrMatch = JSX_UI_ATTR_RE.exec(line);
    while (attrMatch) {
      const text = attrMatch[3];
      pushViolation(
        violations,
        withoutComments,
        lineOffset + attrMatch.index + attrMatch[0].indexOf(text),
        text,
        `jsx-attr:${attrMatch[1]}`,
      );
      attrMatch = JSX_UI_ATTR_RE.exec(line);
    }

    OBJECT_UI_KEY_RE.lastIndex = 0;
    let objectMatch = OBJECT_UI_KEY_RE.exec(line);
    while (objectMatch) {
      const text = objectMatch[3];
      pushViolation(
        violations,
        withoutComments,
        lineOffset + objectMatch.index + objectMatch[0].indexOf(text),
        text,
        `object-key:${objectMatch[1]}`,
      );
      objectMatch = OBJECT_UI_KEY_RE.exec(line);
    }

    if (scanDemoDataStrings) {
      if (shouldSkipGenericStringLine(line)) {
        continue;
      }

      STRING_LITERAL_RE.lastIndex = 0;
      let demoMatch = STRING_LITERAL_RE.exec(line);
      while (demoMatch) {
        const text = demoMatch[2];
        const matchIndex = lineOffset + demoMatch.index + demoMatch[1].length;
        pushViolation(violations, withoutComments, matchIndex, text, "demo-data-string");
        demoMatch = STRING_LITERAL_RE.exec(line);
      }
      continue;
    }

    if (shouldSkipGenericStringLine(line)) {
      continue;
    }

    STRING_LITERAL_RE.lastIndex = 0;
    let stringMatch = STRING_LITERAL_RE.exec(line);
    while (stringMatch) {
      const text = stringMatch[2];
      const matchIndex = lineOffset + stringMatch.index + stringMatch[1].length;

      const before = line.slice(0, stringMatch.index).trimEnd();
      const isNonUiAttr = [...NON_UI_JSX_ATTRS].some((attr) =>
        before.endsWith(`${attr}=`),
      );
      const isUiAttr = [...UI_JSX_ATTRS].some((attr) => before.endsWith(`${attr}=`));

      if (!isNonUiAttr && (isUiAttr || !before.includes("="))) {
        pushViolation(violations, withoutComments, matchIndex, text, "string-literal");
      }

      stringMatch = STRING_LITERAL_RE.exec(line);
    }
  }

  const deduped = new Map();
  for (const violation of violations) {
    const key = `${violation.line}:${violation.column}:${violation.kind}:${violation.text}`;
    deduped.set(key, violation);
  }

  return [...deduped.values()].sort((left, right) => {
    if (left.line !== right.line) {
      return left.line - right.line;
    }
    return left.column - right.column;
  });
};

/**
 * @param {string} relativePath
 */
export const shouldScanFile = (relativePath) => {
  const normalized = relativePath.replaceAll("\\", "/");
  const isUiComponent = /\.(tsx|jsx)$/.test(normalized);
  const isDemoData =
    normalized.startsWith("src/") &&
    (/-demo-data\.ts$/.test(normalized) || /\/demo-data\.ts$/.test(normalized));

  if (!isUiComponent && !isDemoData) {
    return false;
  }
  if (
    normalized.includes("/node_modules/") ||
    normalized.includes("/.next/") ||
    normalized.includes("/coverage/") ||
    normalized.includes("/.stryker-tmp/")
  ) {
    return false;
  }
  if (/\.(test|spec)\.(tsx|jsx)$/.test(normalized)) {
    return false;
  }
  return normalized.startsWith("app/") || normalized.startsWith("src/");
};
