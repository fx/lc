import { SkipForward, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useClearQueue, useSkipVideo } from '@/hooks/use-video-queue'
import type { VideoItemStatus, VideoQueueState } from '@/lib/video-api'

interface VideoQueuePanelProps {
  videoQueueState: VideoQueueState | null | undefined
  endpointUrl: string | null
  isLoading?: boolean
  error?: Error | null
}

function statusBadgeVariant(status: VideoItemStatus) {
  switch (status) {
    case 'queued':
      return 'secondary'
    case 'playing':
      return 'default'
    case 'completed':
      return 'outline'
    case 'error':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function truncateUrl(url: string, maxLength = 60) {
  if (url.length <= maxLength) return url
  return `${url.slice(0, maxLength)}...`
}

export function VideoQueuePanel({
  videoQueueState,
  endpointUrl,
  isLoading,
  error,
}: VideoQueuePanelProps) {
  const skipVideo = useSkipVideo()
  const clearQueue = useClearQueue()

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : 'Failed to load video queue'}
      </p>
    )
  }

  const current = videoQueueState?.current ?? null
  const queue = videoQueueState?.queue ?? []
  const hasItems = !!current || queue.length > 0

  if (!hasItems) {
    return <p className="text-sm text-muted-foreground">No videos in queue</p>
  }

  return (
    <div className="space-y-3">
      {current && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm truncate">{truncateUrl(current.url)}</span>
            <Badge variant="default">playing</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => endpointUrl && skipVideo.mutate({ endpointUrl })}
            disabled={!endpointUrl || skipVideo.isPending}
            data-testid="skip-button"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      )}

      {queue.length > 0 && (
        <div className="space-y-1">
          {queue.map((item, index) => (
            <div key={`${item.url}-${index}`} className="flex items-center gap-2">
              <span className="text-sm truncate">{truncateUrl(item.url)}</span>
              <Badge variant={statusBadgeVariant(item.status)}>{item.status}</Badge>
            </div>
          ))}
        </div>
      )}

      {hasItems && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => endpointUrl && clearQueue.mutate({ endpointUrl })}
          disabled={!endpointUrl || clearQueue.isPending}
          data-testid="clear-button"
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Clear Queue
        </Button>
      )}
    </div>
  )
}
