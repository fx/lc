import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { ImageThumbnail } from '@/components/image-thumbnail'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { useImages, useSendImageToDisplay } from '@/hooks/use-images'
import { useInstances } from '@/hooks/use-instances'
import { cn } from '@/lib/utils'
import { useInstancesStore } from '@/stores/instances'

const SKELETON_IDS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'] as const

function LoadingSkeletons() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {SKELETON_IDS.map((id) => (
        <div key={id} className="flex flex-col gap-1">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export function ImageGallery() {
  const [isOpen, setIsOpen] = useState(true)
  const { data: images, isLoading, error } = useImages({ limit: 20 })
  const { data: instances } = useInstances()
  const selectedId = useInstancesStore((state) => state.selectedId)
  const selectedInstance = instances?.find((i) => i.id === selectedId)

  const sendMutation = useSendImageToDisplay()

  // Track which image is currently being sent and its status
  const [sendingImageId, setSendingImageId] = useState<string | null>(null)
  const [sendStatus, setSendStatus] = useState<{
    imageId: string
    success: boolean
    error: string | null
  } | null>(null)

  const handleSend = async (imageId: string) => {
    if (!selectedInstance) return

    setSendingImageId(imageId)
    setSendStatus(null)

    try {
      await sendMutation.mutateAsync({
        imageId,
        endpointUrl: selectedInstance.endpointUrl,
      })
      setSendStatus({ imageId, success: true, error: null })
    } catch (err) {
      setSendStatus({
        imageId,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to send',
      })
    } finally {
      setSendingImageId(null)
      // Clear success status after a delay
      setTimeout(() => {
        setSendStatus((prev) => (prev?.imageId === imageId && prev.success ? null : prev))
      }, 2000)
    }
  }

  const imageCount = images?.length ?? 0

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-4">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between text-left">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Recent Images</CardTitle>
                {!isLoading && <Badge variant="secondary">{imageCount}</Badge>}
              </div>
              <ChevronDown
                className={cn(
                  'h-5 w-5 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180',
                )}
              />
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {isLoading ? (
              <LoadingSkeletons />
            ) : error ? (
              <p className="text-sm text-destructive">
                {error instanceof Error ? error.message : 'Failed to load images'}
              </p>
            ) : !images || images.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No images yet. Send an image to get started.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {images.map((image) => (
                  <ImageThumbnail
                    key={image.id}
                    image={image}
                    onSend={() => handleSend(image.id)}
                    isSending={sendingImageId === image.id}
                    sendSuccess={sendStatus?.imageId === image.id && sendStatus.success}
                    sendError={
                      sendStatus?.imageId === image.id && !sendStatus.success
                        ? sendStatus.error
                        : null
                    }
                  />
                ))}
              </div>
            )}
            {!selectedInstance && images && images.length > 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                Select an instance to send images to the display.
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
