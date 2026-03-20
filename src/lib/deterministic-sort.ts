export type Comparator<T> = (left: T, right: T) => number;

export const deterministicSort = <T>(
  values: readonly T[],
  ...comparators: Comparator<T>[]
): T[] => {
  const decorated = values.map((value, index) => ({ value, index }));

  decorated.sort((left, right) => {
    for (const comparator of comparators) {
      const comparison = comparator(left.value, right.value);
      if (comparison !== 0) {
        return comparison;
      }
    }

    return left.index - right.index;
  });

  return decorated.map((entry) => entry.value);
};
