import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import * as sendImageModule from '@/lib/send-image-to-display'
import { useInstancesStore } from '@/stores/instances'
import { ImageUrlForm } from './image-url-form'

// Mock the server function
vi.mock('@/lib/send-image-to-display', () => ({
  sendImageToDisplay: vi.fn(),
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

function getForm(container: HTMLElement): HTMLFormElement {
  const form = container.querySelector('form')
  if (!form) throw new Error('Form not found')
  return form
}

describe('ImageUrlForm', () => {
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

  it('renders form with URL input and submit button', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    expect(within(form).getByLabelText('Image URL')).toBeDefined()
    expect(within(form).getByRole('button', { name: 'Send Frame' })).toBeDefined()
  })

  it('shows selected instance name in card title', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: [{ ...mockInstances[0], name: 'Living Room' }],
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })

    expect(container.textContent).toContain('Send Image to Living Room')
  })

  it('shows "No Instance Selected" when no instance selected', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: null })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })

    expect(container.textContent).toContain('No Instance Selected')
  })

  it('disables submit when no instance selected', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: null })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
    expect(submitButton).toHaveProperty('disabled', true)
  })

  it('disables submit when URL is empty', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
    expect(submitButton).toHaveProperty('disabled', true)
  })

  it('enables submit when instance selected and URL is valid', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Image URL')
    fireEvent.change(urlInput, { target: { value: 'https://example.com/image.png' } })

    const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
    expect(submitButton).toHaveProperty('disabled', false)
  })

  it('shows validation error for invalid URL on blur', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Image URL')
    fireEvent.change(urlInput, { target: { value: 'not-a-url' } })
    fireEvent.blur(urlInput)

    expect(within(form).getByText(/invalid url/i)).toBeDefined()
  })

  it('clears validation error when typing valid URL', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

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
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

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
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

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
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

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
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

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
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    vi.mocked(sendImageModule.sendImageToDisplay).mockResolvedValue({ success: true })

    const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Image URL')
    fireEvent.change(urlInput, { target: { value: 'https://example.com/test.png' } })

    const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(sendImageModule.sendImageToDisplay).toHaveBeenCalledWith({
        data: {
          imageUrl: 'https://example.com/test.png',
          endpointUrl: 'http://localhost:4200',
        },
      })
    })
  })

  describe('warning display', () => {
    beforeEach(() => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })
    })

    it('shows warning when result has warning field', async () => {
      vi.mocked(sendImageModule.sendImageToDisplay).mockResolvedValue({
        success: true,
        warning: 'Source image dimensions (1920x1080) exceed recommended maximum (256x256)',
      })

      const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
      const form = getForm(container)

      const urlInput = within(form).getByLabelText('Image URL')
      fireEvent.change(urlInput, { target: { value: 'https://example.com/large-image.png' } })

      const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(container.textContent).toContain('Source image dimensions (1920x1080)')
        expect(container.textContent).toContain('exceed recommended maximum')
      })
    })

    it('shows both success message and warning when present', async () => {
      vi.mocked(sendImageModule.sendImageToDisplay).mockResolvedValue({
        success: true,
        warning: 'Image too large warning',
      })

      const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
      const form = getForm(container)

      const urlInput = within(form).getByLabelText('Image URL')
      fireEvent.change(urlInput, { target: { value: 'https://example.com/image.png' } })

      const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(container.textContent).toContain('Frame sent successfully')
        expect(container.textContent).toContain('Image too large warning')
      })
    })

    it('clears warning when user starts typing new URL', async () => {
      vi.mocked(sendImageModule.sendImageToDisplay).mockResolvedValue({
        success: true,
        warning: 'Test warning',
      })

      const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
      const form = getForm(container)

      const urlInput = within(form).getByLabelText('Image URL')
      fireEvent.change(urlInput, { target: { value: 'https://example.com/image.png' } })

      const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(container.textContent).toContain('Test warning')
      })

      // Start typing new URL
      fireEvent.change(urlInput, { target: { value: 'https://example.com/new-image.png' } })

      expect(container.textContent).not.toContain('Test warning')
    })

    it('does not show warning when result has no warning', async () => {
      vi.mocked(sendImageModule.sendImageToDisplay).mockResolvedValue({
        success: true,
      })

      const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
      const form = getForm(container)

      const urlInput = within(form).getByLabelText('Image URL')
      fireEvent.change(urlInput, { target: { value: 'https://example.com/small-image.png' } })

      const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(container.textContent).toContain('Frame sent successfully')
      })

      // Should not contain any warning-related text
      expect(container.textContent).not.toContain('exceed recommended maximum')
    })
  })

  describe('dangerous URL protocol validation', () => {
    beforeEach(() => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })
    })

    it('rejects javascript: URLs', () => {
      const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
      const form = getForm(container)

      const urlInput = within(form).getByLabelText('Image URL')
      fireEvent.change(urlInput, { target: { value: 'javascript:alert(1)' } })
      fireEvent.blur(urlInput)

      expect(within(form).getByText(/URL must use http:\/\/ or https:\/\//i)).toBeDefined()
    })

    it('rejects data: URLs', () => {
      const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
      const form = getForm(container)

      const urlInput = within(form).getByLabelText('Image URL')
      fireEvent.change(urlInput, {
        target: { value: 'data:text/html,<script>alert(1)</script>' },
      })
      fireEvent.blur(urlInput)

      expect(within(form).getByText(/URL must use http:\/\/ or https:\/\//i)).toBeDefined()
    })

    it('rejects file: URLs', () => {
      const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
      const form = getForm(container)

      const urlInput = within(form).getByLabelText('Image URL')
      fireEvent.change(urlInput, { target: { value: 'file:///etc/passwd' } })
      fireEvent.blur(urlInput)

      expect(within(form).getByText(/URL must use http:\/\/ or https:\/\//i)).toBeDefined()
    })

    it('disables submit button for javascript: URLs', () => {
      const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
      const form = getForm(container)

      const urlInput = within(form).getByLabelText('Image URL')
      fireEvent.change(urlInput, { target: { value: 'javascript:alert(1)' } })

      const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
      expect(submitButton).toHaveProperty('disabled', true)
    })

    it('disables submit button for data: URLs', () => {
      const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
      const form = getForm(container)

      const urlInput = within(form).getByLabelText('Image URL')
      fireEvent.change(urlInput, {
        target: { value: 'data:image/png;base64,iVBORw0KGgo=' },
      })

      const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
      expect(submitButton).toHaveProperty('disabled', true)
    })

    it('disables submit button for file: URLs', () => {
      const { container } = render(<ImageUrlForm />, { wrapper: createWrapper() })
      const form = getForm(container)

      const urlInput = within(form).getByLabelText('Image URL')
      fireEvent.change(urlInput, { target: { value: 'file:///etc/passwd' } })

      const submitButton = within(form).getByRole('button', { name: 'Send Frame' })
      expect(submitButton).toHaveProperty('disabled', true)
    })
  })
})
