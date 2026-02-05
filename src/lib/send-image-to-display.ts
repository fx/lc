import { createServerFn } from '@tanstack/react-start'
import { Jimp } from 'jimp'
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from '@/lib/image-constants'
import { storeImageCore } from '@/server/images'
import { validateEndpointUrl } from './utils'

interface SendImageInput {
  imageUrl: string
  endpointUrl: string
}

interface SendUploadedImageInput {
  imageData: number[]
  mimeType: string
  endpointUrl: string
}

interface SendImageResult {
  success: boolean
  error?: string
}

interface ProcessAndSendInput {
  imageBuffer: Buffer
  mimeType: string
  endpointUrl: string
  originalUrl?: string
}

// Configuration bounds for display dimensions
const MIN_DIMENSION = 1
const MAX_DIMENSION = 1024

// Request timeout in milliseconds
const FETCH_TIMEOUT_MS = 15000

// Maximum image file size for URL-based fetches (50MB)
// Larger limit for external URLs since they may host high-resolution images
const MAX_URL_IMAGE_SIZE_BYTES = 50 * 1024 * 1024

/**
 * Shared helper to process an image and send it to the display.
 * This handles: fetching display config, storing image, resizing, and sending frame.
 */
async function processAndSendToDisplay({
  imageBuffer,
  mimeType,
  endpointUrl,
  originalUrl,
}: ProcessAndSendInput): Promise<SendImageResult> {
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

    // 2. Store image for later retrieval (failures logged but don't fail the request)
    const storeResult = await storeImageCore(imageBuffer, mimeType, originalUrl)
    if (!storeResult.success) {
      console.warn('[processAndSendToDisplay] Failed to store image:', storeResult.error.message)
    }

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
}

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

    try {
      // Fetch the image
      const imageResponse = await fetch(imageUrl, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (!imageResponse.ok) {
        return { success: false, error: `Failed to fetch image: ${imageResponse.status}` }
      }

      // Check Content-Length header before downloading
      const contentLength = imageResponse.headers.get('Content-Length')
      if (contentLength && Number.parseInt(contentLength, 10) > MAX_URL_IMAGE_SIZE_BYTES) {
        return {
          success: false,
          error: `Image too large: ${Math.round(Number.parseInt(contentLength, 10) / 1024 / 1024)}MB exceeds ${MAX_URL_IMAGE_SIZE_BYTES / 1024 / 1024}MB limit`,
        }
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
      const mimeType = imageResponse.headers.get('Content-Type') ?? 'application/octet-stream'

      return processAndSendToDisplay({
        imageBuffer,
        mimeType,
        endpointUrl,
        originalUrl: imageUrl,
      })
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

/**
 * Server function to send an uploaded image to the LED matrix display.
 * Takes raw image data instead of a URL.
 */
export const sendUploadedImageToDisplay = createServerFn({ method: 'POST' })
  .inputValidator((input: SendUploadedImageInput) => {
    if (!input.imageData || !Array.isArray(input.imageData) || input.imageData.length === 0) {
      throw new Error('Image data must be a non-empty array')
    }
    if (input.imageData.length > MAX_UPLOAD_SIZE_BYTES) {
      throw new Error(`Image data exceeds ${MAX_UPLOAD_SIZE_BYTES / 1024 / 1024}MB limit`)
    }
    if (!ALLOWED_MIME_TYPES.includes(input.mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new Error(
        `Unsupported image type: ${input.mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      )
    }
    const endpointValidation = validateEndpointUrl(input.endpointUrl)
    if (!endpointValidation.valid) {
      throw new Error(`Invalid endpoint URL: ${endpointValidation.error}`)
    }
    return input
  })
  .handler(async ({ data }): Promise<SendImageResult> => {
    const { imageData, mimeType, endpointUrl } = data
    const imageBuffer = Buffer.from(imageData)

    return processAndSendToDisplay({
      imageBuffer,
      mimeType,
      endpointUrl,
    })
  })
