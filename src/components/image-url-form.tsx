import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { type FormEvent, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useInvalidateImages } from '@/hooks/use-images'
import { useInstances } from '@/hooks/use-instances'
import { sendImageToDisplay } from '@/lib/send-image-to-display'
import { validateEndpointUrl } from '@/lib/utils'
import { useInstancesStore } from '@/stores/instances'

export function ImageUrlForm() {
  const formId = useId()
  const [imageUrl, setImageUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)

  const { data: instances } = useInstances()
  const selectedId = useInstancesStore((state) => state.selectedId)
  const selectedInstance = instances?.find((i) => i.id === selectedId)
  const invalidateImages = useInvalidateImages()

  const imageUrlId = `${formId}-imageUrl`
  const imageUrlErrorId = `${formId}-imageUrl-error`

  const mutation = useMutation({
    mutationFn: async (url: string) => {
      if (!selectedInstance) {
        throw new Error('No instance selected')
      }

      const result = await sendImageToDisplay({
        data: { imageUrl: url, endpointUrl: selectedInstance.endpointUrl },
      })
      if (!result.success) {
        throw new Error(result.error || 'Failed to send image')
      }
      return result
    },
    onSuccess: () => {
      setImageUrl('')
      setUrlError(null)
      // Refresh the image gallery
      invalidateImages()
    },
  })

  // Use shared URL validation from utils
  const validateUrl = validateEndpointUrl

  const handleUrlChange = (value: string) => {
    setImageUrl(value)
    // Clear error while typing
    if (urlError) {
      setUrlError(null)
    }
    // Reset mutation state when user starts typing again
    if (mutation.isSuccess || mutation.isError) {
      mutation.reset()
    }
  }

  const handleUrlBlur = () => {
    if (imageUrl.trim()) {
      const result = validateUrl(imageUrl)
      if (!result.valid) {
        setUrlError(result.error ?? null)
      }
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const result = validateUrl(imageUrl)
    if (!result.valid) {
      setUrlError(result.error ?? null)
      return
    }

    if (!selectedInstance) {
      return
    }

    mutation.mutate(imageUrl.trim())
  }

  const urlValidation = validateUrl(imageUrl)
  const isValid = urlValidation.valid && !!selectedInstance
  const isDisabled = !isValid || mutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {selectedInstance ? `Send Image to ${selectedInstance.name}` : 'No Instance Selected'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={imageUrlId}>Image URL</Label>
            <Input
              id={imageUrlId}
              type="url"
              value={imageUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://example.com/image.png"
              disabled={!selectedInstance || mutation.isPending}
              aria-invalid={!!urlError}
              aria-describedby={urlError ? imageUrlErrorId : undefined}
            />
            {urlError && (
              <p id={imageUrlErrorId} className="text-sm text-destructive">
                {urlError}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isDisabled}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Frame'
              )}
            </Button>

            {mutation.isSuccess && (
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Frame sent successfully
              </span>
            )}

            {mutation.isError && (
              <span className="flex items-center gap-1 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                {mutation.error instanceof Error ? mutation.error.message : 'Failed to send frame'}
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
