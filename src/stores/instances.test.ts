import { beforeEach, describe, expect, it } from 'vitest'
import { useInstancesStore } from './instances'

describe('useInstancesStore', () => {
  beforeEach(() => {
    // Reset store state
    useInstancesStore.setState({ selectedId: null })
  })

  describe('setSelectedId', () => {
    it('updates the selected instance id', () => {
      const { setSelectedId } = useInstancesStore.getState()
      setSelectedId('test-id-123')

      const { selectedId } = useInstancesStore.getState()
      expect(selectedId).toBe('test-id-123')
    })

    it('allows setting selection to null', () => {
      const { setSelectedId } = useInstancesStore.getState()
      setSelectedId('test-id')

      setSelectedId(null)

      const { selectedId } = useInstancesStore.getState()
      expect(selectedId).toBeNull()
    })

    it('can change selection between different ids', () => {
      const { setSelectedId } = useInstancesStore.getState()
      setSelectedId('first-id')

      expect(useInstancesStore.getState().selectedId).toBe('first-id')

      setSelectedId('second-id')

      expect(useInstancesStore.getState().selectedId).toBe('second-id')
    })
  })

  describe('initial state', () => {
    it('starts with null selectedId', () => {
      useInstancesStore.setState({ selectedId: null })
      const { selectedId } = useInstancesStore.getState()
      expect(selectedId).toBeNull()
    })
  })
})
