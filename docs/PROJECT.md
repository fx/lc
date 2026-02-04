# LED Matrix Controller

A web application to control LED matrix displays via the led-matrix-zmq-http-bridge API.

## Tasks

- [ ] Feature: Testing Infrastructure
  - [x] Set up Vitest with React Testing Library (PR #1)
  - [x] Add basic smoke tests for ThemeProvider (PR #2)
  - [x] Configure test coverage reporting (PR #3)
  - [x] Add Settings route/component tests for CRUD flows (PR #5)
- [x] Feature: Instance Management (PR #4)
  - [x] Create instances store persisted to localStorage (id, name, endpoint URL)
  - [x] Build settings page with instance list, add/edit/delete forms
  - [x] Add instance selector dropdown in header, default to first instance
- [ ] Feature: Image URL Control
  - [ ] Create image URL input on home page with instance selector
  - [ ] Fetch image, resize to display dimensions from GET /configuration, convert to RGBA
  - [ ] Send frame via POST /frame (form-data, field: "frame"), show loading/success/error states
- [ ] Feature: Display Status
  - [ ] Show current brightness and display dimensions from API
  - [ ] Add brightness slider control via POST /brightness
  - [ ] Show connection status indicator per instance

## ZMQ Bridge API

Base URL: `http://<host>:4200`

| Endpoint | Method | Description |
|----------|--------|-------------|
| /brightness | GET | Returns `{ brightness: 0-255 }` |
| /brightness | POST | Set `{ brightness, transition? }` |
| /configuration | GET | Returns `{ width, height }` |
| /temperature | GET/POST | Color temperature 2000-6500K |
| /frame | POST | Form-data with `frame` field (raw RGBA bytes) |
| /video/queue | GET/POST/DELETE | Video queue management |
| /video/skip | POST | Skip current video |
| /video/repeat | GET/PUT | Repeat mode `{ enabled }` |
| /video/fit | GET/PUT | Fit mode: cover, contain, stretch |

## Completed

- [x] Feature: Project Bootstrap (PR #1)
  - [x] Initialize TanStack Start project with Bun, Vite 7, React 19, TanStack Router/Query
  - [x] Configure Tailwind CSS 4 with shadcn/ui (new-york style, neutral base, zero border radius)
  - [x] Set up Biome (single quotes, no semicolons, 2-space indent)
  - [x] Use JetBrains Mono font for all text, cyan primary color theme
  - [x] Create root layout with dark mode ThemeProvider
- [x] Feature: CI/CD Pipeline (PR #1)
  - [x] Add GitHub Actions workflow for Biome linting
  - [x] Add GitHub Actions workflow for Vitest tests

## References

- [led-matrix-zmq-http-bridge](https://github.com/fx/led-matrix-zmq-http-bridge/tree/feat/video-queue)
