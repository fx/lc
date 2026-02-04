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

## Code Style

- Biome: single quotes, no semicolons, 2-space indent
- JetBrains Mono font for all text
- `routeTree.gen.ts` is auto-generated (excluded from linting)

## Project Context

Web app to control LED matrix displays via the led-matrix-zmq-http-bridge API. See `docs/PROJECT.md` for task tracking and API reference.

## PR Workflow

**Before completing any PR**, invoke `/project-management` and mark relevant tasks as done in `docs/PROJECT.md`. Every PR must include PROJECT.md updates for any tasks it completes.
