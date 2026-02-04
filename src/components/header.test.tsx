import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { useInstancesStore } from '@/stores/instances'
import { Header } from './header'
import { ThemeProvider } from './theme-provider'

// Mock the hooks module
vi.mock('@/hooks/use-instances', () => ({
  useInstances: vi.fn(),
}))

import { useInstances } from '@/hooks/use-instances'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

// Mock matchMedia
const createMatchMediaMock = (matches: boolean) => {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

Object.defineProperty(window, 'localStorage', { value: localStorageMock })
Object.defineProperty(window, 'matchMedia', {
  value: createMatchMediaMock(false),
  writable: true,
})

function createTestRouter() {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <Header />
        <Outlet />
      </>
    ),
  })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>Home</div>,
  })

  const settingsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/settings',
    component: () => <div>Settings</div>,
  })

  const routeTree = rootRoute.addChildren([indexRoute, settingsRoute])
  const memoryHistory = createMemoryHistory({ initialEntries: ['/'] })

  return createRouter({
    routeTree,
    history: memoryHistory,
  })
}

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  const router = createTestRouter()
  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

describe('Header', () => {
  beforeEach(() => {
    localStorageMock.clear()
    useInstancesStore.setState({ selectedId: null })
    ;(useInstances as Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })
  })

  it('renders the title', async () => {
    renderWithProviders()
    await waitFor(() => {
      expect(screen.getByText('LED Matrix Controller')).toBeDefined()
    })
  })

  it('renders theme toggle', async () => {
    renderWithProviders()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /toggle theme/i })).toBeDefined()
    })
  })

  it('shows loading state while fetching instances', async () => {
    ;(useInstances as Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    renderWithProviders()
    await waitFor(() => {
      const loadingElements = screen.getAllByText('Loading...')
      expect(loadingElements.length).toBeGreaterThan(0)
    })
  })

  it('shows configure instance link when no instances', async () => {
    renderWithProviders()
    await waitFor(() => {
      const links = screen.getAllByText('Configure instance')
      expect(links.length).toBeGreaterThan(0)
    })
  })

  it('shows instance selector when instances exist', async () => {
    ;(useInstances as Mock).mockReturnValue({
      data: [
        {
          id: '1',
          name: 'Test Instance',
          endpointUrl: 'http://localhost:4200',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    renderWithProviders()
    await waitFor(() => {
      const instances = screen.getAllByText('Test Instance')
      expect(instances.length).toBeGreaterThan(0)
    })
  })
})
