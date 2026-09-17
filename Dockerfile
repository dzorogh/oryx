# syntax=docker/dockerfile:1

# Keep builds gentle on the shared Dokploy host (15 GiB RAM, many apps).
# Cap Node heap and npm sockets so `next build` cannot fork-bomb the machine.

# ---------- install all deps (needed to build the app) ----------
FROM node:22-alpine AS deps
WORKDIR /app
ENV NPM_CONFIG_MAXSOCKETS=3 \
    NPM_CONFIG_FETCH_RETRIES=2 \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ---------- build the Next.js server bundle (output: "standalone") ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* are inlined into the client bundle at build time, so the collab
# websocket URL must be provided as a build arg here.
ARG NEXT_PUBLIC_COLLAB_WS_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_COLLAB_WS_URL=${NEXT_PUBLIC_COLLAB_WS_URL} \
    NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY} \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=1536 \
    UV_THREADPOOL_SIZE=2
# Webpack (not Turbopack): lower peak RAM on the shared 15 GiB Dokploy host.
RUN npm run build -- --webpack

# ---------- web: run the Next.js server (standalone output) ----------
FROM node:22-alpine AS web
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NODE_OPTIONS=--max-old-space-size=512
# The standalone output ships its own minimal server.js + node_modules.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]

# ---------- collab: tiny Yjs websocket image (not a full npm ci of the app) ----------
FROM node:22-alpine AS collab
WORKDIR /app
ENV NODE_ENV=production \
    NPM_CONFIG_MAXSOCKETS=2 \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    HOST=0.0.0.0 \
    PORT=1234 \
    NODE_OPTIONS=--max-old-space-size=256
COPY scripts/collab-package.json ./package.json
RUN --mount=type=cache,target=/root/.npm \
    npm install --omit=dev
COPY scripts/collab-server.mjs ./scripts/collab-server.mjs
EXPOSE 1234
CMD ["node", "scripts/collab-server.mjs"]
