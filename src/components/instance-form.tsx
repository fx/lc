import { type FormEvent, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateEndpointUrl } from '@/lib/utils'
import { type Instance, useInstancesStore } from '@/stores/instances'

interface InstanceFormProps {
  instance?: Instance
  onSuccess?: () => void
  onCancel?: () => void
}

export function InstanceForm({ instance, onSuccess, onCancel }: InstanceFormProps) {
  const formId = useId()
  const [name, setName] = useState(instance?.name ?? '')
  const [endpointUrl, setEndpointUrl] = useState(instance?.endpointUrl ?? '')
  const [urlError, setUrlError] = useState<string | null>(null)
  const addInstance = useInstancesStore((state) => state.addInstance)
  const updateInstance = useInstancesStore((state) => state.updateInstance)

  const nameId = `${formId}-name`
  const endpointUrlId = `${formId}-endpointUrl`
  const endpointUrlErrorId = `${formId}-endpointUrl-error`

  const isEditing = !!instance
  const urlValidation = validateEndpointUrl(endpointUrl)
  const isValid = name.trim() !== '' && urlValidation.valid

  const handleUrlChange = (value: string) => {
    setEndpointUrl(value)
    // Clear error while typing, only show on blur or submit
    if (urlError) {
      setUrlError(null)
    }
  }

  const handleUrlBlur = () => {
    if (endpointUrl.trim()) {
      const result = validateEndpointUrl(endpointUrl)
      if (!result.valid) {
        setUrlError(result.error ?? null)
      }
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const result = validateEndpointUrl(endpointUrl)
    if (!result.valid) {
      setUrlError(result.error ?? null)
      return
    }

    if (!name.trim()) return

    if (isEditing) {
      updateInstance(instance.id, name.trim(), endpointUrl.trim())
    } else {
      addInstance(name.trim(), endpointUrl.trim())
      setName('')
      setEndpointUrl('')
      setUrlError(null)
    }
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={nameId}>Name</Label>
        <Input
          id={nameId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Living Room Display"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={endpointUrlId}>Endpoint URL</Label>
        <Input
          id={endpointUrlId}
          value={endpointUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="http://192.168.1.100:4200"
          aria-invalid={!!urlError}
          aria-describedby={urlError ? endpointUrlErrorId : undefined}
        />
        {urlError && (
          <p id={endpointUrlErrorId} className="text-sm text-destructive">
            {urlError}
          </p>
        )}
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
