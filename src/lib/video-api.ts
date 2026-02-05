import { createServerFn } from '@tanstack/react-start'
import { validateEndpointUrl } from './utils'

// Request timeout in milliseconds
const FETCH_TIMEOUT_MS = 10000

// Types
export type VideoItemStatus = 'queued' | 'playing' | 'completed' | 'error'

export interface VideoItem {
  url: string
  status: VideoItemStatus
  error: string | null
}

export type FitMode = 'cover' | 'contain' | 'stretch'

export interface VideoQueueState {
  queue: VideoItem[]
  current: VideoItem | null
  repeat: boolean
  fit: FitMode
}

// Input types
interface EndpointInput {
  endpointUrl: string
}

interface AddVideoInput {
  endpointUrl: string
  url: string
}

interface SetRepeatModeInput {
  endpointUrl: string
  enabled: boolean
}

interface SetFitModeInput {
  endpointUrl: string
  fit: FitMode
}

/**
 * Server function to get the video queue state.
 */
export const getVideoQueue = createServerFn({ method: 'GET' })
  .inputValidator((input: EndpointInput) => {
    const validation = validateEndpointUrl(input.endpointUrl)
    if (!validation.valid) {
      throw new Error(`Invalid endpoint URL: ${validation.error}`)
    }
    return input
  })
  .handler(async ({ data }): Promise<VideoQueueState> => {
    const baseUrl = data.endpointUrl.replace(/\/+$/, '')

    const response = await fetch(`${baseUrl}/video/queue`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(
        `Failed to get video queue: ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
      )
    }

    return response.json() as Promise<VideoQueueState>
  })

/**
 * Server function to add a video to the queue.
 */
export const addVideoToQueue = createServerFn({ method: 'POST' })
  .inputValidator((input: AddVideoInput) => {
    const validation = validateEndpointUrl(input.endpointUrl)
    if (!validation.valid) {
      throw new Error(`Invalid endpoint URL: ${validation.error}`)
    }

    if (!input.url || typeof input.url !== 'string' || !input.url.trim()) {
      throw new Error('Video URL is required')
    }

    return input
  })
  .handler(async ({ data }): Promise<void> => {
    const baseUrl = data.endpointUrl.replace(/\/+$/, '')

    const response = await fetch(`${baseUrl}/video/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: data.url }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(
        `Failed to add video to queue: ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
      )
    }
  })

/**
 * Server function to clear the video queue.
 */
export const clearVideoQueue = createServerFn({ method: 'POST' })
  .inputValidator((input: EndpointInput) => {
    const validation = validateEndpointUrl(input.endpointUrl)
    if (!validation.valid) {
      throw new Error(`Invalid endpoint URL: ${validation.error}`)
    }
    return input
  })
  .handler(async ({ data }): Promise<void> => {
    const baseUrl = data.endpointUrl.replace(/\/+$/, '')

    const response = await fetch(`${baseUrl}/video/queue`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(
        `Failed to clear video queue: ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
      )
    }
  })

/**
 * Server function to skip the current video.
 */
export const skipVideo = createServerFn({ method: 'POST' })
  .inputValidator((input: EndpointInput) => {
    const validation = validateEndpointUrl(input.endpointUrl)
    if (!validation.valid) {
      throw new Error(`Invalid endpoint URL: ${validation.error}`)
    }
    return input
  })
  .handler(async ({ data }): Promise<void> => {
    const baseUrl = data.endpointUrl.replace(/\/+$/, '')

    const response = await fetch(`${baseUrl}/video/skip`, {
      method: 'POST',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(
        `Failed to skip video: ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
      )
    }
  })

/**
 * Server function to set repeat mode.
 */
export const setRepeatMode = createServerFn({ method: 'POST' })
  .inputValidator((input: SetRepeatModeInput) => {
    const validation = validateEndpointUrl(input.endpointUrl)
    if (!validation.valid) {
      throw new Error(`Invalid endpoint URL: ${validation.error}`)
    }

    if (typeof input.enabled !== 'boolean') {
      throw new Error('Repeat mode enabled must be a boolean')
    }

    return input
  })
  .handler(async ({ data }): Promise<void> => {
    const baseUrl = data.endpointUrl.replace(/\/+$/, '')

    const response = await fetch(`${baseUrl}/video/repeat`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: data.enabled }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(
        `Failed to set repeat mode: ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
      )
    }
  })

/**
 * Server function to set fit mode.
 */
export const setFitMode = createServerFn({ method: 'POST' })
  .inputValidator((input: SetFitModeInput) => {
    const validation = validateEndpointUrl(input.endpointUrl)
    if (!validation.valid) {
      throw new Error(`Invalid endpoint URL: ${validation.error}`)
    }

    const validFitModes: FitMode[] = ['cover', 'contain', 'stretch']
    if (!validFitModes.includes(input.fit)) {
      throw new Error('Fit mode must be one of: cover, contain, stretch')
    }

    return input
  })
  .handler(async ({ data }): Promise<void> => {
    const baseUrl = data.endpointUrl.replace(/\/+$/, '')

    const response = await fetch(`${baseUrl}/video/fit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fit: data.fit }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(
        `Failed to set fit mode: ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
      )
    }
  })
