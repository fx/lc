import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validates that a URL uses only safe protocols (http or https).
 * Rejects javascript:, data:, and other dangerous protocols.
 * @returns An object with `valid` boolean and optional `error` message
 */
export function validateEndpointUrl(url: string): { valid: boolean; error?: string } {
  const trimmed = url.trim()

  if (!trimmed) {
    return { valid: false, error: 'URL is required' }
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }

  const protocol = parsed.protocol.toLowerCase()
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { valid: false, error: 'URL must use http:// or https://' }
  }

  return { valid: true }
}

/**
 * Sanitizes a string for safe storage. Removes control characters and
 * ensures the value is a safe string.
 */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') {
    return ''
  }
  // Remove control characters (except newline, tab) and null bytes
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional removal of control chars for sanitization
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
}
