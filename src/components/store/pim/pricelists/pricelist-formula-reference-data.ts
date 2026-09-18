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
    title: "Операторы",
    entries: [
      { syntax: "+", description: "Сложение", example: "5 + 3 = 8" },
      { syntax: "-", description: "Вычитание", example: "10 - 4 = 6" },
      { syntax: "*", description: "Умножение", example: "2 * 3 = 6" },
      { syntax: "/", description: "Деление", example: "10 / 2 = 5" },
      { syntax: "%", description: "Остаток от деления (mod)", example: "10 % 3 = 1" },
      { syntax: "**", description: "Возведение в степень", example: "2 ** 3 = 8" },
    ],
  },
  {
    title: "Выражения и функции",
    entries: [
      { syntax: "if(condition, then, else)", description: "Условный оператор (аналог Excel IF)", example: "if(10 > 5, 1, 2) = 1" },
      { syntax: "x ? a : b", description: "Тернарный оператор (аналог IF)", example: "50 > 100 ? 0.9 : 1 = 1" },
      { syntax: "coalesce(a, b, ...)", description: "Первый непустой аргумент (не null, не undefined и не пустая строка)", example: "coalesce(null, \"\", 0, 5) = 0" },
      { syntax: "clamp(value, min, max)", description: "Ограничивает значение снизу и сверху: меньше min даёт min, больше max — max", example: "clamp(120, 0, 100) = 100" },
      { syntax: "rate_usd(cur)", description: "Курс к USD", example: "rate_usd('RUB') = 100" },
      { syntax: "inverse_rate_usd(cur)", description: "Обратный курс к USD", example: "inverse_rate_usd('EUR') = 0.5" },
    ],
  },
  {
    title: "Математические функции",
    entries: [
      { syntax: "round(number, precision)", description: "Округление до заданного числа знаков", example: "round(1.55, 1) = 1.6" },
      { syntax: "floor(number)", description: "Округление вниз", example: "floor(1.9) = 1" },
      { syntax: "ceil(number)", description: "Округление вверх", example: "ceil(1.1) = 2" },
      { syntax: "abs(number)", description: "Модуль числа", example: "abs(-5) = 5" },
      { syntax: "sqrt(number)", description: "Квадратный корень", example: "sqrt(9) = 3" },
      { syntax: "min(a, b, ...)", description: "Минимум из списка", example: "min(3, 1, 7) = 1" },
      { syntax: "max(a, b, ...)", description: "Максимум из списка", example: "max(3, 1, 7) = 7" },
      { syntax: "log(number)", description: "Натуральный логарифм", example: "log(1) = 0" },
      { syntax: "log10(number)", description: "Десятичный логарифм", example: "log10(100) = 2" },
    ],
  },
];
