import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Instance } from '@/db/schema'
import type { Result } from '@/lib/types'
import {
  createInstance,
  deleteInstance,
  getInstanceById,
  getInstances,
  updateInstance,
} from '@/server/instances'

const INSTANCES_KEY = ['instances'] as const

class AppError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
  }
}

function unwrapResult<T>(result: Result<T>): T {
  if (!result.success) {
    throw new AppError(result.error.code, result.error.message, result.error.status)
  }
  return result.data
}

export function useInstances() {
  return useQuery({
    queryKey: INSTANCES_KEY,
    queryFn: async () => {
      const result = await getInstances()
      return unwrapResult(result)
    },
  })
}

export function useInstance(id: string | null) {
  return useQuery({
    queryKey: [...INSTANCES_KEY, id],
    queryFn: async () => {
      if (!id) return null
      const result = await getInstanceById({ data: id })
      return unwrapResult(result)
    },
    enabled: !!id,
  })
}

export function useCreateInstance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; endpointUrl: string }) => {
      const result = await createInstance({ data })
      return unwrapResult(result)
    },
    onMutate: async (newInstance) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: INSTANCES_KEY })

      // Snapshot the previous value
      const previousInstances = queryClient.getQueryData<Instance[]>(INSTANCES_KEY)

      // Optimistically add the new instance with a temporary ID
      const optimisticInstance: Instance = {
        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
        name: newInstance.name,
        endpointUrl: newInstance.endpointUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      queryClient.setQueryData<Instance[]>(INSTANCES_KEY, (old) =>
        old ? [...old, optimisticInstance] : [optimisticInstance],
      )

      return { previousInstances }
    },
    onError: (_error, _newInstance, context) => {
      // Roll back to the previous value on error
      if (context?.previousInstances) {
        queryClient.setQueryData(INSTANCES_KEY, context.previousInstances)
      }
    },
    onSettled: () => {
      // Always refetch to ensure we have the correct server state
      queryClient.invalidateQueries({ queryKey: INSTANCES_KEY })
    },
  })
}

export function useUpdateInstance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { id: string; name: string; endpointUrl: string }) => {
      const result = await updateInstance({ data })
      return unwrapResult(result)
    },
    onMutate: async (updatedInstance) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: INSTANCES_KEY })

      // Snapshot the previous value
      const previousInstances = queryClient.getQueryData<Instance[]>(INSTANCES_KEY)

      // Optimistically update the instance
      queryClient.setQueryData<Instance[]>(INSTANCES_KEY, (old) =>
        old?.map((instance) =>
          instance.id === updatedInstance.id
            ? {
                ...instance,
                name: updatedInstance.name,
                endpointUrl: updatedInstance.endpointUrl,
                updatedAt: new Date(),
              }
            : instance,
        ),
      )

      return { previousInstances }
    },
    onError: (_error, _updatedInstance, context) => {
      // Roll back to the previous value on error
      if (context?.previousInstances) {
        queryClient.setQueryData(INSTANCES_KEY, context.previousInstances)
      }
    },
    onSettled: () => {
      // Always refetch to ensure we have the correct server state
      queryClient.invalidateQueries({ queryKey: INSTANCES_KEY })
    },
  })
}

export function useDeleteInstance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteInstance({ data: id })
      return unwrapResult(result)
    },
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: INSTANCES_KEY })

      // Snapshot the previous value
      const previousInstances = queryClient.getQueryData<Instance[]>(INSTANCES_KEY)

      // Optimistically remove the instance
      queryClient.setQueryData<Instance[]>(INSTANCES_KEY, (old) =>
        old?.filter((instance) => instance.id !== deletedId),
      )

      return { previousInstances }
    },
    onError: (_error, _deletedId, context) => {
      // Roll back to the previous value on error
      if (context?.previousInstances) {
        queryClient.setQueryData(INSTANCES_KEY, context.previousInstances)
      }
    },
    onSettled: () => {
      // Always refetch to ensure we have the correct server state
      queryClient.invalidateQueries({ queryKey: INSTANCES_KEY })
    },
  })
}
