import { scanEnglishUi } from "../scripts/lib/english-ui-scan.mjs";

/** @type {import('eslint').Rule.RuleModule} */
const noCyrillicUi = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow Cyrillic characters in user-facing UI copy",
    },
    messages: {
      cyrillic:
        'User-facing UI text must be in English (no Cyrillic). Found: "{{text}}" ({{kind}}). Use // english-ui:ignore to exempt.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const violations = scanEnglishUi(sourceCode.getText(), context.filename);

    return {
      Program() {
        for (const violation of violations) {
          context.report({
            loc: {
              start: { line: violation.line, column: violation.column },
              end: { line: violation.line, column: violation.column + 1 },
            },
            messageId: "cyrillic",
            data: {
              text: violation.text,
              kind: violation.kind,
            },
          });
        }
      },
    };
  },
};

export default noCyrillicUi;
