# syntax=docker/dockerfile:1

# ---------- install all deps (needed to build the static site) ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- build the Next.js static export (-> out/) ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# output: "export" inlines NEXT_PUBLIC_* at build time, so the collab
# websocket URL must be provided as a build arg here.
ARG NEXT_PUBLIC_COLLAB_WS_URL
ENV NEXT_PUBLIC_COLLAB_WS_URL=${NEXT_PUBLIC_COLLAB_WS_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- web: serve the static bundle with nginx ----------
FROM nginx:1.27-alpine AS web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/out /usr/share/nginx/html
EXPOSE 80

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
