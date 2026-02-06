import { Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSetFitMode, useSetRepeatMode } from '@/hooks/use-video-queue'
import type { FitMode } from '@/lib/video-api'

interface VideoControlsProps {
  repeat: boolean
  fit: FitMode
  endpointUrl: string | null
}

export function VideoControls({ repeat, fit, endpointUrl }: VideoControlsProps) {
  const setRepeatMode = useSetRepeatMode()
  const setFitMode = useSetFitMode()

  return (
    <div className="flex items-center gap-4">
      <Button
        variant={repeat ? 'default' : 'outline'}
        size="sm"
        onClick={() => endpointUrl && setRepeatMode.mutate({ endpointUrl, enabled: !repeat })}
        disabled={!endpointUrl || setRepeatMode.isPending}
        data-testid="repeat-toggle"
      >
        <Repeat className="mr-1 h-4 w-4" />
        Repeat
      </Button>

      <Select
        value={fit}
        onValueChange={(value: string) =>
          endpointUrl && setFitMode.mutate({ endpointUrl, fit: value as FitMode })
        }
        disabled={!endpointUrl || setFitMode.isPending}
      >
        <SelectTrigger className="w-[140px]" data-testid="fit-selector">
          <SelectValue placeholder="Fit mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cover">Cover</SelectItem>
          <SelectItem value="contain">Contain</SelectItem>
          <SelectItem value="stretch">Stretch</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
