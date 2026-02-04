import { Link } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import { useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useInstances } from '@/hooks/use-instances'
import { useInstancesStore } from '@/stores/instances'

export function InstanceSelector() {
  const { data: instances, isLoading } = useInstances()
  const selectedId = useInstancesStore((state) => state.selectedId)
  const setSelectedId = useInstancesStore((state) => state.setSelectedId)

  const selectedInstance = instances?.find((i) => i.id === selectedId)

  // Auto-select first instance if none selected and instances exist
  useEffect(() => {
    if (!selectedId && instances && instances.length > 0) {
      setSelectedId(instances[0].id)
    }
    // If selected instance no longer exists, select the first available
    if (selectedId && instances && instances.length > 0 && !selectedInstance) {
      setSelectedId(instances[0].id)
    }
    // Clear selection if no instances exist
    if (selectedId && instances && instances.length === 0) {
      setSelectedId(null)
    }
  }, [selectedId, instances, selectedInstance, setSelectedId])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Loading...</span>
      </div>
    )
  }

  if (!instances || instances.length === 0) {
    return (
      <Link
        to="/settings"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Settings className="h-4 w-4" />
        <span>Configure instance</span>
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedId ?? undefined} onValueChange={setSelectedId}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select instance">
            {selectedInstance?.name ?? 'Select instance'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {instances.map((instance) => (
            <SelectItem key={instance.id} value={instance.id}>
              {instance.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Link
        to="/settings"
        className="flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Manage instances"
      >
        <Settings className="h-4 w-4" />
      </Link>
    </div>
  )
}
