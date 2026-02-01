import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { type PersistStorage, persist, type StorageValue } from 'zustand/middleware'
import { sanitizeString, validateEndpointUrl } from '@/lib/utils'

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

/**
 * Sanitizes an instance object to ensure safe values.
 * Validates URL protocol and sanitizes string fields.
 */
function sanitizeInstance(instance: unknown): Instance | null {
  if (!instance || typeof instance !== 'object') {
    return null
  }

  const obj = instance as Record<string, unknown>

  // Validate required fields exist and are strings
  if (
    typeof obj.id !== 'string' ||
    typeof obj.name !== 'string' ||
    typeof obj.endpointUrl !== 'string'
  ) {
    return null
  }

  // Validate URL is safe (http/https only)
  const urlValidation = validateEndpointUrl(obj.endpointUrl)
  if (!urlValidation.valid) {
    return null
  }

  return {
    id: sanitizeString(obj.id),
    name: sanitizeString(obj.name),
    endpointUrl: obj.endpointUrl.trim(), // Already validated, just trim
  }
}

/**
 * Custom storage with error handling for corrupted localStorage.
 * If data is invalid or corrupted, returns empty state instead of crashing.
 */
const safeStorage: PersistStorage<InstancesState> = {
  getItem: (name: string): StorageValue<InstancesState> | null => {
    try {
      const raw = localStorage.getItem(name)
      if (!raw) return null

      const parsed = JSON.parse(raw) as StorageValue<InstancesState>

      // Validate structure
      if (!parsed || typeof parsed !== 'object' || !parsed.state) {
        console.warn('[instances] Invalid localStorage structure, resetting to empty state')
        localStorage.removeItem(name)
        return null
      }

      // Sanitize instances array
      const rawInstances = parsed.state.instances
      if (!Array.isArray(rawInstances)) {
        console.warn('[instances] Invalid instances array, resetting to empty state')
        localStorage.removeItem(name)
        return null
      }

      const sanitizedInstances: Instance[] = []
      for (const instance of rawInstances) {
        const sanitized = sanitizeInstance(instance)
        if (sanitized) {
          sanitizedInstances.push(sanitized)
        }
      }

      // Validate selectedId
      let selectedId = parsed.state.selectedId
      if (selectedId !== null && typeof selectedId !== 'string') {
        selectedId = null
      }
      // Ensure selectedId references an existing instance
      if (selectedId && !sanitizedInstances.some((i) => i.id === selectedId)) {
        selectedId = sanitizedInstances[0]?.id ?? null
      }

      return {
        ...parsed,
        state: {
          ...parsed.state,
          instances: sanitizedInstances,
          selectedId,
        },
      }
    } catch (error) {
      console.warn('[instances] Failed to parse localStorage, resetting to empty state:', error)
      try {
        localStorage.removeItem(name)
      } catch {
        // Ignore removal errors
      }
      return null
    }
  },

  setItem: (name: string, value: StorageValue<InstancesState>): void => {
    try {
      localStorage.setItem(name, JSON.stringify(value))
    } catch (error) {
      console.error('[instances] Failed to save to localStorage:', error)
    }
  },

  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name)
    } catch (error) {
      console.error('[instances] Failed to remove from localStorage:', error)
    }
  },
}

export const useInstancesStore = create<InstancesState>()(
  persist(
    (set) => ({
      instances: [],
      selectedId: null,

      addInstance: (name, endpointUrl) => {
        // Sanitize inputs
        const sanitizedName = sanitizeString(name)
        const sanitizedUrl = endpointUrl.trim()

        // Validate URL before adding
        if (!validateEndpointUrl(sanitizedUrl).valid) {
          console.error('[instances] Invalid URL, not adding instance')
          return
        }

        const id = nanoid()
        set((state) => {
          const newInstances = [
            ...state.instances,
            { id, name: sanitizedName, endpointUrl: sanitizedUrl },
          ]
          // Auto-select first instance if none selected
          const selectedId = state.selectedId ?? id
          return { instances: newInstances, selectedId }
        })
      },

      updateInstance: (id, name, endpointUrl) => {
        // Sanitize inputs
        const sanitizedName = sanitizeString(name)
        const sanitizedUrl = endpointUrl.trim()

        // Validate URL before updating
        if (!validateEndpointUrl(sanitizedUrl).valid) {
          console.error('[instances] Invalid URL, not updating instance')
          return
        }

        set((state) => ({
          instances: state.instances.map((instance) =>
            instance.id === id
              ? { ...instance, name: sanitizedName, endpointUrl: sanitizedUrl }
              : instance,
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
      storage: safeStorage,
    },
  ),
)

export const getSelectedInstance = (state: InstancesState): Instance | undefined => {
  return state.instances.find((instance) => instance.id === state.selectedId)
}
