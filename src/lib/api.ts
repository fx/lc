import { createServerFn } from '@tanstack/react-start'
import { validateEndpointUrl } from './utils'

// Request timeout in milliseconds
const FETCH_TIMEOUT_MS = 10000

interface BrightnessInput {
  endpointUrl: string
}

interface SetBrightnessInput {
  endpointUrl: string
  brightness: number
  transition?: number
}

interface TemperatureInput {
  endpointUrl: string
}

interface SetTemperatureInput {
  endpointUrl: string
  temperature: number
}

interface ConfigurationInput {
  endpointUrl: string
}

interface BrightnessResponse {
  brightness: number
}

interface TemperatureResponse {
  temperature: number
}

interface ConfigurationResponse {
  width: number
  height: number
}

/**
 * Server function to get the current brightness from the LED matrix display.
 */
export const getBrightness = createServerFn({ method: 'GET' })
  .inputValidator((input: BrightnessInput) => {
    const validation = validateEndpointUrl(input.endpointUrl)
    if (!validation.valid) {
      throw new Error(`Invalid endpoint URL: ${validation.error}`)
    }
    return input
  })
  .handler(async ({ data }): Promise<BrightnessResponse> => {
    const baseUrl = data.endpointUrl.replace(/\/+$/, '')

    const response = await fetch(`${baseUrl}/brightness`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(
        `Failed to get brightness: ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
      )
    }

    return response.json() as Promise<BrightnessResponse>
  })

/**
 * Server function to set the brightness on the LED matrix display.
 */
export const setBrightness = createServerFn({ method: 'POST' })
  .inputValidator((input: SetBrightnessInput) => {
    const validation = validateEndpointUrl(input.endpointUrl)
    if (!validation.valid) {
      throw new Error(`Invalid endpoint URL: ${validation.error}`)
    }

    if (typeof input.brightness !== 'number' || input.brightness < 0 || input.brightness > 255) {
      throw new Error('Brightness must be a number between 0 and 255')
    }

    return input
  })
  .handler(async ({ data }): Promise<void> => {
    const baseUrl = data.endpointUrl.replace(/\/+$/, '')

    const response = await fetch(`${baseUrl}/brightness`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brightness: data.brightness,
        transition: data.transition ?? 500,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(
        `Failed to set brightness: ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
      )
    }
  })

/**
 * Server function to get the current color temperature from the LED matrix display.
 */
export const getTemperature = createServerFn({ method: 'GET' })
  .inputValidator((input: TemperatureInput) => {
    const validation = validateEndpointUrl(input.endpointUrl)
    if (!validation.valid) {
      throw new Error(`Invalid endpoint URL: ${validation.error}`)
    }
    return input
  })
  .handler(async ({ data }): Promise<TemperatureResponse> => {
    const baseUrl = data.endpointUrl.replace(/\/+$/, '')

    const response = await fetch(`${baseUrl}/temperature`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(
        `Failed to get temperature: ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
      )
    }

    return response.json() as Promise<TemperatureResponse>
  })

/**
 * Server function to set the color temperature on the LED matrix display.
 */
export const setTemperature = createServerFn({ method: 'POST' })
  .inputValidator((input: SetTemperatureInput) => {
    const validation = validateEndpointUrl(input.endpointUrl)
    if (!validation.valid) {
      throw new Error(`Invalid endpoint URL: ${validation.error}`)
    }

    if (
      typeof input.temperature !== 'number' ||
      input.temperature < 2000 ||
      input.temperature > 6500
    ) {
      throw new Error('Temperature must be a number between 2000 and 6500')
    }

    return input
  })
  .handler(async ({ data }): Promise<void> => {
    const baseUrl = data.endpointUrl.replace(/\/+$/, '')

    const response = await fetch(`${baseUrl}/temperature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        temperature: data.temperature,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(
        `Failed to set temperature: ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
      )
    }
  })

/**
 * Server function to get the display configuration (dimensions).
 */
export const getConfiguration = createServerFn({ method: 'GET' })
  .inputValidator((input: ConfigurationInput) => {
    const validation = validateEndpointUrl(input.endpointUrl)
    if (!validation.valid) {
      throw new Error(`Invalid endpoint URL: ${validation.error}`)
    }
    return input
  })
  .handler(async ({ data }): Promise<ConfigurationResponse> => {
    const baseUrl = data.endpointUrl.replace(/\/+$/, '')

    const response = await fetch(`${baseUrl}/configuration`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(
        `Failed to get configuration: ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
      )
    }

    return response.json() as Promise<ConfigurationResponse>
  })
