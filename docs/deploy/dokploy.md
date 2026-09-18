# Deploying to Dokploy

The app runs as a single Dokploy **Compose** service built from this repo
(`docker-compose.yml` + `Dockerfile`). It contains two containers:

| Service  | What it is                                          | Internal port | Domain                     |
|----------|-----------------------------------------------------|---------------|----------------------------|
| `web`    | Next.js server (`output: "standalone"`, `node server.js`) | `3000`        | `oryx.indenbom.ru`         |
| `collab` | Yjs collaboration WebSocket server                  | `1234`        | `oryx-collab.indenbom.ru`  |

A **second Compose service** in the same Dokploy project (`supabase`, isolated)
is the demo backend. How to use it (client, migrations, seed, which instance
**not** to touch): [docs/conventions/backend/supabase.md](../conventions/backend/supabase.md).

| Service  | What it is                          | Internal port | Domain |
|----------|-------------------------------------|---------------|--------|
| `kong`   | Supabase API gateway (PostgREST, Auth, Studio) | `8000` | `supabase.oryx.indenbom.ru` (fallback: `*.sslip.io`) |

Traefik (managed by Dokploy) terminates TLS and proxies directly to the Next.js
server on port `3000`; it also upgrades the WebSocket so the browser talks to
`wss://oryx-collab.indenbom.ru`.

> The app is a **server** build (`output: "standalone"`), so server-side
> features (API route handlers, server components, etc.) run at runtime. There
> is no static export and no nginx/GitHub Pages step anymore.

## Build-time configuration

`NEXT_PUBLIC_*` values are inlined into the **client** bundle at build time, so
the collab URL is passed as a Docker build arg sourced from the Compose env:

```
NEXT_PUBLIC_COLLAB_WS_URL=wss://oryx-collab.indenbom.ru
NEXT_PUBLIC_SUPABASE_URL=https://supabase.oryx.indenbom.ru
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon JWT from the supabase compose Environment>
```

Set this in the Dokploy Compose **Environment** tab. Changing it requires a
redeploy (rebuild). Server-only secrets (no `NEXT_PUBLIC_` prefix) can be set as
plain runtime env vars on the `web` service and are read at request time.

Do **not** reuse Capacity or YNAPB Supabase. The Oryx compose is `oryx-supabase-bb1dnn`.

## Keeping builds from hanging the host

The Dokploy box is shared (≈15 GiB RAM). A default `docker compose up --build`
builds `web` and `collab` in parallel: two `npm ci` plus `next build` can push
load into the hundreds and take the whole server offline.

Hardening in this repo:

| Piece | What it does |
|-------|----------------|
| Dokploy **Command** on `oryx-demo` | Builds `web`, then `collab`, then `up -d` (no parallel image builds) |
| `Dockerfile` | Caps Node heap (`1536` MiB build / `512` MiB web / `256` MiB collab), builds with `next build --webpack` (Turbopack peaks higher), limits npm sockets, npm cache mounts |
| `scripts/collab-package.json` | Collab image installs only `ws` / `yjs` / `y-protocols` / `lib0` — not the full app lockfile |
| `.dockerignore` | Drops `.agents`, `_bmad*`, `docs`, `tests`, `supabase`, etc. from the build context |
| `docker-compose.yml` | Runtime `mem_limit` / `cpus` on `web` and `collab` |

Dokploy Command (Advanced) for `oryx-demo` — must be the full replacement line
(Dokploy prefixes `docker `). Chained steps after `&&` must start with
`docker compose `:

```
compose -p compose-synthesize-neural-capacitor-1obmbe -f ./docker-compose.yml build web && docker compose -p compose-synthesize-neural-capacitor-1obmbe -f ./docker-compose.yml build collab && docker compose -p compose-synthesize-neural-capacitor-1obmbe -f ./docker-compose.yml up -d --remove-orphans
```

Also keep **Settings → Deployments → concurrent builds = 1** on this server so
another project does not build at the same time.

## DNS (manual, one-time)

Point both hostnames at the Dokploy server with `A` records:

```
oryx.indenbom.ru             A   72.56.83.48
oryx-collab.indenbom.ru      A   72.56.83.48
supabase.oryx.indenbom.ru    A   72.56.83.48
```

`supabase.oryx.indenbom.ru` already has a Cloudflare `A` → `72.56.83.48` and a
Let's Encrypt cert via Traefik. Keep the `sslip.io` domain as a fallback.

Let's Encrypt certificates are issued automatically once DNS resolves and
ports 80/443 are reachable.

## Local equivalents

```bash
npm run dev:collab   # Next dev + collab server on ws://127.0.0.1:1234
npm run build        # production build (emits .next/standalone)
npm run start        # run the production server locally on :3000
```
