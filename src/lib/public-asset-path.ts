const normalizeBasePath = (basePath: string): string => {
  if (!basePath || basePath === "/") {
    return "";
  }

  return basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
};

const BASE_PATH = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH ?? "");

const isAbsoluteUrl = (pathname: string): boolean =>
  /^(https?:|data:|blob:)/i.test(pathname);

/**
 * Prefix a `public/` asset path with Next.js `basePath` (e.g. `/oryx` on GitHub Pages).
 * External and data URLs are returned unchanged.
 */
export const publicAssetPath = (pathname: string): string => {
  if (!pathname || !BASE_PATH || isAbsoluteUrl(pathname)) {
    return pathname;
  }

  if (pathname.startsWith(BASE_PATH)) {
    return pathname;
  }

  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${BASE_PATH}${path}`;
};
