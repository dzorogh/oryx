export const EMPTY_FIELD_PLACEHOLDER = "—";

export const formatOptionalText = (value?: string | null): string => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : EMPTY_FIELD_PLACEHOLDER;
};

export const formatOptionalDate = (iso?: string | null): string => {
  if (!iso?.trim()) {
    return EMPTY_FIELD_PLACEHOLDER;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return EMPTY_FIELD_PLACEHOLDER;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};
