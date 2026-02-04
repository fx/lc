import { type FormEvent, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Instance } from '@/db/schema'
import { useCreateInstance, useUpdateInstance } from '@/hooks/use-instances'
import { validateEndpointUrl } from '@/lib/utils'

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
  const [apiError, setApiError] = useState<string | null>(null)

  const createInstance = useCreateInstance()
  const updateInstance = useUpdateInstance()

  const nameId = `${formId}-name`
  const endpointUrlId = `${formId}-endpointUrl`
  const endpointUrlErrorId = `${formId}-endpointUrl-error`

  const isEditing = !!instance
  const urlValidation = validateEndpointUrl(endpointUrl)
  const isValid = name.trim() !== '' && urlValidation.valid
  const isPending = createInstance.isPending || updateInstance.isPending

  const handleUrlChange = (value: string) => {
    setEndpointUrl(value)
    // Clear error while typing, only show on blur or submit
    if (urlError) {
      setUrlError(null)
    }
    if (apiError) {
      setApiError(null)
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const result = validateEndpointUrl(endpointUrl)
    if (!result.valid) {
      setUrlError(result.error ?? null)
      return
    }

    if (!name.trim()) return

    try {
      if (isEditing) {
        await updateInstance.mutateAsync({
          id: instance.id,
          name: name.trim(),
          endpointUrl: endpointUrl.trim(),
        })
      } else {
        await createInstance.mutateAsync({
          name: name.trim(),
          endpointUrl: endpointUrl.trim(),
        })
        setName('')
        setEndpointUrl('')
        setUrlError(null)
      }
      setApiError(null)
      onSuccess?.()
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'An error occurred')
    }
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
          disabled={isPending}
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
          disabled={isPending}
        />
        {urlError && (
          <p id={endpointUrlErrorId} className="text-sm text-destructive">
            {urlError}
          </p>
        )}
      </div>
      {apiError && <p className="text-sm text-destructive">{apiError}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={!isValid || isPending}>
          {isPending ? 'Saving...' : isEditing ? 'Save' : 'Add Instance'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
