import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

// Mock the hooks module
vi.mock('@/hooks/use-instances', () => ({
  useInstances: vi.fn(),
  useDeleteInstance: vi.fn(),
  useCreateInstance: vi.fn(),
  useUpdateInstance: vi.fn(),
}))

import {
  useCreateInstance,
  useDeleteInstance,
  useInstances,
  useUpdateInstance,
} from '@/hooks/use-instances'
import { InstanceList } from './instance-list'

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

const mockInstances = [
  {
    id: '1',
    name: 'Instance 1',
    endpointUrl: 'http://localhost:4200',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Instance 2',
    endpointUrl: 'http://localhost:4201',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

describe('InstanceList', () => {
  let mockDeleteMutate: Mock
  let mockCreateMutate: Mock
  let mockUpdateMutate: Mock

  beforeEach(() => {
    mockDeleteMutate = vi.fn().mockResolvedValue({ success: true })
    mockCreateMutate = vi.fn().mockResolvedValue({})
    mockUpdateMutate = vi.fn().mockResolvedValue({})

    ;(useInstances as Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })
    ;(useDeleteInstance as Mock).mockReturnValue({
      mutateAsync: mockDeleteMutate,
      isPending: false,
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

  it('renders loading state', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    const { container } = render(<InstanceList />, { wrapper: createWrapper() })

    expect(within(container).getByText('Loading instances...')).toBeDefined()
  })

  it('renders error state', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    })

    const { container } = render(<InstanceList />, { wrapper: createWrapper() })

    expect(within(container).getByText(/Failed to load instances/)).toBeDefined()
  })

  it('renders empty state when no instances', () => {
    const { container } = render(<InstanceList />, { wrapper: createWrapper() })

    expect(
      within(container).getByText('No instances configured. Add one below to get started.'),
    ).toBeDefined()
  })

  it('renders list of instances', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })

    const { container } = render(<InstanceList />, { wrapper: createWrapper() })

    expect(within(container).getByText('Instance 1')).toBeDefined()
    expect(within(container).getByText('http://localhost:4200')).toBeDefined()
    expect(within(container).getByText('Instance 2')).toBeDefined()
    expect(within(container).getByText('http://localhost:4201')).toBeDefined()
  })

  it('shows edit and delete buttons for each instance', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: [mockInstances[0]],
      isLoading: false,
      error: null,
    })

    const { container } = render(<InstanceList />, { wrapper: createWrapper() })

    const editButtons = within(container).getAllByRole('button', { name: /edit/i })
    const deleteButtons = within(container).getAllByRole('button', { name: /delete/i })

    expect(editButtons.length).toBeGreaterThan(0)
    expect(deleteButtons.length).toBeGreaterThan(0)
  })

  it('enters edit mode when edit button clicked', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: [mockInstances[0]],
      isLoading: false,
      error: null,
    })

    const { container } = render(<InstanceList />, { wrapper: createWrapper() })

    const editButton = within(container).getAllByRole('button', { name: /edit/i })[0]
    fireEvent.click(editButton)

    expect(within(container).getByLabelText('Name')).toBeDefined()
    expect(within(container).getByLabelText('Endpoint URL')).toBeDefined()
  })

  it('exits edit mode when cancel clicked', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: [mockInstances[0]],
      isLoading: false,
      error: null,
    })

    const { container } = render(<InstanceList />, { wrapper: createWrapper() })

    // Enter edit mode
    const editButton = within(container).getAllByRole('button', { name: /edit/i })[0]
    fireEvent.click(editButton)

    // Cancel
    const cancelButton = within(container).getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButton)

    // Should be back to view mode
    expect(within(container).queryByLabelText('Name')).toBeNull()
    expect(within(container).getByText('Instance 1')).toBeDefined()
  })

  it('opens delete confirmation dialog when delete clicked', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: [mockInstances[0]],
      isLoading: false,
      error: null,
    })

    const { container } = render(<InstanceList />, { wrapper: createWrapper() })

    const deleteButton = within(container).getAllByRole('button', { name: /delete/i })[0]
    fireEvent.click(deleteButton)

    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByText('Delete Instance')).toBeDefined()
    expect(screen.getByText(/Are you sure you want to delete/)).toBeDefined()
  })

  it('closes delete dialog when cancel clicked', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: [mockInstances[0]],
      isLoading: false,
      error: null,
    })

    const { container } = render(<InstanceList />, { wrapper: createWrapper() })

    const deleteButton = within(container).getAllByRole('button', { name: /delete/i })[0]
    fireEvent.click(deleteButton)

    const dialog = screen.getByRole('dialog')
    const cancelButton = within(dialog).getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButton)

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(within(container).getByText('Instance 1')).toBeDefined()
  })

  it('calls delete mutation when confirmed', async () => {
    ;(useInstances as Mock).mockReturnValue({
      data: [mockInstances[0]],
      isLoading: false,
      error: null,
    })

    const { container } = render(<InstanceList />, { wrapper: createWrapper() })

    const deleteButton = within(container).getAllByRole('button', { name: /delete/i })[0]
    fireEvent.click(deleteButton)

    const dialog = screen.getByRole('dialog')
    const confirmDeleteButton = within(dialog).getByRole('button', { name: 'Delete' })
    fireEvent.click(confirmDeleteButton)

    await waitFor(() => {
      expect(mockDeleteMutate).toHaveBeenCalledWith('1')
    })
  })

  it('shows pending state during delete', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: [mockInstances[0]],
      isLoading: false,
      error: null,
    })
    ;(useDeleteInstance as Mock).mockReturnValue({
      mutateAsync: mockDeleteMutate,
      isPending: true,
    })

    const { container } = render(<InstanceList />, { wrapper: createWrapper() })

    const deleteButton = within(container).getAllByRole('button', { name: /delete/i })[0]
    fireEvent.click(deleteButton)

    const dialog = screen.getByRole('dialog')
    const confirmDeleteButton = within(dialog).getByRole('button', { name: 'Deleting...' })
    expect(confirmDeleteButton).toBeDefined()
    expect(confirmDeleteButton).toHaveProperty('disabled', true)
  })
})
