# Static images (demo and UI assets)

## Rule

Bundled UI images (logos, flags, product photos, illustrations) must **not** be served via string paths to `public/` (e.g. `src="/tenants/logos/foo.png"`). That breaks on GitHub Pages when `basePath` is set: Next.js prefixes routes and `_next` assets, but not arbitrary `public/` URLs in JSX.

Use **static imports** from `src/assets/` instead.

## Layout

```text
src/assets/
  tenants/logos/       → export TENANT_LOGOS from index.ts
  languages/flags/     → export LANGUAGE_FLAGS
  store/demo-images/   → export STORE_DEMO_IMAGES
public/
  favicon.ico          → only root static file (Next metadata)
```

1. Put image files under the matching `src/assets/...` folder.
2. Import them in that folder’s `index.ts` and export a named map or list.
3. In app code, use `StaticImageData` with `next/image` (see `TenantLogo`, catalog cards).

## Examples

```ts
// Good — src/assets/tenants/logos/index.ts
import globaldrive from "./globaldrive.png";
export const TENANT_LOGOS = { globaldrive } as const;

// Good — demo data
logo: TENANT_LOGOS.globaldrive,

// Bad — breaks on /oryx GitHub Pages
logoUrl: "/tenants/logos/globaldrive.png",
```

## Remote demo media and avatars

Bundled UI chrome (logos, flags, icons, illustrations) → static imports (above).
**Demo content** (news covers, person photos, mock galleries) → remote `https://…` URLs are fine and preferred over committing throwaway binaries.

Use only these stable, keyless services. **Do not** use `loremflickr.com` (it returns `HTTP 500` and broke every demo screen):

| Use case | Service | Pattern |
|----------|---------|---------|
| Content / cover images | Lorem Picsum | `https://picsum.photos/seed/<seed>/<w>/<h>` |
| Person avatars / portraits | Pravatar | `https://i.pravatar.cc/<size>?u=<seed>` |

Rules:

1. **Always seed for stability.** Use `seed/<id>` (Picsum) or `?u=<id>` (Pravatar) so the same record keeps the same image across reloads. Derive the seed from a stable id (e.g. `news-1`, `emp-12`). Random/unseeded URLs change every request and look broken.
2. **Render with `next/image`.** Use `fill` + `sizes` inside a sized, `overflow-hidden rounded-*` container (see `home-news-section.tsx`, `pricelists-presence.tsx`).
3. **Register the host** in `next.config.ts` → `images.remotePatterns` before adding a new external image host.
4. **Provide a fallback** for generated avatars where the URL may be missing (initials on a colored background), e.g. `PricelistsPresence`.

```ts
// Good — demo data
imageUrl: "https://picsum.photos/seed/news-1/1600/900",
avatarUrl: "https://i.pravatar.cc/200?u=emp-12",

// Bad — dead service / unseeded (changes every load)
imageUrl: "https://loremflickr.com/1600/900/office?lock=1",
avatarUrl: "https://i.pravatar.cc/200",
```

## Verification

```bash
npm run check:static-images
```

Add `static-images: ignore` on a line to suppress a rare exception (document why in the PR).
