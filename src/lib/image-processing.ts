/**
 * Image processing utilities for LED matrix display.
 * Handles fetching configuration, loading images, resizing, and converting to RGBA.
 */

/**
 * Fetches display configuration from the LED matrix bridge via server-side proxy.
 * Uses proxy to bypass CORS restrictions for browser-to-device communication.
 * @param endpointUrl - Base URL of the bridge endpoint
 * @returns Display dimensions { width, height }
 */
export async function fetchConfiguration(
  endpointUrl: string,
): Promise<{ width: number; height: number }> {
  const response = await fetch(
    `/api/proxy/configuration?endpointUrl=${encodeURIComponent(endpointUrl)}`,
  )
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || `Failed to fetch configuration: ${response.status}`)
  }

  return { width: data.width, height: data.height }
}

/**
 * Loads an image from a URL with CORS support.
 * @param url - Image URL to load
 * @returns Promise resolving to the loaded HTMLImageElement
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () =>
      reject(new Error('Failed to load image. The image may not allow cross-origin access.'))
    img.src = url
  })
}

/**
 * Processes an image URL into RGBA bytes at the specified dimensions.
 * Loads the image, resizes it using canvas, and extracts raw RGBA pixel data.
 * @param imageUrl - URL of the image to process
 * @param width - Target width in pixels
 * @param height - Target height in pixels
 * @returns Uint8Array of RGBA pixel data (length = width * height * 4)
 */
export async function processImageToRgba(
  imageUrl: string,
  width: number,
  height: number,
): Promise<Uint8Array> {
  const img = await loadImage(imageUrl)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Draw image scaled to canvas dimensions
  ctx.drawImage(img, 0, 0, width, height)

  // Extract RGBA data
  const imageData = ctx.getImageData(0, 0, width, height)
  return new Uint8Array(imageData.data.buffer)
}

/**
 * Sends RGBA frame data to the LED matrix bridge via server-side proxy.
 * Uses proxy to bypass CORS restrictions for browser-to-device communication.
 * @param endpointUrl - Base URL of the bridge endpoint
 * @param rgbaData - Raw RGBA pixel data as Uint8Array
 */
export async function sendFrame(endpointUrl: string, rgbaData: Uint8Array): Promise<void> {
  const response = await fetch('/api/proxy/frame', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpointUrl, frameData: Array.from(rgbaData) }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || `Failed to send frame: ${response.status}`)
  }
}
