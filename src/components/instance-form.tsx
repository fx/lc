import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type Instance, useInstancesStore } from '@/stores/instances'

interface InstanceFormProps {
  instance?: Instance
  onSuccess?: () => void
  onCancel?: () => void
}

export function InstanceForm({ instance, onSuccess, onCancel }: InstanceFormProps) {
  const [name, setName] = useState(instance?.name ?? '')
  const [endpointUrl, setEndpointUrl] = useState(instance?.endpointUrl ?? '')
  const addInstance = useInstancesStore((state) => state.addInstance)
  const updateInstance = useInstancesStore((state) => state.updateInstance)

  const isEditing = !!instance
  const isValid = name.trim() !== '' && endpointUrl.trim() !== ''

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    if (isEditing) {
      updateInstance(instance.id, name.trim(), endpointUrl.trim())
    } else {
      addInstance(name.trim(), endpointUrl.trim())
      setName('')
      setEndpointUrl('')
    }
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Living Room Display"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="endpointUrl">Endpoint URL</Label>
        <Input
          id="endpointUrl"
          value={endpointUrl}
          onChange={(e) => setEndpointUrl(e.target.value)}
          placeholder="http://192.168.1.100:4200"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={!isValid}>
          {isEditing ? 'Save' : 'Add Instance'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
