# syntax=docker/dockerfile:1
#
# Next.js frontend. Built from the monorepo root so the pnpm workspace and
# lockfile are visible:  docker build -f apps/web/Dockerfile .

# --------------------------------------------------------------------- base
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# --------------------------------------------------------------------- deps
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @a-trip/web...

# -------------------------------------------------------------------- build
FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/web apps/web

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so
# this must be the URL the *browser* will call — not an internal compose
# hostname, which only resolves inside the network.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /repo/apps/web
RUN pnpm run build

# ------------------------------------------------------------------ runtime
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

# The standalone bundle already contains the traced node_modules; static and
# public assets are not traced and must be copied alongside it.
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public

USER node
EXPOSE 3000

# node as PID 1 so SIGTERM reaches the server directly.
CMD ["node", "apps/web/server.js"]
