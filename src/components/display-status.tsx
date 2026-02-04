import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { getBrightness, getConfiguration, setBrightness } from '@/lib/api'
import { getSelectedInstance, useInstancesStore } from '@/stores/instances'

// Polling interval for connection status
const POLL_INTERVAL_MS = 12000

// Debounce delay for brightness changes
const DEBOUNCE_DELAY_MS = 200

/**
 * Simple debounce function
 */
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): { debouncedFn: (...args: Parameters<T>) => void; cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return { debouncedFn, cancel }
}

interface ConnectionIndicatorProps {
  isConnected: boolean
  isLoading: boolean
}

function ConnectionIndicator({ isConnected, isLoading }: ConnectionIndicatorProps) {
  if (isLoading) {
    return (
      <div
        className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse"
        title="Checking connection..."
      />
    )
  }

  return (
    <div
      className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
      title={isConnected ? 'Connected' : 'Disconnected'}
    />
  )
}

export function DisplayStatus() {
  const queryClient = useQueryClient()
  const selectedInstance = useInstancesStore(getSelectedInstance)

  // Extract values for stable references in query functions
  const instanceId = selectedInstance?.id
  const endpointUrl = selectedInstance?.endpointUrl ?? ''

  // Local state for immediate slider feedback
  const [localBrightness, setLocalBrightness] = useState<number | null>(null)

  // Track whether user is actively dragging the slider
  const isDraggingRef = useRef(false)

  // Query for brightness with polling
  const brightnessQuery = useQuery({
    queryKey: ['brightness', instanceId],
    queryFn: () =>
      getBrightness({
        data: { endpointUrl },
      }),
    enabled: !!selectedInstance,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  })

  // Query for display configuration
  const configQuery = useQuery({
    queryKey: ['configuration', instanceId],
    queryFn: () =>
      getConfiguration({
        data: { endpointUrl },
      }),
    enabled: !!selectedInstance,
  })

  // Track mutation errors
  const [mutationError, setMutationError] = useState<string | null>(null)

  // Mutation for setting brightness
  const brightnessMutation = useMutation({
    mutationFn: (brightness: number) =>
      setBrightness({
        data: {
          endpointUrl,
          brightness,
          transition: 500,
        },
      }),
    onSuccess: () => {
      setMutationError(null)
      queryClient.invalidateQueries({ queryKey: ['brightness', instanceId] })
    },
    onError: (error) => {
      setMutationError(error instanceof Error ? error.message : 'Failed to set brightness')
    },
  })

  // Use ref to always have access to latest mutation function
  const mutationRef = useRef(brightnessMutation)
  mutationRef.current = brightnessMutation

  // Memoized debounced mutation function - uses ref to avoid stale closure
  const debouncedSetBrightness = useMemo(() => {
    const { debouncedFn, cancel } = debounce((value: number) => {
      mutationRef.current.mutate(value)
    }, DEBOUNCE_DELAY_MS)
    return { debouncedFn, cancel }
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSetBrightness.cancel()
    }
  }, [debouncedSetBrightness])

  // Sync local state when server data changes (but not while dragging)
  useEffect(() => {
    if (brightnessQuery.data && !isDraggingRef.current) {
      setLocalBrightness(brightnessQuery.data.brightness)
    }
  }, [brightnessQuery.data])

  // Reset local state when instance changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: instanceId triggers reset when instance changes
  useEffect(() => {
    setLocalBrightness(null)
  }, [instanceId])

  const handleSliderChange = useCallback(
    (value: number[]) => {
      isDraggingRef.current = true
      setLocalBrightness(value[0])
      setMutationError(null)
      debouncedSetBrightness.debouncedFn(value[0])
    },
    [debouncedSetBrightness],
  )

  const handleSliderCommit = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  // Connection status derived from query state
  const isConnected = !brightnessQuery.isError && brightnessQuery.data !== undefined
  const isLoading = brightnessQuery.isLoading

  // Display value (local state takes precedence for responsiveness)
  const displayBrightness = localBrightness ?? brightnessQuery.data?.brightness ?? 0

  // Format dimensions display
  const dimensionsText = configQuery.data
    ? `${configQuery.data.width} x ${configQuery.data.height} pixels`
    : '---'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Display Status</CardTitle>
        <ConnectionIndicator isConnected={isConnected} isLoading={isLoading} />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dimensions */}
        <div className="space-y-1">
          <Label className="text-muted-foreground">Display Dimensions</Label>
          <p className="text-sm">
            {configQuery.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : dimensionsText}
          </p>
        </div>

        {/* Brightness */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-muted-foreground">Brightness</Label>
            <div className="flex items-center gap-2">
              {brightnessMutation.isPending && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
              <span className="text-sm tabular-nums">{displayBrightness}</span>
            </div>
          </div>
          <Slider
            value={[displayBrightness]}
            min={0}
            max={255}
            step={1}
            onValueChange={handleSliderChange}
            onValueCommit={handleSliderCommit}
            disabled={!selectedInstance || isLoading}
          />
          {mutationError && <p className="text-sm text-destructive">{mutationError}</p>}
        </div>

        {/* Error display */}
        {brightnessQuery.isError && (
          <p className="text-sm text-destructive">
            {brightnessQuery.error instanceof Error
              ? brightnessQuery.error.message
              : 'Failed to connect to display'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
