import { create } from 'zustand'

interface InstancesState {
  selectedId: string | null
  setSelectedId: (id: string | null) => void
}

export const useInstancesStore = create<InstancesState>()((set) => ({
  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),
}))
