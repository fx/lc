import { describe, expect, it } from 'vitest'
import { cn, sanitizeString, validateEndpointUrl } from './utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })
})

describe('validateEndpointUrl', () => {
  it('accepts valid http URLs', () => {
    expect(validateEndpointUrl('http://localhost:4200')).toEqual({ valid: true })
    expect(validateEndpointUrl('http://192.168.1.1:4200')).toEqual({ valid: true })
    expect(validateEndpointUrl('http://example.com/api')).toEqual({ valid: true })
  })

  it('accepts valid https URLs', () => {
    expect(validateEndpointUrl('https://example.com')).toEqual({ valid: true })
    expect(validateEndpointUrl('https://api.example.com:8080/v1')).toEqual({ valid: true })
  })

  it('rejects empty URLs', () => {
    expect(validateEndpointUrl('')).toEqual({ valid: false, error: 'URL is required' })
    expect(validateEndpointUrl('   ')).toEqual({ valid: false, error: 'URL is required' })
  })

  it('rejects invalid URL formats', () => {
    expect(validateEndpointUrl('not-a-url')).toEqual({ valid: false, error: 'Invalid URL format' })
    expect(validateEndpointUrl('://missing-protocol')).toEqual({
      valid: false,
      error: 'Invalid URL format',
    })
  })

  it('rejects javascript: protocol', () => {
    expect(validateEndpointUrl('javascript:alert(1)')).toEqual({
      valid: false,
      error: 'URL must use http:// or https://',
    })
    expect(validateEndpointUrl('JAVASCRIPT:alert(1)')).toEqual({
      valid: false,
      error: 'URL must use http:// or https://',
    })
  })

  it('rejects data: protocol', () => {
    expect(validateEndpointUrl('data:text/html,<script>alert(1)</script>')).toEqual({
      valid: false,
      error: 'URL must use http:// or https://',
    })
  })

  it('rejects file: protocol', () => {
    expect(validateEndpointUrl('file:///etc/passwd')).toEqual({
      valid: false,
      error: 'URL must use http:// or https://',
    })
  })

  it('rejects ftp: protocol', () => {
    expect(validateEndpointUrl('ftp://ftp.example.com')).toEqual({
      valid: false,
      error: 'URL must use http:// or https://',
    })
  })

  it('trims whitespace from URLs', () => {
    expect(validateEndpointUrl('  http://localhost:4200  ')).toEqual({ valid: true })
  })
})

describe('sanitizeString', () => {
  it('returns normal strings unchanged', () => {
    expect(sanitizeString('Hello World')).toBe('Hello World')
    expect(sanitizeString('Test 123')).toBe('Test 123')
  })

  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello')
  })

  it('removes null bytes', () => {
    expect(sanitizeString('hello\x00world')).toBe('helloworld')
  })

  it('removes control characters', () => {
    expect(sanitizeString('hello\x01\x02\x03world')).toBe('helloworld')
    expect(sanitizeString('test\x7Fvalue')).toBe('testvalue')
  })

  it('returns empty string for non-string input', () => {
    // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input
    expect(sanitizeString(null as any)).toBe('')
    // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input
    expect(sanitizeString(undefined as any)).toBe('')
    // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input
    expect(sanitizeString(123 as any)).toBe('')
  })

  it('preserves newlines and tabs', () => {
    // Note: trim() removes leading/trailing whitespace but internal newlines/tabs are preserved
    expect(sanitizeString('hello\nworld')).toBe('hello\nworld')
    expect(sanitizeString('hello\tworld')).toBe('hello\tworld')
  })
})
