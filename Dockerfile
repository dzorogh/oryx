# syntax=docker/dockerfile:1

# ---------- install all deps (needed to build the app) ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- build the Next.js server bundle (output: "standalone") ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* are inlined into the client bundle at build time, so the collab
# websocket URL must be provided as a build arg here.
ARG NEXT_PUBLIC_COLLAB_WS_URL
ENV NEXT_PUBLIC_COLLAB_WS_URL=${NEXT_PUBLIC_COLLAB_WS_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- web: run the Next.js server (standalone output) ----------
FROM node:22-alpine AS web
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# The standalone output ships its own minimal server.js + node_modules.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]

# ---------- collab: Yjs websocket server (runtime deps only) ----------
FROM node:22-alpine AS collab
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY scripts/collab-server.mjs ./scripts/collab-server.mjs
ENV HOST=0.0.0.0
ENV PORT=1234
EXPOSE 1234
CMD ["node", "scripts/collab-server.mjs"]
