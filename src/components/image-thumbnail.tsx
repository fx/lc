import { CheckCircle2, Loader2, Send, XCircle } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { useImagePreview, useImageThumbnail } from '@/hooks/use-images'
import { cn } from '@/lib/utils'

interface ImageMetadata {
  id: string
  contentHash: string
  originalUrl: string | null
  mimeType: string
  createdAt: Date
  hasThumbnail: boolean
}

interface ImageThumbnailProps {
  image: ImageMetadata
  displayWidth: number | null
  displayHeight: number | null
  onSend: () => void
  isSending: boolean
  sendSuccess: boolean
  sendError: string | null
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

function truncateUrl(url: string, maxLength = 20): string {
  if (url.length <= maxLength) return url
  // Remove protocol
  const withoutProtocol = url.replace(/^https?:\/\//, '')
  if (withoutProtocol.length <= maxLength) return withoutProtocol
  return `${withoutProtocol.substring(0, maxLength)}...`
}

export function ImageThumbnail({
  image,
  displayWidth,
  displayHeight,
  onSend,
  isSending,
  sendSuccess,
  sendError,
}: ImageThumbnailProps) {
  // Use preview when display dimensions are available, otherwise fall back to thumbnail
  const hasDisplayDimensions = displayWidth !== null && displayHeight !== null
  const { data: previewData, isLoading: previewLoading } = useImagePreview(
    hasDisplayDimensions ? image.id : null,
    displayWidth,
    displayHeight,
  )
  const { data: thumbnailData, isLoading: thumbnailLoading } = useImageThumbnail(
    hasDisplayDimensions ? null : image.id,
  )

  const isLoading = hasDisplayDimensions ? previewLoading : thumbnailLoading

  // Convert image bytes to object URL
  const imageSrc = useMemo(() => {
    if (hasDisplayDimensions) {
      if (!previewData?.preview) return null
      const bytes = new Uint8Array(previewData.preview)
      const blob = new Blob([bytes], { type: 'image/jpeg' })
      return URL.createObjectURL(blob)
    }
    if (!thumbnailData?.thumbnail) return null
    const bytes = new Uint8Array(thumbnailData.thumbnail)
    const blob = new Blob([bytes], { type: 'image/jpeg' })
    return URL.createObjectURL(blob)
  }, [hasDisplayDimensions, previewData, thumbnailData])

  // Cleanup object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc)
      }
    }
  }, [imageSrc])

  return (
    <div className="group relative flex flex-col gap-1">
      {/* Preview container - shows image at native display dimensions centered */}
      <div className="relative flex min-h-[80px] items-center justify-center overflow-hidden border bg-muted p-2">
        {isLoading ? (
          <div className="flex h-16 w-16 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : imageSrc ? (
          <img
            src={imageSrc}
            alt={image.originalUrl ? `Preview of ${image.originalUrl}` : 'Image preview'}
            style={
              hasDisplayDimensions
                ? { width: displayWidth, height: displayHeight, imageRendering: 'pixelated' }
                : { width: 64, height: 64, imageRendering: 'pixelated' }
            }
            loading="lazy"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center text-muted-foreground text-xs">
            {hasDisplayDimensions ? 'No preview' : 'Select instance'}
          </div>
        )}

        {/* Send button overlay */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity',
            'group-hover:opacity-100',
            isSending && 'opacity-100',
          )}
        >
          <Button
            size="sm"
            variant="secondary"
            onClick={onSend}
            disabled={isSending}
            className="h-8 w-8 p-0"
            title="Send to display"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Success/error indicators */}
        {sendSuccess && (
          <div className="absolute bottom-1 right-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
        )}
        {sendError && (
          <div className="absolute bottom-1 right-1" title={sendError}>
            <XCircle className="h-4 w-4 text-destructive" />
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        {image.originalUrl && (
          <span className="truncate" title={image.originalUrl}>
            {truncateUrl(image.originalUrl)}
          </span>
        )}
        <span>{formatRelativeTime(image.createdAt)}</span>
      </div>
    </div>
  )
}
