import { createServerFn } from '@tanstack/react-start'

/**
 * Server function to fetch LED matrix configuration.
 * Bypasses CORS by making the request from the server.
 */
export const fetchConfigurationProxy = createServerFn({ method: 'GET' })
  .validator((endpointUrl: string) => endpointUrl)
  .handler(async ({ data: endpointUrl }) => {
    const response = await fetch(`${endpointUrl}/configuration`)
    if (!response.ok) {
      throw new Error(`Upstream error: ${response.status}`)
    }
    const data = await response.json()
    return { width: data.width as number, height: data.height as number }
  })

/**
 * Server function to send frame data to LED matrix.
 * Bypasses CORS by making the request from the server.
 */
export const sendFrameProxy = createServerFn({ method: 'POST' })
  .validator((input: { endpointUrl: string; frameData: number[] }) => input)
  .handler(async ({ data }) => {
    const { endpointUrl, frameData } = data
    const rgbaData = new Uint8Array(frameData)

    const formData = new FormData()
    formData.append('frame', new Blob([rgbaData]))

    const response = await fetch(`${endpointUrl}/frame`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Upstream error: ${response.status}`)
    }

    return { success: true }
  })
