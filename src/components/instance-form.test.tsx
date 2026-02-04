import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

// Mock the hooks module
vi.mock('@/hooks/use-instances', () => ({
  useCreateInstance: vi.fn(),
  useUpdateInstance: vi.fn(),
}))

import { useCreateInstance, useUpdateInstance } from '@/hooks/use-instances'
import { InstanceForm } from './instance-form'

function getForm(container: HTMLElement): HTMLFormElement {
  const form = container.querySelector('form')
  if (!form) throw new Error('Form not found')
  return form
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('InstanceForm', () => {
  let mockCreateMutate: Mock
  let mockUpdateMutate: Mock

  beforeEach(() => {
    mockCreateMutate = vi.fn().mockResolvedValue({
      id: 'new-id',
      name: 'New Instance',
      endpointUrl: 'http://localhost:4200',
    })
    mockUpdateMutate = vi.fn().mockResolvedValue({
      id: '1',
      name: 'Updated Name',
      endpointUrl: 'http://localhost:4200',
    })

    ;(useCreateInstance as Mock).mockReturnValue({
      mutateAsync: mockCreateMutate,
      isPending: false,
    })
    ;(useUpdateInstance as Mock).mockReturnValue({
      mutateAsync: mockUpdateMutate,
      isPending: false,
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders empty form for new instance', () => {
    const { container } = render(<InstanceForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    expect(within(form).getByLabelText('Name')).toBeDefined()
    expect(within(form).getByLabelText('Endpoint URL')).toBeDefined()
    expect(within(form).getByRole('button', { name: 'Add Instance' })).toBeDefined()
  })

  it('renders pre-filled form when editing instance', () => {
    const instance = {
      id: '1',
      name: 'Test Instance',
      endpointUrl: 'http://localhost:4200',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const { container } = render(<InstanceForm instance={instance} />, { wrapper: createWrapper() })
    const form = getForm(container)

    expect(within(form).getByDisplayValue('Test Instance')).toBeDefined()
    expect(within(form).getByDisplayValue('http://localhost:4200')).toBeDefined()
    expect(within(form).getByRole('button', { name: 'Save' })).toBeDefined()
  })

  it('shows cancel button when onCancel provided', () => {
    const onCancel = vi.fn()
    const { container } = render(<InstanceForm onCancel={onCancel} />, { wrapper: createWrapper() })
    const form = getForm(container)

    const cancelButton = within(form).getByRole('button', { name: 'Cancel' })
    expect(cancelButton).toBeDefined()

    fireEvent.click(cancelButton)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables submit when form is invalid', () => {
    const { container } = render(<InstanceForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const submitButton = within(form).getByRole('button', { name: 'Add Instance' })
    expect(submitButton).toHaveProperty('disabled', true)
  })

  it('enables submit when form is valid', () => {
    const { container } = render(<InstanceForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const nameInput = within(form).getByLabelText('Name')
    const urlInput = within(form).getByLabelText('Endpoint URL')

    fireEvent.change(nameInput, { target: { value: 'My Instance' } })
    fireEvent.change(urlInput, { target: { value: 'http://localhost:4200' } })

    const submitButton = within(form).getByRole('button', { name: 'Add Instance' })
    expect(submitButton).toHaveProperty('disabled', false)
  })

  it('calls create mutation on submit for new instance', async () => {
    const onSuccess = vi.fn()
    const { container } = render(<InstanceForm onSuccess={onSuccess} />, {
      wrapper: createWrapper(),
    })
    const form = getForm(container)

    const nameInput = within(form).getByLabelText('Name')
    const urlInput = within(form).getByLabelText('Endpoint URL')

    fireEvent.change(nameInput, { target: { value: 'New Instance' } })
    fireEvent.change(urlInput, { target: { value: 'http://localhost:4200' } })

    const submitButton = within(form).getByRole('button', { name: 'Add Instance' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalledWith({
        name: 'New Instance',
        endpointUrl: 'http://localhost:4200',
      })
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })

  it('calls update mutation on submit for existing instance', async () => {
    const instance = {
      id: '1',
      name: 'Old Name',
      endpointUrl: 'http://localhost:4200',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const onSuccess = vi.fn()
    const { container } = render(<InstanceForm instance={instance} onSuccess={onSuccess} />, {
      wrapper: createWrapper(),
    })
    const form = getForm(container)

    const nameInput = within(form).getByLabelText('Name')
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } })

    const submitButton = within(form).getByRole('button', { name: 'Save' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: '1',
        name: 'Updated Name',
        endpointUrl: 'http://localhost:4200',
      })
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })

  it('shows validation error for invalid URL on blur', () => {
    const { container } = render(<InstanceForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Endpoint URL')
    fireEvent.change(urlInput, { target: { value: 'not-a-url' } })
    fireEvent.blur(urlInput)

    expect(within(form).getByText(/invalid url/i)).toBeDefined()
  })

  it('clears validation error when typing', () => {
    const { container } = render(<InstanceForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Endpoint URL')

    // First trigger error
    fireEvent.change(urlInput, { target: { value: 'not-a-url' } })
    fireEvent.blur(urlInput)
    expect(within(form).getByText(/invalid url/i)).toBeDefined()

    // Then clear by typing
    fireEvent.change(urlInput, { target: { value: 'http://localhost:4200' } })
    expect(within(form).queryByText(/invalid url/i)).toBeNull()
  })

  it('shows validation error on submit with invalid URL', () => {
    const { container } = render(<InstanceForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const nameInput = within(form).getByLabelText('Name')
    const urlInput = within(form).getByLabelText('Endpoint URL')

    fireEvent.change(nameInput, { target: { value: 'My Instance' } })
    fireEvent.change(urlInput, { target: { value: 'javascript:alert(1)' } })

    // Form submits but validation catches the bad URL
    fireEvent.submit(form)

    expect(within(form).getByText(/URL must use http:\/\/ or https:\/\//i)).toBeDefined()
  })

  it('clears form after adding new instance', async () => {
    const { container } = render(<InstanceForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const nameInput = within(form).getByLabelText('Name') as HTMLInputElement
    const urlInput = within(form).getByLabelText('Endpoint URL') as HTMLInputElement

    fireEvent.change(nameInput, { target: { value: 'New Instance' } })
    fireEvent.change(urlInput, { target: { value: 'http://localhost:4200' } })

    const submitButton = within(form).getByRole('button', { name: 'Add Instance' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(nameInput.value).toBe('')
      expect(urlInput.value).toBe('')
    })
  })

  it('shows pending state during mutation', () => {
    ;(useCreateInstance as Mock).mockReturnValue({
      mutateAsync: mockCreateMutate,
      isPending: true,
    })

    const { container } = render(<InstanceForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const submitButton = within(form).getByRole('button', { name: 'Saving...' })
    expect(submitButton).toBeDefined()
    expect(submitButton).toHaveProperty('disabled', true)
  })

  it('shows API error when mutation fails', async () => {
    mockCreateMutate.mockRejectedValueOnce(new Error('Database connection failed'))

    const { container } = render(<InstanceForm />, { wrapper: createWrapper() })
    const form = getForm(container)

    const nameInput = within(form).getByLabelText('Name')
    const urlInput = within(form).getByLabelText('Endpoint URL')

    fireEvent.change(nameInput, { target: { value: 'New Instance' } })
    fireEvent.change(urlInput, { target: { value: 'http://localhost:4200' } })

    const submitButton = within(form).getByRole('button', { name: 'Add Instance' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(within(form).getByText('Database connection failed')).toBeDefined()
    })
  })
})
