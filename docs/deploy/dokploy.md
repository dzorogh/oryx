# Deploying to Dokploy

The app runs as a single Dokploy **Compose** service built from this repo
(`docker-compose.yml` + `Dockerfile`). It contains two containers:

| Service  | What it is                                          | Internal port | Domain                     |
|----------|-----------------------------------------------------|---------------|----------------------------|
| `web`    | Next.js server (`output: "standalone"`, `node server.js`) | `3000`        | `oryx.indenbom.ru`         |
| `collab` | Yjs collaboration WebSocket server                  | `1234`        | `oryx-collab.indenbom.ru`  |

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
```

Set this in the Dokploy Compose **Environment** tab. Changing it requires a
redeploy (rebuild). Server-only secrets (no `NEXT_PUBLIC_` prefix) can be set as
plain runtime env vars on the `web` service and are read at request time.

## DNS (manual, one-time)

Point both hostnames at the Dokploy server with `A` records:

```
oryx.indenbom.ru         A   72.56.83.48
oryx-collab.indenbom.ru  A   72.56.83.48
```

Let's Encrypt certificates are issued automatically once DNS resolves and
ports 80/443 are reachable.

## Local equivalents

```bash
npm run dev:collab   # Next dev + collab server on ws://127.0.0.1:1234
npm run build        # production build (emits .next/standalone)
npm run start        # run the production server locally on :3000
```
