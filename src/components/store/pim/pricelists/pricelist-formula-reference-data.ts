/**
 * Static reference for the formula language shown in the parameter editor.
 * Content mirrors the documented operators and helpers; nothing here is
 * evaluated — it only documents the available syntax.
 */
export type FormulaReferenceEntry = {
  syntax: string;
  description: string;
  example: string;
};

export type FormulaReferenceSection = {
  title: string;
  entries: FormulaReferenceEntry[];
};

export const FORMULA_REFERENCE_SECTIONS: FormulaReferenceSection[] = [
  {
    title: "Operators",
    entries: [
      { syntax: "+", description: "Addition", example: "5 + 3 = 8" },
      { syntax: "-", description: "Subtraction", example: "10 - 4 = 6" },
      { syntax: "*", description: "Multiplication", example: "2 * 3 = 6" },
      { syntax: "/", description: "Division", example: "10 / 2 = 5" },
      { syntax: "%", description: "Remainder of division (mod)", example: "10 % 3 = 1" },
      { syntax: "**", description: "Exponentiation", example: "2 ** 3 = 8" },
    ],
  },
  {
    title: "Terms and functions",
    entries: [
      { syntax: "if(condition, then, else)", description: "Conditional operator (Excel IF equivalent)", example: "if(10 > 5, 1, 2) = 1" },
      { syntax: "x ? a : b", description: "Ternary operator (IF equivalent)", example: "price > 100 ? 0.9 : 1" },
      { syntax: "coalesce(a, b, ...)", description: "Returns the first non-empty argument (not null, not undefined, not an empty string)", example: "coalesce(null, \"\", 0, 5) = 0" },
      { syntax: "clamp(value, min, max)", description: "Limits the value from below and above: below min returns min, above max returns max", example: "clamp(120, 0, 100) = 100" },
      { syntax: "rate_usd(cur)", description: "Exchange rate for USD", example: "rate_usd('RUB') = 100" },
      { syntax: "inverse_rate_usd(cur)", description: "Inverse exchange rate for USD", example: "inverse_rate_usd('EUR') = 0.5" },
    ],
  },
  {
    title: "Mathematical functions",
    entries: [
      { syntax: "round(number, precision)", description: "Rounds to a specified number of decimal places", example: "round(1.55, 1) = 1.6" },
      { syntax: "floor(number)", description: "Rounding down", example: "floor(1.9) = 1" },
      { syntax: "ceil(number)", description: "Rounding up", example: "ceil(1.1) = 2" },
      { syntax: "abs(number)", description: "Number modulus (absolute value)", example: "abs(-5) = 5" },
      { syntax: "sqrt(number)", description: "Square root", example: "sqrt(9) = 3" },
      { syntax: "min(a, b, ...)", description: "Minimum from list", example: "min(3, 1, 7) = 1" },
      { syntax: "max(a, b, ...)", description: "Maximum from list", example: "max(3, 1, 7) = 7" },
      { syntax: "log(number)", description: "Natural logarithm", example: "log(1) = 0" },
      { syntax: "log10(number)", description: "Decimal logarithm", example: "log10(100) = 2" },
    ],
  },
];
