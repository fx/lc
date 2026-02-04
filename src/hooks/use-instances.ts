import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createInstance,
  deleteInstance,
  getInstanceById,
  getInstances,
  updateInstance,
} from '@/server/instances'

const INSTANCES_KEY = ['instances'] as const

export function useInstances() {
  return useQuery({
    queryKey: INSTANCES_KEY,
    queryFn: () => getInstances(),
  })
}

export function useInstance(id: string | null) {
  return useQuery({
    queryKey: [...INSTANCES_KEY, id],
    queryFn: () => (id ? getInstanceById({ data: id }) : null),
    enabled: !!id,
  })
}

export function useCreateInstance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; endpointUrl: string }) => createInstance({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTANCES_KEY })
    },
  })
}

export function useUpdateInstance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { id: string; name: string; endpointUrl: string }) =>
      updateInstance({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTANCES_KEY })
    },
  })
}

export function useDeleteInstance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteInstance({ data: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTANCES_KEY })
    },
  })
}
