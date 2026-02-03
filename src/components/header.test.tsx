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
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useInstancesStore } from '@/stores/instances'
import { Header } from './header'
import { ThemeProvider } from './theme-provider'

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
  const queryClient = new QueryClient()
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
    useInstancesStore.setState({ instances: [], selectedId: null })
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

  it('shows configure instance link when no instances', async () => {
    renderWithProviders()
    await waitFor(() => {
      // Use getAllByText since the router may render multiple times during hydration
      const links = screen.getAllByText('Configure instance')
      expect(links.length).toBeGreaterThan(0)
    })
  })

  it('shows instance selector when instances exist', async () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test Instance', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })
    renderWithProviders()
    await waitFor(() => {
      // Use getAllByText since the router may render multiple times during hydration
      const instances = screen.getAllByText('Test Instance')
      expect(instances.length).toBeGreaterThan(0)
    })
  })
})
