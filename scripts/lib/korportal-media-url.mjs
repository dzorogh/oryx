/** Korportal Spatie original: /s3/media/{YYYY}/{MM}/{DD}/{HH}/{id}/{file} */
const ORIGINAL_MEDIA_URL =
  /^https:\/\/my\.globaldrive\.ru\/s3\/media\/(\d{4}\/\d{2}\/\d{2}\/\d{2})\/(\d+)\/([^/]+)$/;

export const KORPORTAL_MEDIA_CONVERSIONS = ["medium", "small", "big"];

const fileStem = (fileName) => fileName.replace(/\.[^.]+$/, "");

export const korportalMediaConversionUrl = (originalUrl, conversion) => {
  const match = originalUrl.trim().match(ORIGINAL_MEDIA_URL);
  if (!match) {
    return originalUrl;
  }
  const [, datePath, mediaId, fileName] = match;
  return `https://my.globaldrive.ru/s3/media/${datePath}/${mediaId}/conversions/${fileStem(fileName)}-${conversion}.webp`;
};

/**
 * Prefer Spatie medium (then small, then big). Keep the original only when
 * no conversion is listed. Already-converted URLs are left unchanged.
 */
export const preferKorportalMediaConversion = (url, available = KORPORTAL_MEDIA_CONVERSIONS) => {
  const trimmed = url?.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.includes("/conversions/")) {
    return trimmed;
  }
  const pick = ["medium", "small", "big"].find((name) => available.includes(name)) ?? null;
  if (!pick) {
    return trimmed;
  }
  return korportalMediaConversionUrl(trimmed, pick);
};
