import { beforeEach, describe, expect, it } from 'vitest'
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
})
