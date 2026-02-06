import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
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
  getTemperature: vi.fn(),
  setTemperature: vi.fn(),
  getConfiguration: vi.fn(),
}))

// Mock useInstances hook
vi.mock('@/hooks/use-instances', () => ({
  useInstances: vi.fn(),
}))

import { useInstances } from '@/hooks/use-instances'

const mockInstances = [
  {
    id: '1',
    name: 'Test Display',
    endpointUrl: 'http://localhost:4200',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

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
    useInstancesStore.setState({ selectedId: null })
    vi.clearAllMocks()
    ;(useInstances as Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders card with title and connection indicator', () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      vi.mocked(apiModule.getBrightness).mockImplementation(() => new Promise(() => {}))
      vi.mocked(apiModule.getTemperature).mockImplementation(() => new Promise(() => {}))
      vi.mocked(apiModule.getConfiguration).mockImplementation(() => new Promise(() => {}))

      render(<DisplayStatus />, { wrapper: createWrapper() })

      expect(screen.getByText('Display Status')).toBeDefined()
      // Yellow indicator shown during loading
      expect(document.querySelector('.bg-yellow-500')).toBeTruthy()
    })

    it('shows placeholders when no instance selected', () => {
      ;(useInstances as Mock).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: null })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      expect(screen.getByText('Display Dimensions')).toBeDefined()
      expect(screen.getByText('Brightness')).toBeDefined()
      expect(screen.getByText('Color Temperature')).toBeDefined()
      // Dimensions, brightness, and temperature show '---' when no data
      expect(screen.getAllByText('---')).toHaveLength(3)
    })

    it('shows dimensions when configuration is loaded', async () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      vi.mocked(apiModule.getBrightness).mockResolvedValue({ brightness: 128 })
      vi.mocked(apiModule.getTemperature).mockResolvedValue({ temperature: 4000 })
      vi.mocked(apiModule.getConfiguration).mockResolvedValue({ width: 64, height: 32 })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('64 x 32 pixels')).toBeDefined()
      })
    })
  })

  describe('connection indicator', () => {
    it('shows yellow indicator when loading', () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      vi.mocked(apiModule.getBrightness).mockImplementation(() => new Promise(() => {}))
      vi.mocked(apiModule.getTemperature).mockImplementation(() => new Promise(() => {}))
      vi.mocked(apiModule.getConfiguration).mockImplementation(() => new Promise(() => {}))

      render(<DisplayStatus />, { wrapper: createWrapper() })

      const indicator = document.querySelector('.bg-yellow-500')
      expect(indicator).toBeTruthy()
      expect(indicator?.getAttribute('title')).toBe('Checking connection...')
    })

    it('shows green indicator when connected', async () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      vi.mocked(apiModule.getBrightness).mockResolvedValue({ brightness: 128 })
      vi.mocked(apiModule.getTemperature).mockResolvedValue({ temperature: 4000 })
      vi.mocked(apiModule.getConfiguration).mockResolvedValue({ width: 64, height: 32 })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      await waitFor(() => {
        const indicator = document.querySelector('.bg-green-500')
        expect(indicator).toBeTruthy()
        expect(indicator?.getAttribute('title')).toBe('Connected')
      })
    })

    it('shows red indicator when disconnected', async () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      vi.mocked(apiModule.getBrightness).mockRejectedValue(new Error('Connection refused'))
      vi.mocked(apiModule.getTemperature).mockRejectedValue(new Error('Connection refused'))
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
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      vi.mocked(apiModule.getBrightness).mockResolvedValue({ brightness: 200 })
      vi.mocked(apiModule.getTemperature).mockResolvedValue({ temperature: 4000 })
      vi.mocked(apiModule.getConfiguration).mockResolvedValue({ width: 64, height: 32 })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('200')).toBeDefined()
      })
    })

    it('disables slider when no instance selected', () => {
      ;(useInstances as Mock).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: null })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      const slider = document.querySelector('[data-disabled]')
      expect(slider).toBeTruthy()
    })

    it('disables slider when loading', () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      vi.mocked(apiModule.getBrightness).mockImplementation(() => new Promise(() => {}))
      vi.mocked(apiModule.getTemperature).mockImplementation(() => new Promise(() => {}))
      vi.mocked(apiModule.getConfiguration).mockImplementation(() => new Promise(() => {}))

      render(<DisplayStatus />, { wrapper: createWrapper() })

      const slider = document.querySelector('[data-disabled]')
      expect(slider).toBeTruthy()
    })

    it('updates displayed value when slider is interacted with', async () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      vi.mocked(apiModule.getBrightness).mockResolvedValue({ brightness: 128 })
      vi.mocked(apiModule.getTemperature).mockResolvedValue({ temperature: 4000 })
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

  describe('temperature control', () => {
    it('displays current temperature value with K suffix', async () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      vi.mocked(apiModule.getBrightness).mockResolvedValue({ brightness: 128 })
      vi.mocked(apiModule.getTemperature).mockResolvedValue({ temperature: 4000 })
      vi.mocked(apiModule.getConfiguration).mockResolvedValue({ width: 64, height: 32 })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('4000 K')).toBeDefined()
      })
    })

    it('disables temperature slider when no instance selected', () => {
      ;(useInstances as Mock).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: null })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      const sliders = document.querySelectorAll('[data-disabled]')
      // Both brightness and temperature sliders should be disabled
      expect(sliders.length).toBeGreaterThanOrEqual(2)
    })

    it('updates displayed temperature value when slider is interacted with', async () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      vi.mocked(apiModule.getBrightness).mockResolvedValue({ brightness: 128 })
      vi.mocked(apiModule.getTemperature).mockResolvedValue({ temperature: 4000 })
      vi.mocked(apiModule.getConfiguration).mockResolvedValue({ width: 64, height: 32 })
      vi.mocked(apiModule.setTemperature).mockResolvedValue(undefined)

      render(<DisplayStatus />, { wrapper: createWrapper() })

      // Wait for initial load and verify initial value
      await waitFor(() => {
        expect(screen.getByText('4000 K')).toBeDefined()
      })

      // Find the temperature slider (second slider with role="slider")
      const sliderThumbs = document.querySelectorAll('[role="slider"]')
      const temperatureThumb = sliderThumbs[1]
      expect(temperatureThumb).toBeTruthy()

      // Simulate slider change via keyboard
      if (temperatureThumb) {
        fireEvent.keyDown(temperatureThumb, { key: 'ArrowRight' })
      }

      // Verify that the displayed value changed (step is 100)
      await waitFor(() => {
        expect(screen.getByText('4100 K')).toBeDefined()
      })
    })

    it('calls getTemperature with correct endpoint URL', async () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      vi.mocked(apiModule.getBrightness).mockResolvedValue({ brightness: 128 })
      vi.mocked(apiModule.getTemperature).mockResolvedValue({ temperature: 4000 })
      vi.mocked(apiModule.getConfiguration).mockResolvedValue({ width: 64, height: 32 })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      await waitFor(
        () => {
          expect(apiModule.getTemperature).toHaveBeenCalledWith({
            data: { endpointUrl: 'http://localhost:4200' },
          })
        },
        { timeout: 2000 },
      )
    })
  })

  describe('error handling', () => {
    it('shows error message when brightness fetch fails', async () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      vi.mocked(apiModule.getBrightness).mockRejectedValue(
        new Error('Failed to get brightness: timeout'),
      )
      vi.mocked(apiModule.getTemperature).mockResolvedValue({ temperature: 4000 })
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
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      vi.mocked(apiModule.getBrightness).mockRejectedValue('string error')
      vi.mocked(apiModule.getTemperature).mockResolvedValue({ temperature: 4000 })
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
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      vi.mocked(apiModule.getBrightness).mockResolvedValue({ brightness: 128 })
      vi.mocked(apiModule.getTemperature).mockResolvedValue({ temperature: 4000 })
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
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      vi.mocked(apiModule.getBrightness).mockResolvedValue({ brightness: 128 })
      vi.mocked(apiModule.getTemperature).mockResolvedValue({ temperature: 4000 })
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
      ;(useInstances as Mock).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: null })

      render(<DisplayStatus />, { wrapper: createWrapper() })

      expect(apiModule.getBrightness).not.toHaveBeenCalled()
      expect(apiModule.getTemperature).not.toHaveBeenCalled()
      expect(apiModule.getConfiguration).not.toHaveBeenCalled()
    })
  })
})
