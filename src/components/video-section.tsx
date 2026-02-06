import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { VideoControls } from '@/components/video-controls'
import { VideoQueuePanel } from '@/components/video-queue-panel'
import { VideoUrlForm } from '@/components/video-url-form'
import { useInstances } from '@/hooks/use-instances'
import { useVideoQueue } from '@/hooks/use-video-queue'
import { cn } from '@/lib/utils'
import { useInstancesStore } from '@/stores/instances'

export function VideoSection() {
  const [isOpen, setIsOpen] = useState(true)
  const { data: instances } = useInstances()
  const selectedId = useInstancesStore((state) => state.selectedId)
  const selectedInstance = instances?.find((i) => i.id === selectedId)
  const endpointUrl = selectedInstance?.endpointUrl ?? null

  const { data: videoQueueState, isLoading, error } = useVideoQueue(endpointUrl)

  const queueCount = (videoQueueState?.queue?.length ?? 0) + (videoQueueState?.current ? 1 : 0)

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-4">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between text-left">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Video Queue</CardTitle>
                {!isLoading && <Badge variant="secondary">{queueCount}</Badge>}
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
          <CardContent className="space-y-4">
            <VideoUrlForm endpointUrl={endpointUrl} />
            <VideoControls
              repeat={videoQueueState?.repeat ?? false}
              fit={videoQueueState?.fit ?? 'cover'}
              endpointUrl={endpointUrl}
            />
            <VideoQueuePanel
              videoQueueState={videoQueueState}
              endpointUrl={endpointUrl}
              isLoading={isLoading}
              error={error}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
