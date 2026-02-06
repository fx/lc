import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VideoUrlForm } from './video-url-form'

// Mock the useAddVideo hook
const mockMutate = vi.fn()
const mockReset = vi.fn()
let mockMutationState = {
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null as Error | null,
  mutate: mockMutate,
  reset: mockReset,
}

vi.mock('@/hooks/use-video-queue', () => ({
  useAddVideo: () => mockMutationState,
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

function getForm(container: HTMLElement): HTMLFormElement {
  const form = container.querySelector('form')
  if (!form) throw new Error('Form not found')
  return form
}

describe('VideoUrlForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutationState = {
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
      mutate: mockMutate,
      reset: mockReset,
    }
  })

  afterEach(() => {
    cleanup()
  })

  it('renders form with URL input and "Add to Queue" button', () => {
    const { container } = render(<VideoUrlForm endpointUrl="http://localhost:4200" />, {
      wrapper: createWrapper(),
    })
    const form = getForm(container)

    expect(within(form).getByLabelText('Video URL')).toBeDefined()
    expect(within(form).getByRole('button', { name: 'Add to Queue' })).toBeDefined()
  })

  it('disables submit when endpointUrl is null', () => {
    const { container } = render(<VideoUrlForm endpointUrl={null} />, {
      wrapper: createWrapper(),
    })
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Video URL')
    fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=abc' } })

    const submitButton = within(form).getByRole('button', { name: 'Add to Queue' })
    expect(submitButton).toHaveProperty('disabled', true)
  })

  it('disables submit when URL input is empty', () => {
    const { container } = render(<VideoUrlForm endpointUrl="http://localhost:4200" />, {
      wrapper: createWrapper(),
    })
    const form = getForm(container)

    const submitButton = within(form).getByRole('button', { name: 'Add to Queue' })
    expect(submitButton).toHaveProperty('disabled', true)
  })

  it('shows validation error for invalid URL on blur', () => {
    const { container } = render(<VideoUrlForm endpointUrl="http://localhost:4200" />, {
      wrapper: createWrapper(),
    })
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Video URL')
    fireEvent.change(urlInput, { target: { value: 'not-a-url' } })
    fireEvent.blur(urlInput)

    expect(within(form).getByText(/invalid url/i)).toBeDefined()
  })

  it('shows loading state during mutation ("Adding...")', () => {
    mockMutationState = {
      ...mockMutationState,
      isPending: true,
    }

    const { container } = render(<VideoUrlForm endpointUrl="http://localhost:4200" />, {
      wrapper: createWrapper(),
    })
    const form = getForm(container)

    expect(within(form).getByText(/adding/i)).toBeDefined()
  })

  it('shows success message after successful submit', () => {
    mockMutationState = {
      ...mockMutationState,
      isSuccess: true,
    }

    const { container } = render(<VideoUrlForm endpointUrl="http://localhost:4200" />, {
      wrapper: createWrapper(),
    })

    expect(container.textContent).toContain('Video added to queue')
  })

  it('shows error message on mutation failure', () => {
    mockMutationState = {
      ...mockMutationState,
      isError: true,
      error: new Error('Network error'),
    }

    const { container } = render(<VideoUrlForm endpointUrl="http://localhost:4200" />, {
      wrapper: createWrapper(),
    })

    expect(container.textContent).toContain('Network error')
  })

  it('clears input after successful submit', async () => {
    mockMutate.mockImplementation((_args: unknown, options: { onSuccess?: () => void }) => {
      options?.onSuccess?.()
    })

    const { container } = render(<VideoUrlForm endpointUrl="http://localhost:4200" />, {
      wrapper: createWrapper(),
    })
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Video URL') as HTMLInputElement
    fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=abc' } })

    const submitButton = within(form).getByRole('button', { name: 'Add to Queue' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(urlInput.value).toBe('')
    })
  })

  it('calls useAddVideo mutation with correct arguments', () => {
    const { container } = render(<VideoUrlForm endpointUrl="http://localhost:4200" />, {
      wrapper: createWrapper(),
    })
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Video URL')
    fireEvent.change(urlInput, {
      target: { value: 'https://www.youtube.com/watch?v=test123' },
    })

    const submitButton = within(form).getByRole('button', { name: 'Add to Queue' })
    fireEvent.click(submitButton)

    expect(mockMutate).toHaveBeenCalledWith(
      {
        endpointUrl: 'http://localhost:4200',
        url: 'https://www.youtube.com/watch?v=test123',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })
})
