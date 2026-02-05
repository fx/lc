import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { type FormEvent, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAddVideo } from '@/hooks/use-video-queue'
import { validateEndpointUrl } from '@/lib/utils'

interface VideoUrlFormProps {
  endpointUrl: string | null
}

export function VideoUrlForm({ endpointUrl }: VideoUrlFormProps) {
  const formId = useId()
  const [videoUrl, setVideoUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)

  const addVideo = useAddVideo()

  const videoUrlId = `${formId}-videoUrl`
  const videoUrlErrorId = `${formId}-videoUrl-error`

  const validateUrl = validateEndpointUrl

  const handleUrlChange = (value: string) => {
    setVideoUrl(value)
    if (urlError) {
      setUrlError(null)
    }
    if (addVideo.isSuccess || addVideo.isError) {
      addVideo.reset()
    }
  }

  const handleUrlBlur = () => {
    if (videoUrl.trim()) {
      const result = validateUrl(videoUrl)
      if (!result.valid) {
        setUrlError(result.error ?? null)
      }
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const result = validateUrl(videoUrl)
    if (!result.valid) {
      setUrlError(result.error ?? null)
      return
    }

    if (!endpointUrl) {
      return
    }

    addVideo.mutate(
      { endpointUrl, url: videoUrl.trim() },
      {
        onSuccess: () => {
          setVideoUrl('')
          setUrlError(null)
        },
      },
    )
  }

  const urlValidation = validateUrl(videoUrl)
  const isValid = urlValidation.valid && !!endpointUrl
  const isDisabled = !isValid || addVideo.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={videoUrlId}>Video URL</Label>
        <Input
          id={videoUrlId}
          type="url"
          value={videoUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="https://www.youtube.com/watch?v=..."
          disabled={!endpointUrl || addVideo.isPending}
          aria-invalid={!!urlError}
          aria-describedby={urlError ? videoUrlErrorId : undefined}
        />
        {urlError && (
          <p id={videoUrlErrorId} className="text-sm text-destructive">
            {urlError}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isDisabled}>
          {addVideo.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            'Add to Queue'
          )}
        </Button>

        {addVideo.isSuccess && (
          <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            Video added to queue
          </span>
        )}

        {addVideo.isError && (
          <span className="flex items-center gap-1 text-sm text-destructive">
            <XCircle className="h-4 w-4" />
            {addVideo.error instanceof Error ? addVideo.error.message : 'Failed to add video'}
          </span>
        )}
      </div>
    </form>
  )
}
