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
import { type Instance, useInstancesStore } from '@/stores/instances'

export function InstanceList() {
  const instances = useInstancesStore((state) => state.instances)
  const deleteInstance = useInstancesStore((state) => state.deleteInstance)
  const [editingInstance, setEditingInstance] = useState<Instance | null>(null)
  const [deletingInstance, setDeletingInstance] = useState<Instance | null>(null)

  if (instances.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No instances configured. Add one below to get started.
      </p>
    )
  }

  const handleDelete = () => {
    if (deletingInstance) {
      deleteInstance(deletingInstance.id)
      setDeletingInstance(null)
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingInstance(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
