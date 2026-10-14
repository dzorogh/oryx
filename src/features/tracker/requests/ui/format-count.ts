/** Russian plural: formatCount(3, ["поле", "поля", "полей"]) → "3 поля". */
export const formatCount = (count: number, [one, few, many]: [string, string, string]): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? one
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? few
        : many;
  return `${count} ${word}`;
};
