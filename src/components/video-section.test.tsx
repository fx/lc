import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { useInstancesStore } from '@/stores/instances'
import { VideoSection } from './video-section'

// Mock hooks
vi.mock('@/hooks/use-video-queue', () => ({
  useVideoQueue: vi.fn(),
  useAddVideo: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  }),
  useSkipVideo: () => ({ mutate: vi.fn(), isPending: false }),
  useClearQueue: () => ({ mutate: vi.fn(), isPending: false }),
  useSetRepeatMode: () => ({ mutate: vi.fn(), isPending: false }),
  useSetFitMode: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/hooks/use-instances', () => ({
  useInstances: vi.fn(),
}))

import { useInstances } from '@/hooks/use-instances'
import { useVideoQueue } from '@/hooks/use-video-queue'

const mockInstances = [
  {
    id: 'inst-1',
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

describe('VideoSection', () => {
  beforeEach(() => {
    useInstancesStore.setState({ selectedId: 'inst-1' })
    vi.clearAllMocks()
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    ;(useVideoQueue as Mock).mockReturnValue({
      data: {
        queue: [{ url: 'https://youtube.com/watch?v=1', status: 'queued', error: null }],
        current: { url: 'https://youtube.com/watch?v=abc', status: 'playing', error: null },
        repeat: false,
        fit: 'cover',
      },
      isLoading: false,
      error: null,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders "Video Queue" title', () => {
    const { container } = render(<VideoSection />, { wrapper: createWrapper() })

    expect(container.textContent).toContain('Video Queue')
  })

  it('shows queue count badge', () => {
    const { container } = render(<VideoSection />, { wrapper: createWrapper() })

    // 1 current + 1 queued = 2
    expect(container.textContent).toContain('2')
  })

  it('starts expanded by default', () => {
    const { container } = render(<VideoSection />, { wrapper: createWrapper() })

    // Content should be visible - check for Video URL label from VideoUrlForm
    expect(container.textContent).toContain('Video URL')
  })

  it('renders child components', () => {
    const { container } = render(<VideoSection />, { wrapper: createWrapper() })

    // VideoUrlForm
    expect(container.textContent).toContain('Add to Queue')
    // VideoControls
    expect(container.querySelector('[data-testid="repeat-toggle"]')).not.toBeNull()
    // VideoQueuePanel
    expect(container.textContent).toContain('playing')
  })

  it('passes correct props to children', () => {
    ;(useVideoQueue as Mock).mockReturnValue({
      data: {
        queue: [],
        current: null,
        repeat: false,
        fit: 'cover',
      },
      isLoading: false,
      error: null,
    })

    const { container } = render(<VideoSection />, { wrapper: createWrapper() })

    // Badge should show 0
    expect(container.textContent).toContain('0')
    // VideoQueuePanel should show empty state
    expect(container.textContent).toContain('No videos in queue')
  })
})
