import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as sendImageModule from '@/lib/send-image-to-display'
import { useInstancesStore } from '@/stores/instances'
import { ImageUrlForm } from './image-url-form'

// Mock the server function
vi.mock('@/lib/send-image-to-display', () => ({
  sendImageToDisplay: vi.fn(),
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

function getForm(container: HTMLElement): HTMLFormElement {
  const form = container.querySelector('form')
  if (!form) throw new Error('Form not found')
  return form
}

describe('ImageUrlForm', () => {
  beforeEach(() => {
    localStorageMock.clear()
    useInstancesStore.setState({ instances: [], selectedId: null })
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders form with URL input and submit button', () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test Display', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    expect(within(form).getByLabelText('Image URL')).toBeDefined()
    expect(within(form).getByRole('button', { name: 'Send Frame' })).toBeDefined()
  })

  it('shows selected instance name in card title', () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Living Room', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })

    expect(container.textContent).toContain('Send Image to Living Room')
  })

  it('shows "No Instance Selected" when no instance selected', () => {
    useInstancesStore.setState({ instances: [], selectedId: null })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })

    expect(container.textContent).toContain('No Instance Selected')
  })

  it('disables submit when no instance selected', () => {
    useInstancesStore.setState({ instances: [], selectedId: null })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
    expect(submitButton).toHaveProperty('disabled', true)
  })

  it('disables submit when URL is empty', () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
    expect(submitButton).toHaveProperty('disabled', true)
  })

  it('enables submit when instance selected and URL is valid', () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Image URL')
    fireEvent.change(urlInput, { target: { value: 'https://example.com/image.png' } })

    const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
    expect(submitButton).toHaveProperty('disabled', false)
  })

  it('shows validation error for invalid URL on blur', () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Image URL')
    fireEvent.change(urlInput, { target: { value: 'not-a-url' } })
    fireEvent.blur(urlInput)

    expect(within(form).getByText(/invalid url/i)).toBeDefined()
  })

  it('clears validation error when typing valid URL', () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Image URL')

    // First trigger error
    fireEvent.change(urlInput, { target: { value: 'not-a-url' } })
    fireEvent.blur(urlInput)
    expect(within(form).getByText(/invalid url/i)).toBeDefined()

    // Then clear by typing valid URL
    fireEvent.change(urlInput, { target: { value: 'https://example.com/image.png' } })
    expect(within(form).queryByText(/invalid url/i)).toBeNull()
  })

  it('shows loading state during mutation', async () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    // Make mutation hang
    vi.mocked(sendImageModule.sendImageToDisplay).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    )

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Image URL')
    fireEvent.change(urlInput, { target: { value: 'https://example.com/image.png' } })

    const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(within(form).getByText(/sending/i)).toBeDefined()
    })
  })

  it('shows success message after successful submit', async () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    vi.mocked(sendImageModule.sendImageToDisplay).mockResolvedValue({ success: true })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Image URL')
    fireEvent.change(urlInput, { target: { value: 'https://example.com/image.png' } })

    const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(container.textContent).toContain('Frame sent successfully')
    })
  })

  it('shows error message on mutation failure', async () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    vi.mocked(sendImageModule.sendImageToDisplay).mockResolvedValue({
      success: false,
      error: 'Failed to fetch image: 404',
    })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Image URL')
    fireEvent.change(urlInput, { target: { value: 'https://example.com/image.png' } })

    const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(container.textContent).toContain('Failed to fetch image: 404')
    })
  })

  it('clears form after successful submit', async () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    vi.mocked(sendImageModule.sendImageToDisplay).mockResolvedValue({ success: true })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Image URL') as HTMLInputElement
    fireEvent.change(urlInput, { target: { value: 'https://example.com/image.png' } })

    const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(urlInput.value).toBe('')
    })
  })

  it('calls sendImageToDisplay with correct arguments', async () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    vi.mocked(sendImageModule.sendImageToDisplay).mockResolvedValue({ success: true })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Image URL')
    fireEvent.change(urlInput, { target: { value: 'https://example.com/test.png' } })

    const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(sendImageModule.sendImageToDisplay).toHaveBeenCalledWith(
        'https://example.com/test.png',
        'http://localhost:4200',
      )
    })
  })
})
