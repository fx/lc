import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VideoQueueState } from '@/lib/video-api'
import { VideoQueuePanel } from './video-queue-panel'

const mockSkipMutate = vi.fn()
const mockClearMutate = vi.fn()

vi.mock('@/hooks/use-video-queue', () => ({
  useSkipVideo: () => ({
    mutate: mockSkipMutate,
    isPending: false,
  }),
  useClearQueue: () => ({
    mutate: mockClearMutate,
    isPending: false,
  }),
}))

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

const baseState: VideoQueueState = {
  queue: [],
  current: null,
  repeat: false,
  fit: 'cover',
}

describe('VideoQueuePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows empty state when no data', () => {
    const { container } = render(
      <VideoQueuePanel videoQueueState={null} endpointUrl="http://localhost:4200" />,
      { wrapper: createWrapper() },
    )

    expect(container.textContent).toContain('No videos in queue')
  })

  it('shows loading skeletons when isLoading', () => {
    const { container } = render(
      <VideoQueuePanel videoQueueState={null} endpointUrl="http://localhost:4200" isLoading />,
      { wrapper: createWrapper() },
    )

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows error message when error provided', () => {
    const { container } = render(
      <VideoQueuePanel
        videoQueueState={null}
        endpointUrl="http://localhost:4200"
        error={new Error('Connection failed')}
      />,
      { wrapper: createWrapper() },
    )

    expect(container.textContent).toContain('Connection failed')
  })

  it('renders current playing video with badge', () => {
    const state: VideoQueueState = {
      ...baseState,
      current: { url: 'https://youtube.com/watch?v=abc', status: 'playing', error: null },
    }

    const { container } = render(
      <VideoQueuePanel videoQueueState={state} endpointUrl="http://localhost:4200" />,
      { wrapper: createWrapper() },
    )

    expect(container.textContent).toContain('youtube.com/watch?v=abc')
    expect(container.querySelector('[data-variant="default"]')).toBeDefined()
    expect(container.textContent).toContain('playing')
  })

  it('renders queued items with correct status badges', () => {
    const state: VideoQueueState = {
      ...baseState,
      queue: [
        { url: 'https://youtube.com/watch?v=1', status: 'queued', error: null },
        { url: 'https://youtube.com/watch?v=2', status: 'error', error: 'Download failed' },
      ],
    }

    const { container } = render(
      <VideoQueuePanel videoQueueState={state} endpointUrl="http://localhost:4200" />,
      { wrapper: createWrapper() },
    )

    expect(container.textContent).toContain('youtube.com/watch?v=1')
    expect(container.textContent).toContain('youtube.com/watch?v=2')
    expect(container.querySelector('[data-variant="secondary"]')).toBeDefined()
    expect(container.querySelector('[data-variant="destructive"]')).toBeDefined()
  })

  it('shows skip button only when current exists', () => {
    const stateWithCurrent: VideoQueueState = {
      ...baseState,
      current: { url: 'https://youtube.com/watch?v=abc', status: 'playing', error: null },
    }

    const { container: withCurrent } = render(
      <VideoQueuePanel videoQueueState={stateWithCurrent} endpointUrl="http://localhost:4200" />,
      { wrapper: createWrapper() },
    )
    expect(withCurrent.querySelector('[data-testid="skip-button"]')).not.toBeNull()

    cleanup()

    const stateWithoutCurrent: VideoQueueState = {
      ...baseState,
      queue: [{ url: 'https://youtube.com/watch?v=1', status: 'queued', error: null }],
    }

    const { container: withoutCurrent } = render(
      <VideoQueuePanel videoQueueState={stateWithoutCurrent} endpointUrl="http://localhost:4200" />,
      { wrapper: createWrapper() },
    )
    expect(withoutCurrent.querySelector('[data-testid="skip-button"]')).toBeNull()
  })

  it('skip calls useSkipVideo with correct endpointUrl', () => {
    const state: VideoQueueState = {
      ...baseState,
      current: { url: 'https://youtube.com/watch?v=abc', status: 'playing', error: null },
    }

    const { container } = render(
      <VideoQueuePanel videoQueueState={state} endpointUrl="http://localhost:4200" />,
      { wrapper: createWrapper() },
    )

    const skipButton = container.querySelector('[data-testid="skip-button"]') as HTMLButtonElement
    fireEvent.click(skipButton)

    expect(mockSkipMutate).toHaveBeenCalledWith({ endpointUrl: 'http://localhost:4200' })
  })

  it('clear calls useClearQueue with correct endpointUrl', () => {
    const state: VideoQueueState = {
      ...baseState,
      current: { url: 'https://youtube.com/watch?v=abc', status: 'playing', error: null },
    }

    const { container } = render(
      <VideoQueuePanel videoQueueState={state} endpointUrl="http://localhost:4200" />,
      { wrapper: createWrapper() },
    )

    const clearButton = container.querySelector('[data-testid="clear-button"]') as HTMLButtonElement
    fireEvent.click(clearButton)

    expect(mockClearMutate).toHaveBeenCalledWith({ endpointUrl: 'http://localhost:4200' })
  })

  it('shows clear button when queue has items', () => {
    const state: VideoQueueState = {
      ...baseState,
      queue: [{ url: 'https://youtube.com/watch?v=1', status: 'queued', error: null }],
    }

    const { container } = render(
      <VideoQueuePanel videoQueueState={state} endpointUrl="http://localhost:4200" />,
      { wrapper: createWrapper() },
    )

    expect(container.querySelector('[data-testid="clear-button"]')).not.toBeNull()
  })
})
