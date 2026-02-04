import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as apiModule from '@/lib/api'
import { useInstancesStore } from '@/stores/instances'
import { DisplayStatus } from './display-status'

// Mock ResizeObserver for Radix UI Slider component
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock

// Mock the server functions
vi.mock('@/lib/api', () => ({
  getBrightness: vi.fn(),
  setBrightness: vi.fn(),
  getConfiguration: vi.fn(),
}))

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

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('DisplayStatus', () => {
  beforeEach(() => {
    localStorageMock.clear()
    useInstancesStore.setState({ instances: [], selectedId: null })
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders card with title and connection indicator', () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Test Display', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      vi.mocked(apiModule.getBrightness).mockImplementation(() => new Promise(() => {}))
      vi.mocked(apiModule.getConfiguration).mockImplementation(() => new Promise(() => {}))

      render(<DisplayStatus />, { wrapper: createWrapper() })

      expect(screen.getByText('Display Status')).toBeDefined()
      // Yellow indicator shown during loading
      expect(document.querySelector('.bg-yellow-500')).toBeTruthy()
    })

    it('shows dimensions placeholder when no instance selected', () => {
      useInstancesStore.setState({ instances: [], selectedId: null })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      expect(screen.getByText('Display Dimensions')).toBeDefined()
      expect(screen.getByText('---')).toBeDefined()
    })

    it('shows dimensions when configuration is loaded', async () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      vi.mocked(apiModule.getBrightness).mockResolvedValue({ brightness: 128 })
      vi.mocked(apiModule.getConfiguration).mockResolvedValue({ width: 64, height: 32 })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('64 x 32 pixels')).toBeDefined()
      })
    })
  })

  describe('connection indicator', () => {
    it('shows yellow indicator when loading', () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      vi.mocked(apiModule.getBrightness).mockImplementation(() => new Promise(() => {}))
      vi.mocked(apiModule.getConfiguration).mockImplementation(() => new Promise(() => {}))

      render(<DisplayStatus />, { wrapper: createWrapper() })

      const indicator = document.querySelector('.bg-yellow-500')
      expect(indicator).toBeTruthy()
      expect(indicator?.getAttribute('title')).toBe('Checking connection...')
    })

    it('shows green indicator when connected', async () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      vi.mocked(apiModule.getBrightness).mockResolvedValue({ brightness: 128 })
      vi.mocked(apiModule.getConfiguration).mockResolvedValue({ width: 64, height: 32 })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      await waitFor(() => {
        const indicator = document.querySelector('.bg-green-500')
        expect(indicator).toBeTruthy()
        expect(indicator?.getAttribute('title')).toBe('Connected')
      })
    })

    it('shows red indicator when disconnected', async () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      vi.mocked(apiModule.getBrightness).mockRejectedValue(new Error('Connection refused'))
      vi.mocked(apiModule.getConfiguration).mockRejectedValue(new Error('Connection refused'))

      render(<DisplayStatus />, { wrapper: createWrapper() })

      await waitFor(() => {
        const indicator = document.querySelector('.bg-red-500')
        expect(indicator).toBeTruthy()
        expect(indicator?.getAttribute('title')).toBe('Disconnected')
      })
    })
  })

  describe('brightness control', () => {
    it('displays current brightness value', async () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      vi.mocked(apiModule.getBrightness).mockResolvedValue({ brightness: 200 })
      vi.mocked(apiModule.getConfiguration).mockResolvedValue({ width: 64, height: 32 })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('200')).toBeDefined()
      })
    })

    it('disables slider when no instance selected', () => {
      useInstancesStore.setState({ instances: [], selectedId: null })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      const slider = document.querySelector('[data-disabled]')
      expect(slider).toBeTruthy()
    })

    it('disables slider when loading', () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      vi.mocked(apiModule.getBrightness).mockImplementation(() => new Promise(() => {}))
      vi.mocked(apiModule.getConfiguration).mockImplementation(() => new Promise(() => {}))

      render(<DisplayStatus />, { wrapper: createWrapper() })

      const slider = document.querySelector('[data-disabled]')
      expect(slider).toBeTruthy()
    })

    it('updates displayed value when slider is interacted with', async () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      vi.mocked(apiModule.getBrightness).mockResolvedValue({ brightness: 128 })
      vi.mocked(apiModule.getConfiguration).mockResolvedValue({ width: 64, height: 32 })
      vi.mocked(apiModule.setBrightness).mockResolvedValue(undefined)

      render(<DisplayStatus />, { wrapper: createWrapper() })

      // Wait for initial load and verify initial value
      await waitFor(() => {
        expect(screen.getByText('128')).toBeDefined()
      })

      // Find and interact with slider thumb
      const sliderThumb = document.querySelector('[role="slider"]')
      expect(sliderThumb).toBeTruthy()

      // Simulate slider change - the keyDown triggers onValueChange in Radix Slider
      if (sliderThumb) {
        fireEvent.keyDown(sliderThumb, { key: 'ArrowRight' })
      }

      // Verify that the displayed value changed (local state update)
      await waitFor(() => {
        expect(screen.getByText('129')).toBeDefined()
      })
    })
  })

  describe('error handling', () => {
    it('shows error message when brightness fetch fails', async () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      vi.mocked(apiModule.getBrightness).mockRejectedValue(
        new Error('Failed to get brightness: timeout'),
      )
      vi.mocked(apiModule.getConfiguration).mockResolvedValue({ width: 64, height: 32 })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      await waitFor(
        () => {
          expect(screen.getByText('Failed to get brightness: timeout')).toBeDefined()
        },
        { timeout: 2000 },
      )
    })

    it('shows generic error message for non-Error exceptions', async () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      vi.mocked(apiModule.getBrightness).mockRejectedValue('string error')
      vi.mocked(apiModule.getConfiguration).mockResolvedValue({ width: 64, height: 32 })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      await waitFor(
        () => {
          expect(screen.getByText('Failed to connect to display')).toBeDefined()
        },
        { timeout: 2000 },
      )
    })
  })

  describe('API calls', () => {
    it('calls getBrightness with correct endpoint URL', async () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      vi.mocked(apiModule.getBrightness).mockResolvedValue({ brightness: 128 })
      vi.mocked(apiModule.getConfiguration).mockResolvedValue({ width: 64, height: 32 })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      await waitFor(
        () => {
          expect(apiModule.getBrightness).toHaveBeenCalledWith({
            data: { endpointUrl: 'http://localhost:4200' },
          })
        },
        { timeout: 2000 },
      )
    })

    it('calls getConfiguration with correct endpoint URL', async () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      vi.mocked(apiModule.getBrightness).mockResolvedValue({ brightness: 128 })
      vi.mocked(apiModule.getConfiguration).mockResolvedValue({ width: 64, height: 32 })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      await waitFor(
        () => {
          expect(apiModule.getConfiguration).toHaveBeenCalledWith({
            data: { endpointUrl: 'http://localhost:4200' },
          })
        },
        { timeout: 2000 },
      )
    })

    it('does not fetch when no instance is selected', () => {
      useInstancesStore.setState({ instances: [], selectedId: null })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      expect(apiModule.getBrightness).not.toHaveBeenCalled()
      expect(apiModule.getConfiguration).not.toHaveBeenCalled()
    })
  })
})
