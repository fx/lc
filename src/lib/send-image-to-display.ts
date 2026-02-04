'use server'

import sharp from 'sharp'

interface SendImageResult {
  success: boolean
  error?: string
}

/**
 * Sends an image to the LED matrix display.
 * Runs entirely on the server to bypass CORS restrictions.
 *
 * 1. Fetches display dimensions from /configuration
 * 2. Fetches and processes the image with sharp
 * 3. Resizes to display dimensions and converts to raw RGBA
 * 4. Sends the frame via POST /frame
 */
export async function sendImageToDisplay(
  imageUrl: string,
  endpointUrl: string,
): Promise<SendImageResult> {
  try {
    // 1. Get display configuration
    const configResponse = await fetch(`${endpointUrl}/configuration`)
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

    // 3. Process image with sharp: resize and convert to raw RGBA
    const rgbaBuffer = await sharp(imageBuffer)
      .resize(width, height, { fit: 'cover' })
      .ensureAlpha()
      .raw()
      .toBuffer()

    // 4. Send frame to display
    const formData = new FormData()
    formData.append('frame', new Blob([rgbaBuffer]))

    const frameResponse = await fetch(`${endpointUrl}/frame`, {
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
}
