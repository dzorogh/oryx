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

Remote URLs (`https://…`) are fine for avatars and external media.

## Verification

```bash
npm run check:static-images
```

Add `static-images: ignore` on a line to suppress a rare exception (document why in the PR).
