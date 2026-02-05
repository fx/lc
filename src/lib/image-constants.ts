// Shared constants for image handling (safe to import from client code)

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

// Maximum file size for direct uploads (10MB)
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024
export const MAX_UPLOAD_SIZE_MB = 10
