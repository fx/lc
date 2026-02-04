import { createServerFn } from '@tanstack/react-start'
import { Jimp } from 'jimp'

interface SendImageInput {
  imageUrl: string
  endpointUrl: string
}

interface SendImageResult {
  success: boolean
  error?: string
}

/**
 * Server function to send an image to the LED matrix display.
 * Runs entirely on the server to bypass CORS restrictions.
 */
export const sendImageToDisplay = createServerFn({ method: 'POST' })
  .inputValidator((input: SendImageInput) => input)
  .handler(async ({ data }): Promise<SendImageResult> => {
    const { imageUrl, endpointUrl } = data

    // Normalize endpoint URL (remove trailing slash)
    const baseUrl = endpointUrl.replace(/\/+$/, '')

    try {
      // 1. Get display configuration
      const configResponse = await fetch(`${baseUrl}/configuration`)
      if (!configResponse.ok) {
        return { success: false, error: `Failed to get display config: ${configResponse.status}` }
      }
      const config = (await configResponse.json()) as { width: number; height: number }
      const { width, height } = config

      // 2. Fetch the image
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        return { success: false, error: `Failed to fetch image: ${imageResponse.status}` }
      }
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

      // 3. Process image with jimp: resize and get raw RGBA bitmap
      const image = await Jimp.read(imageBuffer)
      const resized = image.cover({ w: width, h: height })
      const rgbaBuffer = resized.bitmap.data

      // Validate frame size (width * height * 4 bytes per pixel)
      const expectedSize = width * height * 4
      if (rgbaBuffer.length !== expectedSize) {
        return {
          success: false,
          error: `Frame size mismatch: got ${rgbaBuffer.length} bytes, expected ${expectedSize} (${width}x${height}x4)`,
        }
      }

      // 4. Send frame to display
      const formData = new FormData()
      formData.append('frame', new Blob([rgbaBuffer]))

      const frameResponse = await fetch(`${baseUrl}/frame`, {
        method: 'POST',
        body: formData,
      })

      if (!frameResponse.ok) {
        return { success: false, error: `Failed to send frame: ${frameResponse.status}` }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
