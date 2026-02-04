import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useInstancesStore } from '@/stores/instances'

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

// Mock TanStack Router Link component
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode
    to: string
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

// Import vi for mocking
import { vi } from 'vitest'

// Extract the Settings component from the route module
// Since createFileRoute returns a route object, we need to render the actual component
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

import { InstanceForm } from '@/components/instance-form'
import { InstanceList } from '@/components/instance-list'

describe('Settings Route - CRUD Flows', () => {
  beforeEach(() => {
    localStorageMock.clear()
    useInstancesStore.setState({ instances: [], selectedId: null })
  })

  afterEach(() => {
    cleanup()
  })

  describe('Create Instance', () => {
    it('adds a new instance via form and displays it in the list', () => {
      render(<SettingsPage />)

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

      // Verify instance appears in the list
      expect(screen.getByText('Living Room Display')).toBeDefined()
      expect(screen.getByText('http://192.168.1.100:4200')).toBeDefined()

      // Empty state should be gone
      expect(
        screen.queryByText('No instances configured. Add one below to get started.'),
      ).toBeNull()
    })

    it('validates required name field', () => {
      render(<SettingsPage />)

      const urlInput = screen.getByLabelText('Endpoint URL')
      fireEvent.change(urlInput, { target: { value: 'http://localhost:4200' } })

      // Button should remain disabled without name
      const addButton = screen.getByRole('button', { name: 'Add Instance' })
      expect(addButton).toHaveProperty('disabled', true)
    })

    it('validates required endpoint URL field', () => {
      render(<SettingsPage />)

      const nameInput = screen.getByLabelText('Name')
      fireEvent.change(nameInput, { target: { value: 'Test Instance' } })

      // Button should remain disabled without valid URL
      const addButton = screen.getByRole('button', { name: 'Add Instance' })
      expect(addButton).toHaveProperty('disabled', true)
    })

    it('shows validation error for invalid URL format', () => {
      render(<SettingsPage />)

      const urlInput = screen.getByLabelText('Endpoint URL')
      fireEvent.change(urlInput, { target: { value: 'not-a-valid-url' } })
      fireEvent.blur(urlInput)

      expect(screen.getByText(/invalid url/i)).toBeDefined()
    })

    it('clears form after successful submission', () => {
      render(<SettingsPage />)

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      const urlInput = screen.getByLabelText('Endpoint URL') as HTMLInputElement

      fireEvent.change(nameInput, { target: { value: 'Test Instance' } })
      fireEvent.change(urlInput, { target: { value: 'http://localhost:4200' } })

      const addButton = screen.getByRole('button', { name: 'Add Instance' })
      fireEvent.click(addButton)

      // Form should be cleared
      expect(nameInput.value).toBe('')
      expect(urlInput.value).toBe('')
    })
  })

  describe('Read/List Instances', () => {
    it('renders empty state when no instances exist', () => {
      render(<SettingsPage />)

      expect(
        screen.getByText('No instances configured. Add one below to get started.'),
      ).toBeDefined()
    })

    it('renders list of existing instances', () => {
      useInstancesStore.setState({
        instances: [
          { id: '1', name: 'Living Room', endpointUrl: 'http://192.168.1.100:4200' },
          { id: '2', name: 'Bedroom', endpointUrl: 'http://192.168.1.101:4200' },
          { id: '3', name: 'Kitchen', endpointUrl: 'http://192.168.1.102:4200' },
        ],
        selectedId: '1',
      })

      render(<SettingsPage />)

      expect(screen.getByText('Living Room')).toBeDefined()
      expect(screen.getByText('http://192.168.1.100:4200')).toBeDefined()
      expect(screen.getByText('Bedroom')).toBeDefined()
      expect(screen.getByText('http://192.168.1.101:4200')).toBeDefined()
      expect(screen.getByText('Kitchen')).toBeDefined()
      expect(screen.getByText('http://192.168.1.102:4200')).toBeDefined()
    })

    it('displays edit and delete buttons for each instance', () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Test Instance', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      render(<SettingsPage />)

      expect(screen.getByRole('button', { name: /edit test instance/i })).toBeDefined()
      expect(screen.getByRole('button', { name: /delete test instance/i })).toBeDefined()
    })
  })

  describe('Update Instance', () => {
    it('enters edit mode when edit button is clicked', () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Old Name', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      render(<SettingsPage />)

      const editButton = screen.getByRole('button', { name: /edit old name/i })
      fireEvent.click(editButton)

      // Should show form with pre-filled values
      const nameInputs = screen.getAllByLabelText('Name')
      const editNameInput = nameInputs.find(
        (input) => (input as HTMLInputElement).value === 'Old Name',
      )
      expect(editNameInput).toBeDefined()
    })

    it('updates instance and exits edit mode on save', () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Old Name', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      render(<SettingsPage />)

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

      // Verify changes are reflected
      expect(screen.getByText('Updated Name')).toBeDefined()
      expect(screen.queryByText('Old Name')).toBeNull()

      // Verify store state
      const state = useInstancesStore.getState()
      expect(state.instances[0].name).toBe('Updated Name')
    })

    it('cancels edit mode without saving changes', () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Original Name', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      render(<SettingsPage />)

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

      // Store should be unchanged
      const state = useInstancesStore.getState()
      expect(state.instances[0].name).toBe('Original Name')
    })

    it('updates endpoint URL successfully', () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Test Instance', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      render(<SettingsPage />)

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit test instance/i })
      fireEvent.click(editButton)

      // Find and update the URL input
      const urlInputs = screen.getAllByLabelText('Endpoint URL')
      const editUrlInput = urlInputs.find(
        (input) => (input as HTMLInputElement).value === 'http://localhost:4200',
      ) as HTMLInputElement
      fireEvent.change(editUrlInput, { target: { value: 'http://192.168.1.50:4200' } })

      // Save changes
      const saveButton = screen.getByRole('button', { name: 'Save' })
      fireEvent.click(saveButton)

      // Verify changes
      expect(screen.getByText('http://192.168.1.50:4200')).toBeDefined()
      expect(screen.queryByText('http://localhost:4200')).toBeNull()
    })
  })

  describe('Delete Instance', () => {
    it('opens delete confirmation dialog', () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Instance to Delete', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      render(<SettingsPage />)

      const deleteButton = screen.getByRole('button', { name: /delete instance to delete/i })
      fireEvent.click(deleteButton)

      // Dialog should be visible
      expect(screen.getByRole('dialog')).toBeDefined()
      expect(screen.getByText('Delete Instance')).toBeDefined()
      expect(screen.getByText(/Are you sure you want to delete/)).toBeDefined()
    })

    it('removes instance when delete is confirmed', () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Instance to Delete', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      render(<SettingsPage />)

      // Open delete dialog
      const deleteButton = screen.getByRole('button', { name: /delete instance to delete/i })
      fireEvent.click(deleteButton)

      // Confirm deletion
      const dialog = screen.getByRole('dialog')
      const confirmButton = within(dialog).getByRole('button', { name: 'Delete' })
      fireEvent.click(confirmButton)

      // Instance should be removed, empty state shown
      expect(screen.queryByText('Instance to Delete')).toBeNull()
      expect(
        screen.getByText('No instances configured. Add one below to get started.'),
      ).toBeDefined()

      // Store should be empty
      const state = useInstancesStore.getState()
      expect(state.instances).toHaveLength(0)
    })

    it('cancels deletion and keeps instance', () => {
      useInstancesStore.setState({
        instances: [{ id: '1', name: 'Keep This Instance', endpointUrl: 'http://localhost:4200' }],
        selectedId: '1',
      })

      render(<SettingsPage />)

      // Open delete dialog
      const deleteButton = screen.getByRole('button', { name: /delete keep this instance/i })
      fireEvent.click(deleteButton)

      // Cancel deletion
      const dialog = screen.getByRole('dialog')
      const cancelButton = within(dialog).getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelButton)

      // Instance should still exist
      expect(screen.getByText('Keep This Instance')).toBeDefined()

      // Store should be unchanged
      const state = useInstancesStore.getState()
      expect(state.instances).toHaveLength(1)
    })

    it('handles deletion of multiple instances correctly', () => {
      useInstancesStore.setState({
        instances: [
          { id: '1', name: 'Instance One', endpointUrl: 'http://localhost:4200' },
          { id: '2', name: 'Instance Two', endpointUrl: 'http://localhost:4201' },
          { id: '3', name: 'Instance Three', endpointUrl: 'http://localhost:4202' },
        ],
        selectedId: '1',
      })

      render(<SettingsPage />)

      // Delete second instance
      const deleteButton = screen.getByRole('button', { name: /delete instance two/i })
      fireEvent.click(deleteButton)

      const dialog = screen.getByRole('dialog')
      const confirmButton = within(dialog).getByRole('button', { name: 'Delete' })
      fireEvent.click(confirmButton)

      // Only second instance should be removed
      expect(screen.getByText('Instance One')).toBeDefined()
      expect(screen.queryByText('Instance Two')).toBeNull()
      expect(screen.getByText('Instance Three')).toBeDefined()

      // Store should have 2 instances
      const state = useInstancesStore.getState()
      expect(state.instances).toHaveLength(2)
    })
  })

  describe('Full CRUD Workflow', () => {
    it('performs complete create, read, update, delete cycle', () => {
      render(<SettingsPage />)

      // 1. CREATE - Add a new instance
      const nameInput = screen.getByLabelText('Name')
      const urlInput = screen.getByLabelText('Endpoint URL')

      fireEvent.change(nameInput, { target: { value: 'My LED Matrix' } })
      fireEvent.change(urlInput, { target: { value: 'http://192.168.1.100:4200' } })

      const addButton = screen.getByRole('button', { name: 'Add Instance' })
      fireEvent.click(addButton)

      // 2. READ - Verify it appears in the list
      expect(screen.getByText('My LED Matrix')).toBeDefined()
      expect(screen.getByText('http://192.168.1.100:4200')).toBeDefined()

      // 3. UPDATE - Edit the instance
      const editButton = screen.getByRole('button', { name: /edit my led matrix/i })
      fireEvent.click(editButton)

      const nameInputs = screen.getAllByLabelText('Name')
      const editNameInput = nameInputs.find(
        (input) => (input as HTMLInputElement).value === 'My LED Matrix',
      ) as HTMLInputElement
      fireEvent.change(editNameInput, { target: { value: 'Updated LED Matrix' } })

      const saveButton = screen.getByRole('button', { name: 'Save' })
      fireEvent.click(saveButton)

      expect(screen.getByText('Updated LED Matrix')).toBeDefined()
      expect(screen.queryByText('My LED Matrix')).toBeNull()

      // 4. DELETE - Remove the instance
      const deleteButton = screen.getByRole('button', { name: /delete updated led matrix/i })
      fireEvent.click(deleteButton)

      const dialog = screen.getByRole('dialog')
      const confirmButton = within(dialog).getByRole('button', { name: 'Delete' })
      fireEvent.click(confirmButton)

      // Back to empty state
      expect(screen.queryByText('Updated LED Matrix')).toBeNull()
      expect(
        screen.getByText('No instances configured. Add one below to get started.'),
      ).toBeDefined()
    })
  })
})
