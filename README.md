# Celtivo

Group travel, minus the admin — [celtivo.com](https://celtivo.com).

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| Script          | What it does                                        |
| --------------- | --------------------------------------------------- |
| `pnpm dev`      | Dev server (Turbopack)                              |
| `pnpm build`    | Production build                                    |
| `pnpm check`    | Typecheck + lint + format check + unit tests        |
| `pnpm test`     | Vitest in watch mode                                |
| `pnpm test:e2e` | Playwright, desktop + mobile (builds the app first) |
| `pnpm format`   | Prettier (also sorts Tailwind classes)              |

## Docker

The image is a multi-stage build on `node:24-alpine` using Next's `standalone` output, so
the final image carries only the traced runtime files and runs as a non-root user.

```bash
docker compose up --build        # http://localhost:3000
# or
docker build -t celtivo .
docker run --rm -p 3000:3000 celtivo
```

`GET /api/health` returns `{"status":"ok"}` and backs the image's `HEALTHCHECK`. Set
`PORT` to change the port the server listens on inside the container.

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
- **Vitest + Testing Library** for unit tests, **Playwright** for end-to-end.

## Layout

```
src/
  app/                 routes only — keep these thin
    (marketing)/       public pages (landing)
    trips/new/         create-trip screen
    api/trips/         route handlers
  components/
    ui/                design-system primitives (Button, Input, Tag, Field, …)
    brand/             Logo
  features/<feature>/  everything for one product area: components, schema,
                       api hooks, stores, tests
  lib/                 framework-agnostic helpers
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

## Not built yet

- Backend and auth — `POST /api/trips` validates and echoes back; swap in a database.
- `/sign-in` and `/support` (currently fall through to the 404 page).
