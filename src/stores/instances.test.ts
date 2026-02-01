import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSelectedInstance, useInstancesStore } from './instances'

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
    // Direct access for testing
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore
    },
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('useInstancesStore', () => {
  beforeEach(() => {
    localStorageMock.clear()
    // Reset store state
    useInstancesStore.setState({ instances: [], selectedId: null })
  })

  describe('addInstance', () => {
    it('adds an instance to the store', () => {
      const { addInstance } = useInstancesStore.getState()
      addInstance('Test Instance', 'http://localhost:4200')

      const { instances } = useInstancesStore.getState()
      expect(instances).toHaveLength(1)
      expect(instances[0].name).toBe('Test Instance')
      expect(instances[0].endpointUrl).toBe('http://localhost:4200')
      expect(instances[0].id).toBeDefined()
    })

    it('auto-selects the first instance when none selected', () => {
      const { addInstance } = useInstancesStore.getState()
      addInstance('First Instance', 'http://localhost:4200')

      const { selectedId, instances } = useInstancesStore.getState()
      expect(selectedId).toBe(instances[0].id)
    })

    it('does not change selection when adding second instance', () => {
      const { addInstance } = useInstancesStore.getState()
      addInstance('First Instance', 'http://localhost:4200')
      const { selectedId: firstId } = useInstancesStore.getState()

      addInstance('Second Instance', 'http://localhost:4201')
      const { selectedId } = useInstancesStore.getState()

      expect(selectedId).toBe(firstId)
    })
  })

  describe('updateInstance', () => {
    it('updates an existing instance', () => {
      const { addInstance, updateInstance } = useInstancesStore.getState()
      addInstance('Original', 'http://original:4200')
      const { instances } = useInstancesStore.getState()
      const id = instances[0].id

      updateInstance(id, 'Updated', 'http://updated:4200')

      const { instances: updatedInstances } = useInstancesStore.getState()
      expect(updatedInstances[0].name).toBe('Updated')
      expect(updatedInstances[0].endpointUrl).toBe('http://updated:4200')
    })

    it('preserves the instance id', () => {
      const { addInstance, updateInstance } = useInstancesStore.getState()
      addInstance('Original', 'http://original:4200')
      const { instances } = useInstancesStore.getState()
      const id = instances[0].id

      updateInstance(id, 'Updated', 'http://updated:4200')

      const { instances: updatedInstances } = useInstancesStore.getState()
      expect(updatedInstances[0].id).toBe(id)
    })
  })

  describe('deleteInstance', () => {
    it('removes an instance from the store', () => {
      const { addInstance, deleteInstance } = useInstancesStore.getState()
      addInstance('To Delete', 'http://localhost:4200')
      const { instances } = useInstancesStore.getState()
      const id = instances[0].id

      deleteInstance(id)

      const { instances: remainingInstances } = useInstancesStore.getState()
      expect(remainingInstances).toHaveLength(0)
    })

    it('clears selection when deleting selected instance', () => {
      const { addInstance, deleteInstance } = useInstancesStore.getState()
      addInstance('Only Instance', 'http://localhost:4200')
      const { instances } = useInstancesStore.getState()
      const id = instances[0].id

      deleteInstance(id)

      const { selectedId } = useInstancesStore.getState()
      expect(selectedId).toBeNull()
    })

    it('selects first remaining instance when deleting selected', () => {
      const { addInstance, deleteInstance, selectInstance } = useInstancesStore.getState()
      addInstance('First', 'http://localhost:4200')
      addInstance('Second', 'http://localhost:4201')
      const { instances } = useInstancesStore.getState()
      selectInstance(instances[1].id)

      deleteInstance(instances[1].id)

      const { selectedId, instances: remaining } = useInstancesStore.getState()
      expect(selectedId).toBe(remaining[0].id)
    })

    it('preserves selection when deleting non-selected instance', () => {
      const { addInstance, deleteInstance } = useInstancesStore.getState()
      addInstance('First', 'http://localhost:4200')
      addInstance('Second', 'http://localhost:4201')
      const { instances, selectedId: originalSelected } = useInstancesStore.getState()

      deleteInstance(instances[1].id)

      const { selectedId } = useInstancesStore.getState()
      expect(selectedId).toBe(originalSelected)
    })
  })

  describe('selectInstance', () => {
    it('updates the selected instance', () => {
      const { addInstance, selectInstance } = useInstancesStore.getState()
      addInstance('First', 'http://localhost:4200')
      addInstance('Second', 'http://localhost:4201')
      const { instances } = useInstancesStore.getState()

      selectInstance(instances[1].id)

      const { selectedId } = useInstancesStore.getState()
      expect(selectedId).toBe(instances[1].id)
    })

    it('allows setting selection to null', () => {
      const { addInstance, selectInstance } = useInstancesStore.getState()
      addInstance('Test', 'http://localhost:4200')

      selectInstance(null)

      const { selectedId } = useInstancesStore.getState()
      expect(selectedId).toBeNull()
    })
  })

  describe('getSelectedInstance', () => {
    it('returns the selected instance', () => {
      const { addInstance } = useInstancesStore.getState()
      addInstance('Selected', 'http://localhost:4200')

      const state = useInstancesStore.getState()
      const selected = getSelectedInstance(state)

      expect(selected?.name).toBe('Selected')
    })

    it('returns undefined when no instance selected', () => {
      useInstancesStore.setState({ instances: [], selectedId: null })

      const state = useInstancesStore.getState()
      const selected = getSelectedInstance(state)

      expect(selected).toBeUndefined()
    })
  })

  describe('URL validation', () => {
    it('rejects javascript: URLs', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { addInstance } = useInstancesStore.getState()
      addInstance('Malicious', 'javascript:alert(1)')

      const { instances } = useInstancesStore.getState()
      expect(instances).toHaveLength(0)
      consoleSpy.mockRestore()
    })

    it('rejects data: URLs', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { addInstance } = useInstancesStore.getState()
      addInstance('Malicious', 'data:text/html,<script>alert(1)</script>')

      const { instances } = useInstancesStore.getState()
      expect(instances).toHaveLength(0)
      consoleSpy.mockRestore()
    })

    it('rejects file: URLs', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { addInstance } = useInstancesStore.getState()
      addInstance('Malicious', 'file:///etc/passwd')

      const { instances } = useInstancesStore.getState()
      expect(instances).toHaveLength(0)
      consoleSpy.mockRestore()
    })

    it('rejects invalid URLs on update', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { addInstance, updateInstance } = useInstancesStore.getState()
      addInstance('Valid', 'http://localhost:4200')

      const { instances } = useInstancesStore.getState()
      const id = instances[0].id

      updateInstance(id, 'Updated', 'javascript:alert(1)')

      const { instances: updated } = useInstancesStore.getState()
      // URL should not have changed
      expect(updated[0].endpointUrl).toBe('http://localhost:4200')
      consoleSpy.mockRestore()
    })
  })

  describe('input sanitization', () => {
    it('trims whitespace from name and URL', () => {
      const { addInstance } = useInstancesStore.getState()
      addInstance('  Padded Name  ', '  http://localhost:4200  ')

      const { instances } = useInstancesStore.getState()
      expect(instances[0].name).toBe('Padded Name')
      expect(instances[0].endpointUrl).toBe('http://localhost:4200')
    })

    it('removes control characters from name', () => {
      const { addInstance } = useInstancesStore.getState()
      addInstance('Name\x00With\x01Control', 'http://localhost:4200')

      const { instances } = useInstancesStore.getState()
      expect(instances[0].name).toBe('NameWithControl')
    })
  })

  describe('corrupted localStorage handling', () => {
    it('recovers from invalid JSON in localStorage', () => {
      // Set corrupted data before store initialization
      localStorageMock.setItem('lc-instances', 'not valid json {{{')

      // Force rehydration by getting the persist API
      const persistApi = useInstancesStore.persist
      persistApi.rehydrate()

      const { instances } = useInstancesStore.getState()
      expect(instances).toHaveLength(0)
    })

    it('recovers from invalid structure in localStorage', () => {
      // Set data with wrong structure
      localStorageMock.setItem('lc-instances', JSON.stringify({ foo: 'bar' }))

      const persistApi = useInstancesStore.persist
      persistApi.rehydrate()

      const { instances } = useInstancesStore.getState()
      expect(instances).toHaveLength(0)
    })

    it('filters out instances with invalid URLs on load', () => {
      // Set data with a mix of valid and invalid instances
      const data = {
        state: {
          instances: [
            { id: '1', name: 'Valid', endpointUrl: 'http://localhost:4200' },
            { id: '2', name: 'Invalid', endpointUrl: 'javascript:alert(1)' },
            { id: '3', name: 'Also Valid', endpointUrl: 'https://example.com' },
          ],
          selectedId: '1',
        },
        version: 0,
      }
      localStorageMock.setItem('lc-instances', JSON.stringify(data))

      const persistApi = useInstancesStore.persist
      persistApi.rehydrate()

      const { instances } = useInstancesStore.getState()
      expect(instances).toHaveLength(2)
      expect(instances.map((i) => i.name)).toEqual(['Valid', 'Also Valid'])
    })

    it('resets selectedId if it references a filtered instance', () => {
      const data = {
        state: {
          instances: [
            { id: '1', name: 'Invalid', endpointUrl: 'javascript:alert(1)' },
            { id: '2', name: 'Valid', endpointUrl: 'http://localhost:4200' },
          ],
          selectedId: '1', // References the invalid instance
        },
        version: 0,
      }
      localStorageMock.setItem('lc-instances', JSON.stringify(data))

      const persistApi = useInstancesStore.persist
      persistApi.rehydrate()

      const { selectedId, instances } = useInstancesStore.getState()
      // Should select the first valid instance instead
      expect(selectedId).toBe('2')
      expect(instances).toHaveLength(1)
    })

    it('handles instances array that is not an array', () => {
      const data = {
        state: {
          instances: 'not an array',
          selectedId: null,
        },
        version: 0,
      }
      localStorageMock.setItem('lc-instances', JSON.stringify(data))

      const persistApi = useInstancesStore.persist
      persistApi.rehydrate()

      const { instances } = useInstancesStore.getState()
      expect(instances).toHaveLength(0)
    })

    it('handles instance with missing fields', () => {
      const data = {
        state: {
          instances: [
            { id: '1', name: 'Valid', endpointUrl: 'http://localhost:4200' },
            { id: '2', name: 'Missing URL' }, // No endpointUrl
            { id: '3', endpointUrl: 'http://example.com' }, // No name
          ],
          selectedId: '1',
        },
        version: 0,
      }
      localStorageMock.setItem('lc-instances', JSON.stringify(data))

      const persistApi = useInstancesStore.persist
      persistApi.rehydrate()

      const { instances } = useInstancesStore.getState()
      expect(instances).toHaveLength(1)
      expect(instances[0].name).toBe('Valid')
    })
  })
})
