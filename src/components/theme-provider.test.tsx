import { act, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, useTheme } from './theme-provider'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

// Mock matchMedia
const createMatchMediaMock = (matches: boolean) => {
  const listeners: Array<(e: MediaQueryListEvent) => void> = []
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((_event: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb)
    }),
    removeEventListener: vi.fn((_event: string, cb: (e: MediaQueryListEvent) => void) => {
      const index = listeners.indexOf(cb)
      if (index > -1) listeners.splice(index, 1)
    }),
    dispatchEvent: vi.fn(),
    _listeners: listeners,
    _triggerChange: (newMatches: boolean) => {
      for (const cb of listeners) {
        cb({ matches: newMatches } as MediaQueryListEvent)
      }
    },
  }))
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    Object.defineProperty(window, 'matchMedia', {
      value: createMatchMediaMock(false),
      writable: true,
    })
    localStorageMock.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders children correctly', () => {
    render(
      <ThemeProvider>
        <div data-testid="child">Hello</div>
      </ThemeProvider>,
    )

    expect(screen.getByTestId('child')).toBeDefined()
    expect(screen.getByText('Hello')).toBeDefined()
  })

  it('provides default theme values (system theme with light preference)', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    })

    expect(result.current.theme).toBe('system')
    expect(result.current.resolvedTheme).toBe('light')
    expect(typeof result.current.setTheme).toBe('function')
  })

  it('useTheme hook returns expected values', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    })

    expect(result.current).toHaveProperty('theme')
    expect(result.current).toHaveProperty('setTheme')
    expect(result.current).toHaveProperty('resolvedTheme')
  })

  it('throws error when useTheme is used outside provider', () => {
    // Suppress console.error for this test since we expect an error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme must be used within a ThemeProvider',
    )

    consoleSpy.mockRestore()
  })

  it('setTheme switches theme correctly', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    })

    // Initial state
    expect(result.current.theme).toBe('system')
    expect(result.current.resolvedTheme).toBe('light')

    // Switch to dark theme
    act(() => {
      result.current.setTheme('dark')
    })

    expect(result.current.theme).toBe('dark')
    expect(result.current.resolvedTheme).toBe('dark')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    // Switch to light theme
    act(() => {
      result.current.setTheme('light')
    })

    expect(result.current.theme).toBe('light')
    expect(result.current.resolvedTheme).toBe('light')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
