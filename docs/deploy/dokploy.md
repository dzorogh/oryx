# Deploying to Dokploy

The demo runs as a single Dokploy **Compose** service built from this repo
(`docker-compose.yml` + `Dockerfile`). It contains two containers:

| Service  | What it is                                  | Internal port | Domain                     |
|----------|---------------------------------------------|---------------|----------------------------|
| `web`    | Next.js static export (`out/`) behind nginx | `80`          | `oryx.indenbom.ru`         |
| `collab` | Yjs collaboration WebSocket server          | `1234`        | `oryx-collab.indenbom.ru`  |

Traefik (managed by Dokploy) terminates TLS and upgrades the WebSocket, so the
browser talks to `wss://oryx-collab.indenbom.ru`.

## Build-time configuration

Because the site is a static export (`output: "export"`), `NEXT_PUBLIC_*`
values are inlined at build time. The collab URL is passed as a Docker build
arg sourced from the Compose env:

```
NEXT_PUBLIC_COLLAB_WS_URL=wss://oryx-collab.indenbom.ru
```

Set this in the Dokploy Compose **Environment** tab. Changing it requires a
redeploy (rebuild).

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
```
