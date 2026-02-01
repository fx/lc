import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Instance {
  id: string
  name: string
  endpointUrl: string
}

interface InstancesState {
  instances: Instance[]
  selectedId: string | null
  addInstance: (name: string, endpointUrl: string) => void
  updateInstance: (id: string, name: string, endpointUrl: string) => void
  deleteInstance: (id: string) => void
  selectInstance: (id: string | null) => void
}

export const useInstancesStore = create<InstancesState>()(
  persist(
    (set) => ({
      instances: [],
      selectedId: null,

      addInstance: (name, endpointUrl) => {
        const id = nanoid()
        set((state) => {
          const newInstances = [...state.instances, { id, name, endpointUrl }]
          // Auto-select first instance if none selected
          const selectedId = state.selectedId ?? id
          return { instances: newInstances, selectedId }
        })
      },

      updateInstance: (id, name, endpointUrl) => {
        set((state) => ({
          instances: state.instances.map((instance) =>
            instance.id === id ? { ...instance, name, endpointUrl } : instance,
          ),
        }))
      },

      deleteInstance: (id) => {
        set((state) => {
          const newInstances = state.instances.filter((instance) => instance.id !== id)
          // Clear selection if deleted instance was selected
          const selectedId =
            state.selectedId === id ? (newInstances[0]?.id ?? null) : state.selectedId
          return { instances: newInstances, selectedId }
        })
      },

      selectInstance: (id) => {
        set({ selectedId: id })
      },
    }),
    {
      name: 'lc-instances',
    },
  ),
)

export const getSelectedInstance = (state: InstancesState): Instance | undefined => {
  return state.instances.find((instance) => instance.id === state.selectedId)
}
