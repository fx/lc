import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchConfiguration, loadImage, processImageToRgba, sendFrame } from './image-processing'

describe('fetchConfiguration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns width and height from successful response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ width: 64, height: 32 }),
    } as Response)

    const result = await fetchConfiguration('http://localhost:4200')

    expect(fetch).toHaveBeenCalledWith('http://localhost:4200/configuration')
    expect(result).toEqual({ width: 64, height: 32 })
  })

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response)

    await expect(fetchConfiguration('http://localhost:4200')).rejects.toThrow(
      'Failed to fetch configuration: 500',
    )
  })

  it('constructs correct URL with endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ width: 128, height: 64 }),
    } as Response)

    await fetchConfiguration('http://192.168.1.100:4200')

    expect(fetch).toHaveBeenCalledWith('http://192.168.1.100:4200/configuration')
  })
})

describe('loadImage', () => {
  let mockImageInstance: {
    crossOrigin: string
    onload: (() => void) | null
    onerror: (() => void) | null
    src: string
  }

  beforeEach(() => {
    mockImageInstance = {
      crossOrigin: '',
      onload: null,
      onerror: null,
      src: '',
    }

    // Use a class to properly mock the Image constructor
    class MockImage {
      crossOrigin = ''
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      private _src = ''

      get src() {
        return this._src
      }

      set src(value: string) {
        this._src = value
        mockImageInstance.src = value
        mockImageInstance.crossOrigin = this.crossOrigin
        mockImageInstance.onload = this.onload
        mockImageInstance.onerror = this.onerror
      }
    }

    vi.stubGlobal('Image', MockImage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves with image on successful load', async () => {
    const promise = loadImage('https://example.com/image.png')

    // Wait a tick for src to be set
    await new Promise((r) => setTimeout(r, 0))

    // Simulate successful load
    expect(mockImageInstance.crossOrigin).toBe('anonymous')
    expect(mockImageInstance.src).toBe('https://example.com/image.png')
    mockImageInstance.onload?.()

    const result = await promise
    expect(result).toBeInstanceOf(Image)
  })

  it('rejects with CORS-friendly error on failure', async () => {
    const promise = loadImage('https://example.com/image.png')

    // Wait a tick for src to be set
    await new Promise((r) => setTimeout(r, 0))

    // Simulate load error
    mockImageInstance.onerror?.()

    await expect(promise).rejects.toThrow(
      'Failed to load image. The image may not allow cross-origin access.',
    )
  })

  it('sets crossOrigin attribute to anonymous', async () => {
    loadImage('https://example.com/image.png')

    // Wait a tick for src to be set
    await new Promise((r) => setTimeout(r, 0))

    expect(mockImageInstance.crossOrigin).toBe('anonymous')
  })
})

describe('processImageToRgba', () => {
  let mockImageInstance: {
    crossOrigin: string
    onload: (() => void) | null
    onerror: (() => void) | null
    src: string
  }

  beforeEach(() => {
    mockImageInstance = {
      crossOrigin: '',
      onload: null,
      onerror: null,
      src: '',
    }

    class MockImage {
      crossOrigin = ''
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      private _src = ''

      get src() {
        return this._src
      }

      set src(value: string) {
        this._src = value
        mockImageInstance.src = value
        mockImageInstance.crossOrigin = this.crossOrigin
        mockImageInstance.onload = this.onload
        mockImageInstance.onerror = this.onerror
      }
    }

    vi.stubGlobal('Image', MockImage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('creates canvas with correct dimensions and returns RGBA data', async () => {
    const width = 64
    const height = 32
    const expectedSize = width * height * 4

    // Mock canvas and context
    const mockImageData = {
      data: new Uint8ClampedArray(expectedSize).fill(128),
    }

    const mockCtx = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => mockImageData),
    }

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
    }

    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLElement)

    // Start the promise
    const promise = processImageToRgba('https://example.com/image.png', width, height)

    // Wait a tick for src to be set
    await new Promise((r) => setTimeout(r, 0))

    // Simulate image load
    mockImageInstance.onload?.()

    const result = await promise

    // Verify canvas dimensions
    expect(mockCanvas.width).toBe(width)
    expect(mockCanvas.height).toBe(height)

    // Verify drawImage called with correct parameters
    expect(mockCtx.drawImage).toHaveBeenCalledWith(expect.any(Object), 0, 0, width, height)

    // Verify getImageData called with correct parameters
    expect(mockCtx.getImageData).toHaveBeenCalledWith(0, 0, width, height)

    // Verify result is Uint8Array of correct size
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(expectedSize)
  })

  it('throws when canvas context is unavailable', async () => {
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => null),
    }

    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLElement)

    const promise = processImageToRgba('https://example.com/image.png', 64, 32)

    // Wait a tick for src to be set
    await new Promise((r) => setTimeout(r, 0))

    // Simulate image load
    mockImageInstance.onload?.()

    await expect(promise).rejects.toThrow('Failed to get canvas context')
  })
})

describe('sendFrame', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates FormData with frame field and POSTs to correct endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
    } as Response)

    const rgbaData = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255])

    await sendFrame('http://localhost:4200', rgbaData)

    expect(fetch).toHaveBeenCalledTimes(1)

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('http://localhost:4200/frame')
    expect(options?.method).toBe('POST')
    expect(options?.body).toBeInstanceOf(FormData)

    const formData = options?.body as FormData
    const frameBlob = formData.get('frame')
    expect(frameBlob).toBeInstanceOf(Blob)
  })

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
    } as Response)

    const rgbaData = new Uint8Array([255, 0, 0, 255])

    await expect(sendFrame('http://localhost:4200', rgbaData)).rejects.toThrow(
      'Failed to send frame: 400',
    )
  })
})
