# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev        # Start dev server (Vite)
bun run build      # Production build
bun run check      # Lint + format check (Biome)
bun run check:fix  # Lint + format with auto-fix
bun run test       # Run Vitest tests
```

## Docker Setup

Docker is available but the daemon may not be running. Start it with:

```bash
sudo service docker start
sudo docker compose up -d   # Start PostgreSQL
bun run db:push             # Push schema to database
```

## Architecture

**Stack**: TanStack Start (React 19, Vite 7, TanStack Router/Query), Tailwind CSS 4, Bun runtime

**Routing**: File-based routing in `src/routes/`. Router factory in `src/router.tsx` creates fresh QueryClient per SSR request.

**Root layout**: `src/routes/__root.tsx` wraps app with ThemeProvider → QueryClientProvider.

**UI components**: shadcn/ui (new-york style) in `src/components/ui/`. Add components via `bunx shadcn@latest add <component>`.

**Styling**: Tailwind CSS 4 with CSS-first config (no tailwind.config.js). Theme variables in `src/styles/globals.css` using OKLCH colors. Zero border radius enforced. Cyan primary color.

**Path aliases**: `@/*` → `./src/*`

## Client/Server Separation

TanStack Start uses Vite which bundles client and server code separately. **Never import server-only modules in client code.**

**Server-only modules** (will cause `ReferenceError: Buffer is not defined` or similar if imported on client):
- `src/server/*` (database, drizzle, postgres)
- `src/db/*` (schema, connection)
- Any module using Node.js APIs (`Buffer`, `fs`, `crypto`, etc.)

**NEVER use Node.js APIs in client code:** `Buffer`, `crypto` (Node module), `fs`, `path`, `process`, `child_process`, `os`, `stream`, `util.promisify`, `__dirname`, `__filename`. These do not exist in the browser and will cause runtime errors.

**Browser `crypto` is limited:** `crypto.randomUUID()` requires HTTPS (secure context) and is unavailable during SSR. For temporary/optimistic IDs, use `Math.random().toString(36).substring(2) + Date.now().toString(36)` instead.

**Import rules:**
- Client code (`src/hooks/`, `src/components/`, `src/routes/`) may import server functions from `src/server/*.ts` (TanStack Start handles RPC)
- Client code must NEVER import from `src/db/*` directly
- Client code must NEVER import modules that transitively pull in Node.js APIs

**Type-only imports are safe:** `import type { Instance } from '@/db/schema'` is fine — types are erased at compile time and do not affect the client bundle.

**Safe patterns:**
- Server functions in `src/server/*.ts` use `createServerFn` from `@tanstack/react-start`
- Client components import server functions directly (TanStack Start handles the RPC boundary)
- Never re-export server internals from server function files

**Example error:** `postgres-bytea` uses `Buffer` → imported on client → crashes. Fix: ensure the import chain doesn't pull database code into client bundle.

## Code Style

- Biome: single quotes, no semicolons, 2-space indent
- JetBrains Mono font for all text
- `routeTree.gen.ts` is auto-generated (excluded from linting)

## Project Context

Web app to control LED matrix displays via the led-matrix-zmq-http-bridge API. See `docs/PROJECT.md` for task tracking and API reference.

## PR Workflow

**Before completing any PR**, invoke `/project-management` and mark relevant tasks as done in `docs/PROJECT.md`. Every PR must include PROJECT.md updates for any tasks it completes.
