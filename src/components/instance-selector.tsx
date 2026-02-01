import { Link } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
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
        <SelectSeparator />
        <Link
          to="/settings"
          className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        >
          <Settings className="mr-2 h-4 w-4" />
          Manage instances
        </Link>
      </SelectContent>
    </Select>
  )
}
