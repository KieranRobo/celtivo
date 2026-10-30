# Celtivo

Group travel, minus the admin — [celtivo.com](https://celtivo.com).

## Getting started

```bash
pnpm install
cp .env.example .env.local
pnpm db:up        # local Postgres in Docker on :5432
pnpm dev          # http://localhost:3000 — applies pending migrations on start
```

| Script                | What it does                                         |
| --------------------- | ---------------------------------------------------- |
| `pnpm dev`            | Dev server (Turbopack)                               |
| `pnpm build`          | Production build                                     |
| `pnpm check`          | Typecheck + lint + format check + unit tests         |
| `pnpm test`           | Vitest in watch mode                                 |
| `pnpm test:e2e`       | Playwright, desktop + mobile (builds the app first)  |
| `pnpm format`         | Prettier (also sorts Tailwind classes)               |
| `pnpm db:up`          | Start the local Postgres (`docker compose`)          |
| `pnpm db:generate`    | Write a SQL migration from changes to the schema     |
| `pnpm db:migrate`     | Apply pending migrations to `DATABASE_URL`           |
| `pnpm db:studio`      | Browse the database in Drizzle Studio                |
| `pnpm inbound:send`   | Run an `.eml` through the inbound pipeline locally   |
| `pnpm inbound:deploy` | Deploy the inbound Email Worker to Cloudflare        |
| `pnpm extract`        | Run booking extraction on `.eml` files (no database) |

## Docker

The image is a multi-stage build on `node:24-alpine` using Next's `standalone` output, so
the final image carries only the traced runtime files and runs as a non-root user.

```bash
docker compose up --build        # http://localhost:3000
# or
docker build -t celtivo .
docker run --rm -p 3000:3000 celtivo
```

`docker compose up` also starts a local Postgres and points the app at it.

`GET /api/health` returns `{"status":"ok"}` and backs the image's `HEALTHCHECK`. Set
`PORT` to change the port the server listens on inside the container.

## Database

**Postgres** via **Drizzle ORM** (`pg` driver). Production uses the Postgres service on
Dokploy: set the app's `DATABASE_URL` to that service's _internal_ connection URL, so the
database never needs a public port.

Schema changes are migration files, generated and committed:

1. Edit the tables in `src/db/schema.ts` (camelCase in TypeScript, snake_case in SQL).
2. `pnpm db:generate --name <what_changed>` writes `drizzle/NNNN_<what_changed>.sql`.
   Read it — that SQL is exactly what will run in production.
3. Commit the SQL and `drizzle/meta/` together with the schema change.

The server applies pending migrations at startup (`src/instrumentation.ts`), behind a
Postgres advisory lock so instances deploying together don't race, and refuses to serve
if `DATABASE_URL` is missing or a migration fails. Never edit a migration that has
already shipped — add a new one.

## Inbound email

Members forward bookings to their trip's address, `<name-slug>-<token>@celtivo.space`.
Cloudflare Email Routing's catch-all on `celtivo.space` hands every message to the Email
Worker in `workers/inbound-email/`, which saves the raw message to the `celtivo-inbound` R2
bucket (EU jurisdiction) and then calls `POST /api/inbound/email`. The design and its
reasoning are in [email-ingestion.md](./docs/product/email-ingestion.md).

**Locally**, with `INBOUND_EMAIL_SECRET` in `.env.local` and `pnpm dev` running:

```bash
pnpm inbound:send path/to/booking.eml ski-trip-2027-7hd2kq9x@celtivo.space
```

The trip address is on the trip dashboard. The raw message is written to `.inbound/`
(gitignored) instead of R2.

**Deploying the Worker** (once, then again whenever `workers/inbound-email/` changes):

1. `pnpm wrangler login`
2. `pnpm inbound:deploy`
3. `pnpm wrangler secret put INBOUND_EMAIL_SECRET -c workers/inbound-email/wrangler.jsonc`
   — the same value as `INBOUND_EMAIL_SECRET` in the app's Dokploy environment.
4. In Cloudflare: celtivo.space → Email Routing → Routing rules → Catch-all → action **Send to
   a Worker** → `celtivo-inbound-email`.

The Worker also runs every 15 minutes to retry any message the app didn't acknowledge (it
leaves an `unacked/<key>` marker in the bucket). `pnpm wrangler tail celtivo-inbound-email`
streams its logs.

## Booking extraction

A job inside the app reads each forwarded email and saves the bookings in it (flights so far)
as "pending review". It starts with the server when `ANTHROPIC_API_KEY` is set; the endpoint
wakes it through Postgres `NOTIFY`, and it also polls every minute. Design and the
add-a-booking-kind guide: [email-ingestion.md](./docs/product/email-ingestion.md#extract-phase-2b).

**Locally** it reads raw mail from `.inbound/` (where `pnpm inbound:send` writes). To try the
extraction alone on real emails, without a database:

```bash
pnpm extract fixtures/emails/*.eml     # fixtures/emails/ is gitignored: real emails hold personal data
EXTRACTION_MODEL=claude-sonnet-5-5 pnpm extract fixtures/emails/ba.eml   # compare models
```

**In production** the app reads raw mail from R2. Set these in Dokploy alongside
`ANTHROPIC_API_KEY`:

1. In Cloudflare: **R2 → Manage API tokens → Create API token**, permission **Object Read
   only**, applied to the `celtivo-inbound` bucket only.
2. `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` from the token.
3. `R2_ENDPOINT=https://<account-id>.eu.r2.cloudflarestorage.com` (the EU endpoint, because the
   bucket is in the EU jurisdiction; the account ID is on the R2 overview page).

Optional: `EXTRACTION_MODEL` (default `claude-haiku-5-5`), `EXTRACTION_DAILY_AI_CAP` (default
50 Claude calls per trip per day), `EXTRACTION_JOB=off`. Each email's outcome, error and token
counts are on its `inbound_emails` row; the server log has a line per email.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript, Cache Components) — read the
  bundled docs in `node_modules/next/dist/docs/` before relying on older patterns.
- **Tailwind CSS v4** with the Celtivo tokens in `src/app/globals.css`.
- **shadcn/ui conventions** on **Radix** primitives (`radix-ui`), `cva` for variants,
  `cn()` in `src/lib/utils.ts`. `pnpm dlx shadcn@latest add <component>` drops new
  components into `src/components/ui`, already themed.
- **Phosphor icons** (`@phosphor-icons/react`), as the design system specifies.
- **TanStack Query** for server state, **Zustand** for small shared client state.
- **React Hook Form + Zod** for forms; schemas are shared with API route handlers.
- **Drizzle ORM + drizzle-kit** on Postgres — see [Database](#database).
- **Vitest + Testing Library** for unit tests, **Playwright** for end-to-end.

## Layout

```
src/
  app/                 routes only — keep these thin
    (marketing)/       public pages (landing)
    trips/new/         create-trip screen
    api/trips/         route handlers
  db/                  Drizzle client, table definitions, migration runner
  components/
    ui/                design-system primitives (Button, Input, Tag, Field, …)
    brand/             Logo
  features/<feature>/  everything for one product area: components, schema,
                       api hooks, stores, tests
  lib/                 framework-agnostic helpers
drizzle/               generated SQL migrations (committed)
workers/inbound-email/ Cloudflare Email Worker for trip mail (deployed separately)
scripts/               one-off and dev scripts, run with plain `node`
e2e/                   Playwright specs
```

New product areas go in `src/features/<name>/`; routes in `src/app/` import from there.

## Design

The look comes from **Celtivo Landing Light** in Claude Design, built on the
**Nocturne** design system's tonal ramps. Rules worth keeping:

- Take every colour from the ramps (`neutral-*`, `accent-*`, `accent-2-*`, `section*`)
  — never a raw hex. On this light ground use 100–300 for grounds and tints, 600 as the
  accent base, 700–900 for text.
- `bg-section` (deep indigo) is for large "presence" fills only.
- Headings stay at weight 500; hierarchy is size and space.
- Freestanding dividers use `rule-fade`; page width is `container-page` (1240px).

## Product and roadmap

Where Celtivo is going and the order it gets built in: [docs/product/](./docs/product/) —
start with [direction.md](./docs/product/direction.md) and
[roadmap.md](./docs/product/roadmap.md).

## Not built yet

- Auth — anyone can create a trip, and trips aren't tied to a user yet. Until then, the
  extraction job reads mail from any sender who has the trip's address.
- `/sign-in` and `/support` (currently fall through to the 404 page).
