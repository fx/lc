import { createServerFn } from '@tanstack/react-start'
import { Jimp } from 'jimp'
import { validateEndpointUrl } from './utils'

interface SendImageInput {
  imageUrl: string
  endpointUrl: string
}

interface SendImageResult {
  success: boolean
  error?: string
  warning?: string
}

// Configuration bounds for display dimensions
const MIN_DIMENSION = 1
const MAX_DIMENSION = 1024

// Request timeout in milliseconds
const FETCH_TIMEOUT_MS = 15000

// Maximum image file size in bytes (50MB)
const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024

// Recommended maximum source image dimensions
const RECOMMENDED_MAX_DIMENSION = 256

/**
 * Server function to send an image to the LED matrix display.
 * Runs entirely on the server to bypass CORS restrictions.
 */
export const sendImageToDisplay = createServerFn({ method: 'POST' })
  .inputValidator((input: SendImageInput) => {
    // Validate imageUrl uses safe protocol (http/https only)
    const imageUrlValidation = validateEndpointUrl(input.imageUrl)
    if (!imageUrlValidation.valid) {
      throw new Error(`Invalid image URL: ${imageUrlValidation.error}`)
    }

    // Validate endpointUrl uses safe protocol (http/https only)
    const endpointValidation = validateEndpointUrl(input.endpointUrl)
    if (!endpointValidation.valid) {
      throw new Error(`Invalid endpoint URL: ${endpointValidation.error}`)
    }

    return input
  })
  .handler(async ({ data }): Promise<SendImageResult> => {
    const { imageUrl, endpointUrl } = data

    // Normalize endpoint URL (remove trailing slash)
    const baseUrl = endpointUrl.replace(/\/+$/, '')

    try {
      // 1. Get display configuration
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

      // 2. Fetch the image
      const imageResponse = await fetch(imageUrl, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (!imageResponse.ok) {
        return { success: false, error: `Failed to fetch image: ${imageResponse.status}` }
      }

      // Check Content-Length header before downloading
      const contentLength = imageResponse.headers.get('Content-Length')
      if (contentLength && Number.parseInt(contentLength, 10) > MAX_IMAGE_SIZE_BYTES) {
        return {
          success: false,
          error: `Image too large: ${Math.round(Number.parseInt(contentLength, 10) / 1024 / 1024)}MB exceeds ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB limit`,
        }
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

      // 3. Process image with jimp: resize and get raw RGBA bitmap
      const image = await Jimp.read(imageBuffer)

      // Check source image dimensions and set warning if too large
      let warning: string | undefined
      const sourceWidth = image.width
      const sourceHeight = image.height
      if (sourceWidth > RECOMMENDED_MAX_DIMENSION || sourceHeight > RECOMMENDED_MAX_DIMENSION) {
        warning = `Source image dimensions (${sourceWidth}x${sourceHeight}) exceed recommended maximum (${RECOMMENDED_MAX_DIMENSION}x${RECOMMENDED_MAX_DIMENSION})`
      }

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
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })

      if (!frameResponse.ok) {
        return { success: false, error: `Failed to send frame: ${frameResponse.status}` }
      }

      return { success: true, warning }
    } catch (error) {
      // Handle timeout errors with distinct message
      if (error instanceof Error && error.name === 'TimeoutError') {
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
