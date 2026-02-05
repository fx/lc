import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { Jimp } from 'jimp'
import { db, withRetry } from '@/db'
import { images } from '@/db/schema'
import { validateEndpointUrl } from '@/lib/utils'

interface SendStoredImageInput {
  imageId: string
  endpointUrl: string
}

interface SendImageResult {
  success: boolean
  error?: string
}

// Configuration bounds for display dimensions
const MIN_DIMENSION = 1
const MAX_DIMENSION = 1024

// Request timeout in milliseconds
const FETCH_TIMEOUT_MS = 15000

/**
 * Server function to send a stored image to the LED matrix display.
 * Retrieves the image from the database, resizes it, and sends to the display.
 */
export const sendStoredImageToDisplay = createServerFn({ method: 'POST' })
  .inputValidator((input: SendStoredImageInput) => {
    if (!input.imageId || typeof input.imageId !== 'string') {
      throw new Error('Invalid imageId')
    }
    const endpointValidation = validateEndpointUrl(input.endpointUrl)
    if (!endpointValidation.valid) {
      throw new Error(`Invalid endpoint URL: ${endpointValidation.error}`)
    }
    return input
  })
  .handler(async ({ data }): Promise<SendImageResult> => {
    const { imageId, endpointUrl } = data
    const baseUrl = endpointUrl.replace(/\/+$/, '')

    try {
      // 1. Fetch image from database
      const image = await withRetry(() =>
        db.query.images.findFirst({
          where: eq(images.id, imageId),
          columns: { data: true },
        }),
      )

      if (!image) {
        return { success: false, error: 'Image not found' }
      }

      // 2. Get display configuration
      const configResponse = await fetch(`${baseUrl}/configuration`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (!configResponse.ok) {
        return { success: false, error: `Failed to get display config: ${configResponse.status}` }
      }
      const config = (await configResponse.json()) as { width: number; height: number }
      const { width, height } = config

      // Validate configuration dimensions
      if (
        !Number.isInteger(width) ||
        !Number.isInteger(height) ||
        width < MIN_DIMENSION ||
        width > MAX_DIMENSION ||
        height < MIN_DIMENSION ||
        height > MAX_DIMENSION
      ) {
        return {
          success: false,
          error: `Invalid display dimensions: width=${width}, height=${height}. Expected integers between ${MIN_DIMENSION} and ${MAX_DIMENSION}.`,
        }
      }

      // 3. Process image with jimp: resize and get raw RGBA bitmap
      const jimpImage = await Jimp.read(image.data)
      const resized = jimpImage.cover({ w: width, h: height })
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
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })

      if (!frameResponse.ok) {
        return { success: false, error: `Failed to send frame: ${frameResponse.status}` }
      }

      return { success: true }
    } catch (error) {
      // Handle abort errors (including timeouts from AbortSignal.timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: `Request timed out after ${FETCH_TIMEOUT_MS / 1000} seconds`,
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
