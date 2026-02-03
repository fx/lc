import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useInstancesStore } from '@/stores/instances'
import { InstanceList } from './instance-list'

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

describe('InstanceList', () => {
  beforeEach(() => {
    localStorageMock.clear()
    useInstancesStore.setState({ instances: [], selectedId: null })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders empty state when no instances', () => {
    const { container } = render(<InstanceList />)

    expect(
      within(container).getByText('No instances configured. Add one below to get started.'),
    ).toBeDefined()
  })

  it('renders list of instances', () => {
    useInstancesStore.setState({
      instances: [
        { id: '1', name: 'Instance 1', endpointUrl: 'http://localhost:4200' },
        { id: '2', name: 'Instance 2', endpointUrl: 'http://localhost:4201' },
      ],
      selectedId: '1',
    })

    const { container } = render(<InstanceList />)

    expect(within(container).getByText('Instance 1')).toBeDefined()
    expect(within(container).getByText('http://localhost:4200')).toBeDefined()
    expect(within(container).getByText('Instance 2')).toBeDefined()
    expect(within(container).getByText('http://localhost:4201')).toBeDefined()
  })

  it('shows edit and delete buttons for each instance', () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test Instance', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    const { container } = render(<InstanceList />)

    // Find the buttons by aria-label within the container
    const editButtons = within(container).getAllByRole('button', { name: /edit/i })
    const deleteButtons = within(container).getAllByRole('button', { name: /delete/i })

    expect(editButtons.length).toBeGreaterThan(0)
    expect(deleteButtons.length).toBeGreaterThan(0)
  })

  it('enters edit mode when edit button clicked', () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test Instance', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    const { container } = render(<InstanceList />)

    const editButton = within(container).getAllByRole('button', { name: /edit/i })[0]
    fireEvent.click(editButton)

    // Form should now be visible - check for form-specific elements
    expect(within(container).getByLabelText('Name')).toBeDefined()
    expect(within(container).getByLabelText('Endpoint URL')).toBeDefined()
  })

  it('exits edit mode when cancel clicked', () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test Instance', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    const { container } = render(<InstanceList />)

    // Enter edit mode
    const editButton = within(container).getAllByRole('button', { name: /edit/i })[0]
    fireEvent.click(editButton)

    // Cancel
    const cancelButton = within(container).getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButton)

    // Should be back to view mode - form elements should be gone
    expect(within(container).queryByLabelText('Name')).toBeNull()
    expect(within(container).getByText('Test Instance')).toBeDefined()
  })

  it('exits edit mode after save', () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test Instance', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    const { container } = render(<InstanceList />)

    // Enter edit mode
    const editButton = within(container).getAllByRole('button', { name: /edit/i })[0]
    fireEvent.click(editButton)

    // Update name and save
    const nameInput = within(container).getByLabelText('Name')
    fireEvent.change(nameInput, { target: { value: 'Updated Instance' } })
    fireEvent.click(within(container).getByRole('button', { name: 'Save' }))

    // Should be back to view mode with updated name
    expect(within(container).queryByLabelText('Name')).toBeNull()
    expect(within(container).getByText('Updated Instance')).toBeDefined()
  })

  it('opens delete confirmation dialog when delete clicked', () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test Instance', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    const { container } = render(<InstanceList />)

    const deleteButton = within(container).getAllByRole('button', { name: /delete/i })[0]
    fireEvent.click(deleteButton)

    // Dialog renders in a portal, so use screen
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByText('Delete Instance')).toBeDefined()
    expect(screen.getByText(/Are you sure you want to delete/)).toBeDefined()
  })

  it('closes delete dialog when cancel clicked', () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test Instance', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    const { container } = render(<InstanceList />)

    const deleteButton = within(container).getAllByRole('button', { name: /delete/i })[0]
    fireEvent.click(deleteButton)

    const dialog = screen.getByRole('dialog')
    const cancelButton = within(dialog).getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButton)

    expect(screen.queryByRole('dialog')).toBeNull()
    // Instance should still exist
    expect(within(container).getByText('Test Instance')).toBeDefined()
  })

  it('deletes instance when confirmed', () => {
    useInstancesStore.setState({
      instances: [{ id: '1', name: 'Test Instance', endpointUrl: 'http://localhost:4200' }],
      selectedId: '1',
    })

    const { container } = render(<InstanceList />)

    const deleteButton = within(container).getAllByRole('button', { name: /delete/i })[0]
    fireEvent.click(deleteButton)

    const dialog = screen.getByRole('dialog')
    const confirmDeleteButton = within(dialog).getByRole('button', { name: 'Delete' })
    fireEvent.click(confirmDeleteButton)

    // Dialog should close and instance should be gone
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(
      within(container).getByText('No instances configured. Add one below to get started.'),
    ).toBeDefined()
  })
})
