import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VideoControls } from './video-controls'

const mockSetRepeatMutate = vi.fn()
const mockSetFitMutate = vi.fn()

vi.mock('@/hooks/use-video-queue', () => ({
  useSetRepeatMode: () => ({
    mutate: mockSetRepeatMutate,
    isPending: false,
  }),
  useSetFitMode: () => ({
    mutate: mockSetFitMutate,
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

describe('VideoControls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders repeat toggle and fit selector', () => {
    const { container } = render(
      <VideoControls repeat={false} fit="cover" endpointUrl="http://localhost:4200" />,
      { wrapper: createWrapper() },
    )

    expect(container.querySelector('[data-testid="repeat-toggle"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="fit-selector"]')).not.toBeNull()
  })

  it('repeat button variant changes based on repeat prop', () => {
    const { container: offContainer } = render(
      <VideoControls repeat={false} fit="cover" endpointUrl="http://localhost:4200" />,
      { wrapper: createWrapper() },
    )

    const offButton = offContainer.querySelector('[data-testid="repeat-toggle"]') as HTMLElement
    // outline variant does not have bg-primary class
    expect(offButton.className).toContain('border')

    cleanup()

    const { container: onContainer } = render(
      <VideoControls repeat={true} fit="cover" endpointUrl="http://localhost:4200" />,
      { wrapper: createWrapper() },
    )

    const onButton = onContainer.querySelector('[data-testid="repeat-toggle"]') as HTMLElement
    expect(onButton.className).toContain('bg-primary')
  })

  it('clicking repeat calls useSetRepeatMode with toggled value', () => {
    const { container } = render(
      <VideoControls repeat={false} fit="cover" endpointUrl="http://localhost:4200" />,
      { wrapper: createWrapper() },
    )

    const repeatButton = container.querySelector(
      '[data-testid="repeat-toggle"]',
    ) as HTMLButtonElement
    fireEvent.click(repeatButton)

    expect(mockSetRepeatMutate).toHaveBeenCalledWith({
      endpointUrl: 'http://localhost:4200',
      enabled: true,
    })
  })

  it('fit selector shows current value', () => {
    const { container } = render(
      <VideoControls repeat={false} fit="contain" endpointUrl="http://localhost:4200" />,
      { wrapper: createWrapper() },
    )

    const trigger = container.querySelector('[data-testid="fit-selector"]') as HTMLElement
    expect(trigger.textContent).toContain('Contain')
  })

  it('controls disabled when endpointUrl null', () => {
    const { container } = render(<VideoControls repeat={false} fit="cover" endpointUrl={null} />, {
      wrapper: createWrapper(),
    })

    const repeatButton = container.querySelector(
      '[data-testid="repeat-toggle"]',
    ) as HTMLButtonElement
    expect(repeatButton.disabled).toBe(true)

    const trigger = container.querySelector('[data-testid="fit-selector"]') as HTMLElement
    expect(trigger.getAttribute('data-disabled')).toBeDefined()
  })
})
