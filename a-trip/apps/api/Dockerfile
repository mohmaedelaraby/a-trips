# syntax=docker/dockerfile:1
#
# NestJS API. Built from the monorepo root so the pnpm workspace and lockfile
# are visible:  docker build -f apps/api/Dockerfile .
#
# Prisma uses the pg driver adapter, so no query-engine binary ships at
# runtime, and the generated client is plain TypeScript compiled into dist/.

# --------------------------------------------------------------------- base
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# --------------------------------------------------------------------- deps
# Only manifests are copied first, so this layer is reused whenever source
# changes but dependencies do not.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @a-trip/api...

# -------------------------------------------------------------------- build
FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/api apps/api
WORKDIR /repo/apps/api
# prisma.config.ts resolves the datasource from the environment; generation
# never opens a connection, so a placeholder is enough here.
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
RUN pnpm exec prisma generate --config prisma.config.ts
RUN pnpm run build

# ------------------------------------------------------------------ migrate
# Keeps the Prisma CLI and schema for `migrate deploy` / seeding. Compose runs
# this as a one-shot job so the runtime image stays lean.
FROM build AS migrate
ENV NODE_ENV=production
WORKDIR /repo/apps/api
CMD ["pnpm", "exec", "prisma", "migrate", "deploy", "--config", "prisma.config.ts"]

# ---------------------------------------------------------------- prod-deps
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --prod --filter @a-trip/api...

# ------------------------------------------------------------------ runtime
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=prod-deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json

# Drop privileges: the image never writes to disk at runtime.
USER node
WORKDIR /repo/apps/api
EXPOSE 4000

# No shell form — this way node is PID 1 and receives SIGTERM directly, so
# compose/orchestrator stop signals shut Nest down gracefully.
CMD ["node", "dist/main.js"]
