import { createContext, useContext, useEffect, useRef, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'theme'

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Use stable defaults for SSR, hydrate on mount
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const mounted = useRef(false)

  // Hydrate theme from localStorage and system preference on mount (client only)
  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    const stored = localStorage.getItem(STORAGE_KEY)
    const storedTheme: Theme =
      stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'

    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const resolved = storedTheme === 'system' ? (systemDark ? 'dark' : 'light') : storedTheme

    setThemeState(storedTheme)
    setResolvedTheme(resolved)
    applyThemeClass(resolved)
  }, [])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const resolved = e.matches ? 'dark' : 'light'
        setResolvedTheme(resolved)
        applyThemeClass(resolved)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const resolved = newTheme === 'system' ? (systemDark ? 'dark' : 'light') : newTheme

    setThemeState(newTheme)
    setResolvedTheme(resolved)
    localStorage.setItem(STORAGE_KEY, newTheme)
    applyThemeClass(resolved)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

function applyThemeClass(resolved: 'light' | 'dark') {
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
