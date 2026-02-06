# LED Matrix Controller

A web application to control LED matrix displays via the led-matrix-zmq-http-bridge API.

## Tasks

- [x] Feature: Color Temperature Control (PR #16)
  - [x] Add `getTemperature` and `setTemperature` server functions in `src/lib/api.ts`
  - [x] Add temperature slider (2000-6500K, step 100) to DisplayStatus component
    - [x] Debounced mutations, optimistic updates, 12s polling
  - [x] Add comprehensive tests for temperature control

- [x] Feature: Video Queue API Integration (PR #14)
  - [x] Add video queue server functions in `src/lib/video-api.ts`
    - [x] getVideoQueue: fetch queue state (queue, current, repeat, fit)
    - [x] addVideoToQueue: POST video URL (YouTube/direct)
    - [x] clearVideoQueue: DELETE queue
    - [x] skipVideo: POST skip current
    - [x] setRepeatMode: PUT repeat enabled/disabled
    - [x] setFitMode: PUT fit mode (cover/contain/stretch)
  - [x] Add React hooks in `src/hooks/use-video-queue.ts`
    - [x] useVideoQueue: query for queue state with polling
    - [x] useAddVideo, useClearQueue, useSkipVideo mutations
    - [x] useSetRepeatMode, useSetFitMode toggle mutations
- [x] Feature: Video Queue UI (PR #15)
  - [x] Build VideoUrlForm component
    - [x] URL input with YouTube/direct video validation
    - [x] Submit button with loading state
    - [x] Success/error feedback
  - [x] Build VideoQueuePanel component
    - [x] Show current playing video (if any)
    - [x] List queued videos with status badges
    - [x] Clear queue button
    - [x] Skip button (when video playing)
  - [x] Build VideoControls component
    - [x] Repeat mode toggle
    - [x] Fit mode selector (cover/contain/stretch)
  - [x] Add video section to home page
    - [x] Collapsible section like image gallery
    - [x] Include VideoUrlForm, VideoQueuePanel, VideoControls

- [x] Feature: PostgreSQL + Drizzle Backend (PR #9)
  - [x] Add PostgreSQL with Docker Compose
    - [x] Create docker-compose.yml with PostgreSQL 16
    - [x] Add .env.example with DATABASE_URL
    - [x] Update .gitignore for .env
  - [x] Set up Drizzle ORM
    - [x] Install drizzle-orm, pg, drizzle-kit
    - [x] Create drizzle.config.ts
    - [x] Add db:push, db:generate, db:migrate, db:studio scripts
  - [x] Create instances schema and API
    - [x] Define instances table schema (id, name, endpoint, createdAt, updatedAt)
    - [x] Create db connection module with connection pooling
    - [x] Add server functions: getInstances, createInstance, updateInstance, deleteInstance
  - [x] Migrate frontend from localStorage to API
    - [x] Update instances store to use TanStack Query with server functions
    - [x] Remove localStorage persistence logic
    - [x] Add loading/error states for API operations
- [x] Feature: Database Improvements (PR #10)
  - [x] Add index on instances.createdAt for query performance
  - [x] Add database connection reconnection logic
  - [x] Add try-catch error handling in server functions with user-friendly messages
  - [x] Consider typed errors for HTTP-aware status codes (404 Not Found)
  - [x] Add TanStack Query optimistic updates for mutations
  - [x] Generate and commit initial Drizzle migrations for production
- [x] Feature: Image Storage (PR #11)
  - [x] Create images table schema
    - [x] Fields: id, contentHash (SHA-256), originalUrl (nullable), mimeType, data (bytea), createdAt
    - [x] Unique constraint on contentHash for deduplication
  - [x] Add image storage server functions
    - [x] storeImage: hash content, check for duplicate, store if new, return image id
    - [x] getImage: retrieve by id
    - [x] listImages: paginated list with metadata (no data blob)
  - [x] Integrate with image URL flow
    - [x] After fetching URL, store original image before transformation
    - [x] Track sourceUrl for URL-fetched images
- [x] Feature: Image Upload (PR #12)
  - [x] Add file upload server function
    - [x] Accept image file, validate type/size
    - [x] Hash and dedupe same as URL flow
  - [x] Add upload UI to home page
    - [x] File input or drag-and-drop zone
    - [x] Show upload progress and success/error states
- [x] Feature: Image Gallery (PR #13)
  - [x] Generate and store thumbnails
    - [x] Add thumbnail column to images table (small JPEG blob)
    - [x] Generate thumbnail on image store (e.g., 64x64)
  - [x] Build gallery component
    - [x] Grid of thumbnail images with lazy loading
    - [x] Click to select and send to display
    - [x] Show image metadata (source URL if available, date added)
  - [x] Add gallery to home page
    - [x] Collapsible section showing recent images
    - [x] "Send to display" action on each image

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

- [x] Feature: Testing Infrastructure (PR #1, #2, #3, #5)
  - [x] Set up Vitest with React Testing Library (PR #1)
  - [x] Add basic smoke tests for ThemeProvider (PR #2)
  - [x] Configure test coverage reporting (PR #3)
  - [x] Add Settings route/component tests for CRUD flows (PR #5)
- [x] Feature: Instance Management (PR #4)
  - [x] Create instances store persisted to localStorage (id, name, endpoint URL)
  - [x] Build settings page with instance list, add/edit/delete forms
  - [x] Add instance selector dropdown in header, default to first instance
- [x] Feature: Image URL Control (PR #6)
  - [x] Create image URL input on home page with instance selector
  - [x] Fetch image, resize to display dimensions from GET /configuration, convert to RGBA
  - [x] Send frame via POST /frame (form-data, field: "frame"), show loading/success/error states
- [x] Feature: Image URL Control Hardening (PR #7)
  - [x] Add fetch timeout with AbortController to prevent hanging requests
  - [x] Add image size limit check (Content-Length header) before download
  - [x] Add display dimension sanity check (warn if > 256x256)
- [x] Feature: Display Status (PR #8)
  - [x] Show current brightness and display dimensions from API
  - [x] Add brightness slider control via POST /brightness
  - [x] Show connection status indicator per instance
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
