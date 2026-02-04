import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { InstanceForm } from '@/components/instance-form'
import { InstanceList } from '@/components/instance-list'
import type { Instance } from '@/db/schema'

// Mock TanStack Router Link component
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

// Mock the hooks module
vi.mock('@/hooks/use-instances', () => ({
  useInstances: vi.fn(),
  useCreateInstance: vi.fn(),
  useUpdateInstance: vi.fn(),
  useDeleteInstance: vi.fn(),
}))

import {
  useCreateInstance,
  useDeleteInstance,
  useInstances,
  useUpdateInstance,
} from '@/hooks/use-instances'

// Extract the Settings component from the route module
function SettingsPage() {
  return (
    <main className="flex-1 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <a
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            Back
          </a>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <div>
          <div>
            <h2>Instances</h2>
            <p>
              Manage your LED matrix bridge instances. Each instance connects to a separate
              led-matrix-zmq-http-bridge API.
            </p>
          </div>
          <div className="space-y-6">
            <InstanceList />
            <div>
              <h3 className="text-sm font-medium mb-4">Add New Instance</h3>
              <InstanceForm />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
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

// Create a mutable instance store for tests
let mockInstancesData: Instance[] = []

function createMockInstance(id: string, name: string, endpointUrl: string): Instance {
  return {
    id,
    name,
    endpointUrl,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

describe('Settings Route - CRUD Flows', () => {
  let mockCreateMutate: Mock
  let mockUpdateMutate: Mock
  let mockDeleteMutate: Mock

  beforeEach(() => {
    mockInstancesData = []

    mockCreateMutate = vi
      .fn()
      .mockImplementation(async (data: { name: string; endpointUrl: string }) => {
        const newInstance = createMockInstance(`id-${Date.now()}`, data.name, data.endpointUrl)
        mockInstancesData.push(newInstance)
        return newInstance
      })

    mockUpdateMutate = vi
      .fn()
      .mockImplementation(async (data: { id: string; name: string; endpointUrl: string }) => {
        const index = mockInstancesData.findIndex((i) => i.id === data.id)
        if (index !== -1) {
          mockInstancesData[index] = {
            ...mockInstancesData[index],
            name: data.name,
            endpointUrl: data.endpointUrl,
            updatedAt: new Date(),
          }
        }
        return mockInstancesData[index]
      })

    mockDeleteMutate = vi.fn().mockImplementation(async (id: string) => {
      mockInstancesData = mockInstancesData.filter((i) => i.id !== id)
      return { success: true }
    })

    ;(useInstances as Mock).mockImplementation(() => ({
      data: mockInstancesData,
      isLoading: false,
      error: null,
    }))

    ;(useCreateInstance as Mock).mockReturnValue({
      mutateAsync: mockCreateMutate,
      isPending: false,
    })

    ;(useUpdateInstance as Mock).mockReturnValue({
      mutateAsync: mockUpdateMutate,
      isPending: false,
    })

    ;(useDeleteInstance as Mock).mockReturnValue({
      mutateAsync: mockDeleteMutate,
      isPending: false,
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('Create Instance', () => {
    it('adds a new instance via form and displays it in the list', async () => {
      const { rerender } = render(<SettingsPage />, { wrapper: createWrapper() })

      // Initially shows empty state
      expect(
        screen.getByText('No instances configured. Add one below to get started.'),
      ).toBeDefined()

      // Fill out the form
      const nameInput = screen.getByLabelText('Name')
      const urlInput = screen.getByLabelText('Endpoint URL')

      fireEvent.change(nameInput, { target: { value: 'Living Room Display' } })
      fireEvent.change(urlInput, { target: { value: 'http://192.168.1.100:4200' } })

      // Submit the form
      const addButton = screen.getByRole('button', { name: 'Add Instance' })
      fireEvent.click(addButton)

      // Wait for mutation to complete and re-render
      await waitFor(() => {
        expect(mockCreateMutate).toHaveBeenCalledWith({
          name: 'Living Room Display',
          endpointUrl: 'http://192.168.1.100:4200',
        })
      })

      // Re-render to reflect updated data
      rerender(<SettingsPage />)

      // Verify instance appears in the list
      expect(screen.getByText('Living Room Display')).toBeDefined()
      expect(screen.getByText('http://192.168.1.100:4200')).toBeDefined()
    })

    it('validates required name field', () => {
      render(<SettingsPage />, { wrapper: createWrapper() })

      const urlInput = screen.getByLabelText('Endpoint URL')
      fireEvent.change(urlInput, { target: { value: 'http://localhost:4200' } })

      // Button should remain disabled without name
      const addButton = screen.getByRole('button', { name: 'Add Instance' })
      expect(addButton).toHaveProperty('disabled', true)
    })

    it('validates required endpoint URL field', () => {
      render(<SettingsPage />, { wrapper: createWrapper() })

      const nameInput = screen.getByLabelText('Name')
      fireEvent.change(nameInput, { target: { value: 'Test Instance' } })

      // Button should remain disabled without valid URL
      const addButton = screen.getByRole('button', { name: 'Add Instance' })
      expect(addButton).toHaveProperty('disabled', true)
    })

    it('shows validation error for invalid URL format', () => {
      render(<SettingsPage />, { wrapper: createWrapper() })

      const urlInput = screen.getByLabelText('Endpoint URL')
      fireEvent.change(urlInput, { target: { value: 'not-a-valid-url' } })
      fireEvent.blur(urlInput)

      expect(screen.getByText(/invalid url/i)).toBeDefined()
    })

    it('clears form after successful submission', async () => {
      render(<SettingsPage />, { wrapper: createWrapper() })

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      const urlInput = screen.getByLabelText('Endpoint URL') as HTMLInputElement

      fireEvent.change(nameInput, { target: { value: 'Test Instance' } })
      fireEvent.change(urlInput, { target: { value: 'http://localhost:4200' } })

      const addButton = screen.getByRole('button', { name: 'Add Instance' })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(nameInput.value).toBe('')
        expect(urlInput.value).toBe('')
      })
    })
  })

  describe('Read/List Instances', () => {
    it('renders empty state when no instances exist', () => {
      render(<SettingsPage />, { wrapper: createWrapper() })

      expect(
        screen.getByText('No instances configured. Add one below to get started.'),
      ).toBeDefined()
    })

    it('renders list of existing instances', () => {
      mockInstancesData = [
        createMockInstance('1', 'Living Room', 'http://192.168.1.100:4200'),
        createMockInstance('2', 'Bedroom', 'http://192.168.1.101:4200'),
        createMockInstance('3', 'Kitchen', 'http://192.168.1.102:4200'),
      ]

      render(<SettingsPage />, { wrapper: createWrapper() })

      expect(screen.getByText('Living Room')).toBeDefined()
      expect(screen.getByText('http://192.168.1.100:4200')).toBeDefined()
      expect(screen.getByText('Bedroom')).toBeDefined()
      expect(screen.getByText('http://192.168.1.101:4200')).toBeDefined()
      expect(screen.getByText('Kitchen')).toBeDefined()
      expect(screen.getByText('http://192.168.1.102:4200')).toBeDefined()
    })

    it('displays edit and delete buttons for each instance', () => {
      mockInstancesData = [createMockInstance('1', 'Test Instance', 'http://localhost:4200')]

      render(<SettingsPage />, { wrapper: createWrapper() })

      expect(screen.getByRole('button', { name: /edit test instance/i })).toBeDefined()
      expect(screen.getByRole('button', { name: /delete test instance/i })).toBeDefined()
    })
  })

  describe('Update Instance', () => {
    it('enters edit mode when edit button is clicked', () => {
      mockInstancesData = [createMockInstance('1', 'Old Name', 'http://localhost:4200')]

      render(<SettingsPage />, { wrapper: createWrapper() })

      const editButton = screen.getByRole('button', { name: /edit old name/i })
      fireEvent.click(editButton)

      // Should show form with pre-filled values
      const nameInputs = screen.getAllByLabelText('Name')
      const editNameInput = nameInputs.find(
        (input) => (input as HTMLInputElement).value === 'Old Name',
      )
      expect(editNameInput).toBeDefined()
    })

    it('updates instance and exits edit mode on save', async () => {
      mockInstancesData = [createMockInstance('1', 'Old Name', 'http://localhost:4200')]

      const { rerender } = render(<SettingsPage />, { wrapper: createWrapper() })

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit old name/i })
      fireEvent.click(editButton)

      // Find and update the name input (the one with 'Old Name' value)
      const nameInputs = screen.getAllByLabelText('Name')
      const editNameInput = nameInputs.find(
        (input) => (input as HTMLInputElement).value === 'Old Name',
      ) as HTMLInputElement
      fireEvent.change(editNameInput, { target: { value: 'Updated Name' } })

      // Save changes
      const saveButton = screen.getByRole('button', { name: 'Save' })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateMutate).toHaveBeenCalledWith({
          id: '1',
          name: 'Updated Name',
          endpointUrl: 'http://localhost:4200',
        })
      })

      // Re-render to reflect updated data
      rerender(<SettingsPage />)

      // Verify changes are reflected
      expect(screen.getByText('Updated Name')).toBeDefined()
    })

    it('cancels edit mode without saving changes', () => {
      mockInstancesData = [createMockInstance('1', 'Original Name', 'http://localhost:4200')]

      render(<SettingsPage />, { wrapper: createWrapper() })

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit original name/i })
      fireEvent.click(editButton)

      // Change the name
      const nameInputs = screen.getAllByLabelText('Name')
      const editNameInput = nameInputs.find(
        (input) => (input as HTMLInputElement).value === 'Original Name',
      ) as HTMLInputElement
      fireEvent.change(editNameInput, { target: { value: 'Changed Name' } })

      // Cancel
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelButton)

      // Original name should still be shown
      expect(screen.getByText('Original Name')).toBeDefined()

      // Mutation should not have been called
      expect(mockUpdateMutate).not.toHaveBeenCalled()
    })
  })

  describe('Delete Instance', () => {
    it('opens delete confirmation dialog', () => {
      mockInstancesData = [createMockInstance('1', 'Instance to Delete', 'http://localhost:4200')]

      render(<SettingsPage />, { wrapper: createWrapper() })

      const deleteButton = screen.getByRole('button', { name: /delete instance to delete/i })
      fireEvent.click(deleteButton)

      // Dialog should be visible
      expect(screen.getByRole('dialog')).toBeDefined()
      expect(screen.getByText('Delete Instance')).toBeDefined()
      expect(screen.getByText(/Are you sure you want to delete/)).toBeDefined()
    })

    it('removes instance when delete is confirmed', async () => {
      mockInstancesData = [createMockInstance('1', 'Instance to Delete', 'http://localhost:4200')]

      const { rerender } = render(<SettingsPage />, { wrapper: createWrapper() })

      // Open delete dialog
      const deleteButton = screen.getByRole('button', { name: /delete instance to delete/i })
      fireEvent.click(deleteButton)

      // Confirm deletion
      const dialog = screen.getByRole('dialog')
      const confirmButton = within(dialog).getByRole('button', { name: 'Delete' })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockDeleteMutate).toHaveBeenCalledWith('1')
      })

      // Re-render to reflect updated data
      rerender(<SettingsPage />)

      // Instance should be removed, empty state shown
      expect(
        screen.getByText('No instances configured. Add one below to get started.'),
      ).toBeDefined()
    })

    it('cancels deletion and keeps instance', () => {
      mockInstancesData = [createMockInstance('1', 'Keep This Instance', 'http://localhost:4200')]

      render(<SettingsPage />, { wrapper: createWrapper() })

      // Open delete dialog
      const deleteButton = screen.getByRole('button', { name: /delete keep this instance/i })
      fireEvent.click(deleteButton)

      // Cancel deletion
      const dialog = screen.getByRole('dialog')
      const cancelButton = within(dialog).getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelButton)

      // Instance should still exist
      expect(screen.getByText('Keep This Instance')).toBeDefined()

      // Delete mutation should not have been called
      expect(mockDeleteMutate).not.toHaveBeenCalled()
    })
  })
})
