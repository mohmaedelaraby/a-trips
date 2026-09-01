# A Trip

A hotel booking platform built as a pnpm + Turborepo monorepo: a **Next.js 16** storefront and
admin portal, and a **NestJS 12** REST API backed by **PostgreSQL** (Prisma 7) and
**S3-compatible object storage** (MinIO in development).

Phase 1 covers hotels only — search, availability, booking, and a full admin portal for
hotels, room types, availability calendars, bookings, amenities and staff users.

---

## Table of contents

- [Tech stack](#tech-stack)
- [Repository structure](#repository-structure)
- [Running with Docker (recommended)](#running-with-docker-recommended)
- [Running locally without Docker](#running-locally-without-docker)
- [Environment variables](#environment-variables)
- [Seed data & test accounts](#seed-data--test-accounts)
- [API surface](#api-surface)
- [Data model](#data-model)
- [Scripts reference](#scripts-reference)
- [Troubleshooting](#troubleshooting)

---

## Tech stack

### Monorepo & tooling

| Concern | Choice |
| --- | --- |
| Package manager | pnpm 10 (workspaces, `pnpm-workspace.yaml`) |
| Task runner | Turborepo 2 (`turbo.json` — `build`, `dev`, `lint`, `typecheck`, `test`) |
| Language | TypeScript 5.9 (shared `tsconfig.base.json`) |
| Formatting | Prettier 3 |
| Runtime | Node.js >= 20 (Docker images use Node 22 Alpine) |
| Containers | Docker Compose, multi-stage Dockerfile per app |

### API — `apps/api`

| Concern | Choice |
| --- | --- |
| Framework | NestJS 12 (`@nestjs/platform-express`) |
| ORM | Prisma 7 with the `@prisma/adapter-pg` driver adapter (no query-engine binary at runtime) |
| Database | PostgreSQL 16 |
| Auth | JWT (`@nestjs/jwt`) + Passport (`passport-jwt`), `bcryptjs` password hashing |
| Validation | `class-validator` / `class-transformer` via a global `ValidationPipe` (whitelist + `forbidNonWhitelisted`) |
| Config | `@nestjs/config` + `dotenv` |
| File uploads | `multer` into `@aws-sdk/client-s3` (+ `s3-request-presigner`) |
| API docs | Swagger / OpenAPI (`@nestjs/swagger`) at `/api/docs` |
| Testing | Jest + Supertest (unit and e2e) |

### Web — `apps/web`

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS 4 (`@tailwindcss/postcss`) plus CSS Modules per component |
| UI primitives | Radix UI (dialog, select, tabs, popover, dropdown, checkbox, label, separator, slot) |
| Icons | `lucide-react` |
| Server state | TanStack Query 5 |
| Client state | Zustand 5 |
| Forms | React Hook Form + Zod (via `@hookform/resolvers`) |
| HTTP | Axios (`src/shared/lib/api-client.ts`) |
| Dates | `date-fns` + `react-day-picker` |
| Utilities | `clsx`, `tailwind-merge`, `class-variance-authority` |

### Infrastructure

| Service | Image | Purpose |
| --- | --- | --- |
| `postgres` | `postgres:16-alpine` | Primary database (healthchecked) |
| `minio` | `minio/minio:latest` | S3-compatible storage for hotel photos; console on 9001 |
| `migrate` | `apps/api/Dockerfile` (`migrate` stage) | One-shot `prisma migrate deploy` before the API starts |
| `seed` | same image, `seed` profile | Loads demo + admin fixtures on demand |
| `api` | `apps/api/Dockerfile` (`runtime` stage) | NestJS API on 4000 |
| `web` | `apps/web/Dockerfile` (`runtime` stage) | Next.js app on 3000 |

---

## Repository structure

```
a-trip/
├── apps/
│   ├── api/                        # NestJS REST API (@a-trip/api)
│   │   ├── prisma/
│   │   │   ├── migrations/         # SQL migration history
│   │   │   ├── schema.prisma       # Data model
│   │   │   ├── seed.ts             # Guest-facing demo data (hotels, rooms, users)
│   │   │   └── seed-admin.ts       # Admin fixtures (staff, amenities, availability)
│   │   ├── src/
│   │   │   ├── main.ts             # Bootstrap: /api prefix, CORS, validation, Swagger
│   │   │   ├── app.module.ts
│   │   │   ├── health.controller.ts
│   │   │   ├── common/             # decorators, guards, filters, interceptors, interfaces, utils
│   │   │   ├── prisma/             # PrismaService / module
│   │   │   ├── generated/prisma/   # Generated Prisma client (compiled into dist)
│   │   │   └── modules/
│   │   │       ├── auth/           # register, login, me — JWT issuing
│   │   │       ├── users/          # profile read/update
│   │   │       ├── hotels/         # public search + admin CRUD, images, ordering
│   │   │       ├── room-types/     # admin room-type CRUD
│   │   │       ├── availability/   # calendar, bulk edits, stop-sell
│   │   │       ├── bookings/       # guest booking flow + admin confirm/reject/note
│   │   │       ├── admin/          # dashboard, staff users, amenities
│   │   │       └── storage/        # S3 client; auto-creates the public-read bucket
│   │   ├── test/                   # e2e suite (jest-e2e.json)
│   │   └── Dockerfile              # base → deps → build → migrate / prod-deps → runtime
│   │
│   └── web/                        # Next.js frontend (@a-trip/web)
│       ├── public/
│       ├── src/
│       │   ├── app/
│       │   │   ├── (public)/       # storefront: hotels, hotels/[hotelSlug], checkout,
│       │   │   │                   #   booking/[reference], account/{bookings,profile},
│       │   │   │                   #   sign-in, register, forgot-password
│       │   │   └── admin/          # portal: login, hotels (+ [hotelId]/room-types,
│       │   │                       #   [hotelId]/availability, new), room-types,
│       │   │                       #   availability, bookings, amenities, users
│       │   ├── modules/            # feature slices, each with
│       │   │   ├── hotels/         #   components/ hooks/ interfaces/ stores/ styles/
│       │   │   ├── bookings/
│       │   │   ├── availability/
│       │   │   ├── auth/
│       │   │   └── admin-dashboard/
│       │   └── shared/             # components, hooks, interfaces, lib (api-client), stores, styles
│       └── Dockerfile              # base → deps → build → runtime
│
├── packages/                       # reserved for shared workspace packages (currently empty)
├── docker-compose.yml              # full stack: postgres, minio, migrate, seed, api, web
├── .env.example                    # compose overrides (every value is already the default)
├── turbo.json                      # pipeline definitions
├── pnpm-workspace.yaml             # apps/* and packages/*
├── tsconfig.base.json
└── package.json                    # root scripts
```

Both apps follow the same **feature-module** convention: one folder per domain
(`hotels`, `bookings`, `availability`, `auth`, `admin`) owning everything for that
domain, plus a `common`/`shared` folder for cross-cutting code.

---

## Running with Docker (recommended)

### Prerequisites

Docker Desktop (or Docker Engine) with Compose v2. Nothing else — Node, pnpm,
Postgres and MinIO all live inside the containers.

### Start the whole stack

```bash
docker compose up -d --build
# or, from the repo root:
pnpm docker:up
```

That brings up, in order:

1. `postgres` and `minio`, waiting for both healthchecks
2. `migrate` — applies pending Prisma migrations, then exits
3. `api` — starts only after migrations complete successfully, and creates the
   `atrip-uploads` bucket on first boot
4. `web` — starts once the API healthcheck passes

**Every value has a working default, so the stack runs with no `.env` file.**
To override anything, copy `.env.example` to `.env` first.

### Load demo data

```bash
docker compose --profile seed run --rm seed
# or:
pnpm docker:seed
```

This runs `prisma/seed.ts` (demo hotels, room types, guest accounts) followed by
`prisma/seed-admin.ts` (staff accounts, amenities, units, 90 days of availability).
It is idempotent — re-running upserts rather than duplicating.

### URLs

| Service | URL |
| --- | --- |
| Web app | http://localhost:3000 |
| Admin portal | http://localhost:3000/admin |
| API | http://localhost:4000/api |
| API health | http://localhost:4000/api/health |
| Swagger docs | http://localhost:4000/api/docs |
| MinIO console | http://localhost:9001 (`minioadmin` / `minioadmin`) |
| Postgres | `localhost:5439` (`atrip` / `atrip`, database `atrip`) |

> Postgres is published on **5439**, not 5432, so it cannot collide with a
> Postgres already running on the host.

### Everyday commands

```bash
docker compose logs -f api web      # follow logs         (pnpm docker:logs)
docker compose ps                   # service status
docker compose restart api          # restart one service
docker compose down                 # stop, keep data     (pnpm docker:down)
docker compose down -v              # stop and WIPE the db + upload volumes (pnpm docker:reset)
docker compose up -d --build web    # rebuild a single app after code changes
```

Code changes are **not** hot-reloaded in the Docker images — they are production
builds. Re-run `docker compose up -d --build` after changing source, or use the
local dev workflow below.

> `NEXT_PUBLIC_API_URL` is baked into the web client bundle at **image build
> time**, so changing it requires `--build` to take effect.

### Database only

To run just Postgres in Docker and both apps on the host:

```bash
pnpm db:up      # docker compose up -d postgres
pnpm db:down
```

---

## Running locally without Docker

### Prerequisites

- Node.js >= 20
- pnpm 10 (`corepack enable`)
- A reachable PostgreSQL 16 instance (use `pnpm db:up` for the containerized one)

### Steps

```bash
# 1. install
pnpm install

# 2. environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
#    point DATABASE_URL at your Postgres; the containerized one is
#    postgresql://atrip:atrip@localhost:5439/atrip?schema=public

# 3. database
pnpm db:up            # optional: start Postgres in Docker
pnpm db:migrate       # prisma migrate dev
pnpm db:seed          # demo data
#    for the admin fixtures too:
pnpm --filter @a-trip/api exec tsx prisma/seed-admin.ts

# 4. run everything (Turborepo runs both apps in parallel)
pnpm dev
```

`pnpm dev` starts the API on **4000** (`ts-node-dev`, respawn on change) and the
web app on **3000** (`next dev`). To run one app only:

```bash
pnpm --filter @a-trip/api dev
pnpm --filter @a-trip/web dev
```

Without MinIO running, hotel-photo uploads fail but the API still boots — storage
failures are logged, not fatal. To get uploads working locally, start MinIO with
`docker compose up -d minio` and set the `S3_*` variables in `apps/api/.env`
(see the table below; `apps/api/.env.example` lists only the core variables).

### Quality gates

```bash
pnpm build       # turbo run build   (tsc for api, next build for web)
pnpm lint        # eslint
pnpm typecheck   # tsc --noEmit
pnpm test        # jest
pnpm --filter @a-trip/api test:e2e
```

---

## Environment variables

Compose reads these from an optional root `.env`. Local runs read
`apps/api/.env` and `apps/web/.env.local`.

### Database

| Variable | Default | Notes |
| --- | --- | --- |
| `POSTGRES_USER` | `atrip` | |
| `POSTGRES_PASSWORD` | `atrip` | |
| `POSTGRES_DB` | `atrip` | |
| `POSTGRES_PORT` | `5439` | Host port only; 5432 inside the network |
| `DATABASE_URL` | derived in compose | Set directly for non-Docker runs |

### API

| Variable | Default | Notes |
| --- | --- | --- |
| `API_PORT` | `4000` | Host port |
| `PORT` | `4000` | Port inside the container |
| `JWT_SECRET` | `change-me-in-production` | **Replace in production:** `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | `7d` | |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated browser origins |

### Object storage (MinIO / S3)

| Variable | Default | Notes |
| --- | --- | --- |
| `S3_PORT` | `9000` | Host port for the S3 API |
| `S3_CONSOLE_PORT` | `9001` | MinIO web console |
| `S3_BUCKET` | `atrip-uploads` | Created automatically with a public-read policy |
| `S3_ACCESS_KEY` | `minioadmin` | |
| `S3_SECRET_KEY` | `minioadmin` | |
| `S3_ENDPOINT` | `http://minio:9000` | Internal address the API writes through |
| `S3_PUBLIC_URL` | `http://localhost:9000` | **Host-visible** base URL baked into image URLs — the browser loads photos from here, so it must not be the internal address |

### Web

| Variable | Default | Notes |
| --- | --- | --- |
| `WEB_PORT` | `3000` | Host port |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | Read by the browser, so it must be host-reachable — not `http://api:4000`. Baked in at build time |

---

## Seed data & test accounts

After running the seed:

**Admin portal** (`/admin/login`) — from `seed-admin.ts`:

| Email | Password | Role |
| --- | --- | --- |
| `admin@test.com` | `admin#test123` | `SUPER_ADMIN` |
| `mona@atrips.com` | `mona#test123` | `RESERVATIONS` |
| `youssef@atrips.com` | `youssef#test123` | `CONTENT_EDITOR` |

`dina@atrips.com` and `ahmed@atrips.com` are seeded as invited-but-not-activated
accounts (random password) to exercise the resend-invite flow.

**Guest accounts** — from `seed.ts`, all with password `Password123!`:
`admin@atrip.test`, `sara@example.test`, `james@example.test`.

> These are development fixtures. Never seed them into a public environment.

---

## API surface

All routes sit under the global `/api` prefix; interactive docs at `/api/docs`.
Protected routes take an `Authorization: Bearer <jwt>` header.

### Public / guest

| Method | Route |
| --- | --- |
| `GET` | `/api/health` |
| `POST` | `/api/auth/register` |
| `POST` | `/api/auth/login` |
| `GET` | `/api/auth/me` |
| `GET` / `PATCH` | `/api/users/me` |
| `GET` | `/api/hotels` · `/api/hotels/cities` · `/api/hotels/:idOrSlug` |
| `GET` | `/api/hotels/:idOrSlug/room-types/:roomTypeId/availability` |
| `POST` | `/api/bookings` |
| `GET` | `/api/bookings/my` · `/api/bookings/:reference` |
| `PATCH` | `/api/bookings/:id/cancel` |

### Admin

| Method | Route |
| --- | --- |
| `GET` | `/api/admin/dashboard` |
| `GET` `POST` `PATCH` | `/api/admin/users`, `/api/admin/users/:id`, `/api/admin/users/:id/resend-invite` |
| `GET` `POST` `PATCH` `DELETE` | `/api/admin/amenities`, `/api/admin/amenities/:id` |
| `GET` `POST` `PATCH` | `/api/admin/hotels`, `/api/admin/hotels/:id` |
| `POST` `PATCH` `DELETE` | `/api/admin/hotels/:id/images`, `/images/upload`, `/images/order`, `/images/:imageId` |
| `GET` `POST` | `/api/admin/hotels/:hotelId/room-types` |
| `GET` `PATCH` `DELETE` | `/api/admin/room-types/:id` |
| `GET` `POST` `PATCH` | `/api/admin/room-types/:roomTypeId/availability`, `/bulk`, `/stop-sell` |
| `GET` | `/api/admin/bookings` |
| `PATCH` | `/api/admin/bookings/:id/confirm` · `/reject` · `/note` |

---

## Data model

Defined in [schema.prisma](apps/api/prisma/schema.prisma):

- **User** — guests and staff in one table; `Role`, `AdminRole`
  (`SUPER_ADMIN` / `RESERVATIONS` / `CONTENT_EDITOR`), `UserStatus`
- **Hotel** (`HotelStatus`) — with **HotelImage** (ordered gallery) and a
  many-to-many link to **Amenity**
- **RoomType** (`RoomTypeStatus`) — sellable units belonging to a hotel
- **RoomAvailability** — per-date inventory and pricing, driving the calendar,
  bulk edits and stop-sell
- **Booking** (`BookingStatus`) — guest reservations, referenced publicly by
  booking reference

Migrations live in [apps/api/prisma/migrations/](apps/api/prisma/migrations/). The
Prisma client is generated into `apps/api/src/generated/prisma` and compiled into
`dist/`; combined with the `pg` driver adapter, the runtime image ships no
query-engine binary.

---

## Scripts reference

Root [package.json](package.json):

| Script | Does |
| --- | --- |
| `pnpm dev` | `turbo run dev` — both apps in watch mode |
| `pnpm build` / `lint` / `typecheck` / `test` | Turborepo pipelines across the workspace |
| `pnpm docker:up` | `docker compose up -d --build` |
| `pnpm docker:down` | `docker compose down` |
| `pnpm docker:reset` | `docker compose down -v` (deletes volumes) |
| `pnpm docker:seed` | Runs the seed profile |
| `pnpm docker:logs` | Follows `api` and `web` logs |
| `pnpm db:up` / `pnpm db:down` | Postgres container only |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:seed` | `prisma/seed.ts` |
| `pnpm db:studio` | Prisma Studio |

---

## Troubleshooting

**Port already in use** — override the host port and restart:
`POSTGRES_PORT=5540`, `API_PORT=4001`, `WEB_PORT=3001` in `.env`.

**Web cannot reach the API** — `NEXT_PUBLIC_API_URL` runs in the *browser*, so it
must be a host URL (`http://localhost:4000/api`), never `http://api:4000`. It is
baked in at build time: rebuild with `docker compose up -d --build web`.

**CORS errors** — add the exact browser origin to `CORS_ORIGIN` (comma-separated)
and restart the API.

**Images do not load** — `S3_PUBLIC_URL` must be host-visible
(`http://localhost:9000`), not `http://minio:9000`. Check the bucket exists in the
MinIO console on 9001.

**Migrations failed / schema drift** — inspect the one-shot job with
`docker compose logs migrate`. For a clean slate:
`docker compose down -v && docker compose up -d --build`, then re-seed.

**API keeps restarting** — `docker compose logs api`. It waits for the Postgres
healthcheck and a successful `migrate` before it will start.
