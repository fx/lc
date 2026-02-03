import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useInstancesStore } from '@/stores/instances'
import { InstanceForm } from './instance-form'

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

function getForm(container: HTMLElement): HTMLFormElement {
  const form = container.querySelector('form')
  if (!form) throw new Error('Form not found')
  return form
}

describe('InstanceForm', () => {
  beforeEach(() => {
    localStorageMock.clear()
    useInstancesStore.setState({ instances: [], selectedId: null })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders empty form for new instance', () => {
    const { container } = render(<InstanceForm />)
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
    }
    const { container } = render(<InstanceForm instance={instance} />)
    const form = getForm(container)

    expect(within(form).getByDisplayValue('Test Instance')).toBeDefined()
    expect(within(form).getByDisplayValue('http://localhost:4200')).toBeDefined()
    expect(within(form).getByRole('button', { name: 'Save' })).toBeDefined()
  })

  it('shows cancel button when onCancel provided', () => {
    const onCancel = vi.fn()
    const { container } = render(<InstanceForm onCancel={onCancel} />)
    const form = getForm(container)

    const cancelButton = within(form).getByRole('button', { name: 'Cancel' })
    expect(cancelButton).toBeDefined()

    fireEvent.click(cancelButton)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables submit when form is invalid', () => {
    const { container } = render(<InstanceForm />)
    const form = getForm(container)

    const submitButton = within(form).getByRole('button', { name: 'Add Instance' })
    expect(submitButton).toHaveProperty('disabled', true)
  })

  it('enables submit when form is valid', () => {
    const { container } = render(<InstanceForm />)
    const form = getForm(container)

    const nameInput = within(form).getByLabelText('Name')
    const urlInput = within(form).getByLabelText('Endpoint URL')

    fireEvent.change(nameInput, { target: { value: 'My Instance' } })
    fireEvent.change(urlInput, { target: { value: 'http://localhost:4200' } })

    const submitButton = within(form).getByRole('button', { name: 'Add Instance' })
    expect(submitButton).toHaveProperty('disabled', false)
  })

  it('adds new instance on submit', () => {
    const onSuccess = vi.fn()
    const { container } = render(<InstanceForm onSuccess={onSuccess} />)
    const form = getForm(container)

    const nameInput = within(form).getByLabelText('Name')
    const urlInput = within(form).getByLabelText('Endpoint URL')

    fireEvent.change(nameInput, { target: { value: 'New Instance' } })
    fireEvent.change(urlInput, { target: { value: 'http://localhost:4200' } })

    const submitButton = within(form).getByRole('button', { name: 'Add Instance' })
    fireEvent.click(submitButton)

    expect(onSuccess).toHaveBeenCalledTimes(1)

    const state = useInstancesStore.getState()
    expect(state.instances).toHaveLength(1)
    expect(state.instances[0].name).toBe('New Instance')
    expect(state.instances[0].endpointUrl).toBe('http://localhost:4200')
  })

  it('updates existing instance on submit', () => {
    const instance = {
      id: '1',
      name: 'Old Name',
      endpointUrl: 'http://localhost:4200',
    }
    useInstancesStore.setState({ instances: [instance], selectedId: '1' })

    const onSuccess = vi.fn()
    const { container } = render(<InstanceForm instance={instance} onSuccess={onSuccess} />)
    const form = getForm(container)

    const nameInput = within(form).getByLabelText('Name')
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } })

    const submitButton = within(form).getByRole('button', { name: 'Save' })
    fireEvent.click(submitButton)

    expect(onSuccess).toHaveBeenCalledTimes(1)

    const state = useInstancesStore.getState()
    expect(state.instances[0].name).toBe('Updated Name')
  })

  it('shows validation error for invalid URL on blur', () => {
    const { container } = render(<InstanceForm />)
    const form = getForm(container)

    const urlInput = within(form).getByLabelText('Endpoint URL')
    fireEvent.change(urlInput, { target: { value: 'not-a-url' } })
    fireEvent.blur(urlInput)

    expect(within(form).getByText(/invalid url/i)).toBeDefined()
  })

  it('clears validation error when typing', () => {
    const { container } = render(<InstanceForm />)
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
    const { container } = render(<InstanceForm />)
    const form = getForm(container)

    const nameInput = within(form).getByLabelText('Name')
    const urlInput = within(form).getByLabelText('Endpoint URL')

    fireEvent.change(nameInput, { target: { value: 'My Instance' } })
    fireEvent.change(urlInput, { target: { value: 'javascript:alert(1)' } })

    // Form submits but validation catches the bad URL
    fireEvent.submit(form)

    expect(within(form).getByText(/URL must use http:\/\/ or https:\/\//i)).toBeDefined()
  })

  it('clears form after adding new instance', () => {
    const { container } = render(<InstanceForm />)
    const form = getForm(container)

    const nameInput = within(form).getByLabelText('Name') as HTMLInputElement
    const urlInput = within(form).getByLabelText('Endpoint URL') as HTMLInputElement

    fireEvent.change(nameInput, { target: { value: 'New Instance' } })
    fireEvent.change(urlInput, { target: { value: 'http://localhost:4200' } })

    const submitButton = within(form).getByRole('button', { name: 'Add Instance' })
    fireEvent.click(submitButton)

    expect(nameInput.value).toBe('')
    expect(urlInput.value).toBe('')
  })
})
