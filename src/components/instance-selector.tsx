import { Link } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getSelectedInstance, useInstancesStore } from '@/stores/instances'

export function InstanceSelector() {
  const instances = useInstancesStore((state) => state.instances)
  const selectedId = useInstancesStore((state) => state.selectedId)
  const selectInstance = useInstancesStore((state) => state.selectInstance)
  const selectedInstance = useInstancesStore(getSelectedInstance)

  if (instances.length === 0) {
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
      <Select value={selectedId ?? undefined} onValueChange={selectInstance}>
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
