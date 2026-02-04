import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { InstanceForm } from '@/components/instance-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Instance } from '@/db/schema'
import { useDeleteInstance, useInstances } from '@/hooks/use-instances'

export function InstanceList() {
  const { data: instances, isLoading, error } = useInstances()
  const deleteInstanceMutation = useDeleteInstance()
  const [editingInstance, setEditingInstance] = useState<Instance | null>(null)
  const [deletingInstance, setDeletingInstance] = useState<Instance | null>(null)

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading instances...</p>
  }

  if (error) {
    return <p className="text-destructive text-sm">Failed to load instances: {error.message}</p>
  }

  if (!instances || instances.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No instances configured. Add one below to get started.
      </p>
    )
  }

  const handleDelete = async () => {
    if (deletingInstance) {
      try {
        await deleteInstanceMutation.mutateAsync(deletingInstance.id)
        setDeletingInstance(null)
      } catch (error) {
        // Error is handled by mutation state, but log for debugging
        console.error('Failed to delete instance:', error)
      }
    }
  }

  return (
    <>
      <div className="space-y-2">
        {instances.map((instance) => (
          <div
            key={instance.id}
            className="flex items-center justify-between p-3 border rounded-md"
          >
            {editingInstance?.id === instance.id ? (
              <div className="flex-1">
                <InstanceForm
                  instance={instance}
                  onSuccess={() => setEditingInstance(null)}
                  onCancel={() => setEditingInstance(null)}
                />
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{instance.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{instance.endpointUrl}</p>
                </div>
                <div className="flex gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingInstance(instance)}
                    aria-label={`Edit ${instance.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingInstance(instance)}
                    aria-label={`Delete ${instance.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!deletingInstance} onOpenChange={() => setDeletingInstance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Instance</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingInstance?.name}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteInstanceMutation.error && (
            <p className="text-destructive text-sm">
              Failed to delete: {deleteInstanceMutation.error.message}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingInstance(null)}
              disabled={deleteInstanceMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteInstanceMutation.isPending}
            >
              {deleteInstanceMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
