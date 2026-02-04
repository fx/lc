import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchConfiguration, loadImage, processImageToRgba, sendFrame } from './image-processing'

describe('fetchConfiguration', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('returns width and height from successful API call', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ width: 64, height: 32 }),
    })

    const result = await fetchConfiguration('http://localhost:4200')

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/proxy/configuration?endpointUrl=http%3A%2F%2Flocalhost%3A4200',
    )
    expect(result).toEqual({ width: 64, height: 32 })
  })

  it('throws error from failed API response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Upstream error: 500' }),
    })

    await expect(fetchConfiguration('http://localhost:4200')).rejects.toThrow('Upstream error: 500')
  })

  it('handles API error without error message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    })

    await expect(fetchConfiguration('http://localhost:4200')).rejects.toThrow(
      'Failed to fetch configuration: 404',
    )
  })

  it('encodes endpoint URL properly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ width: 128, height: 64 }),
    })

    await fetchConfiguration('http://192.168.1.100:4200')

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/proxy/configuration?endpointUrl=http%3A%2F%2F192.168.1.100%3A4200',
    )
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
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('calls API with endpointUrl and frame data as array', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    const rgbaData = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255])

    await sendFrame('http://localhost:4200', rgbaData)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('/api/proxy/frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpointUrl: 'http://localhost:4200',
        frameData: [255, 0, 0, 255, 0, 255, 0, 255],
      }),
    })
  })

  it('throws error from failed API response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Upstream error: 400' }),
    })

    const rgbaData = new Uint8Array([255, 0, 0, 255])

    await expect(sendFrame('http://localhost:4200', rgbaData)).rejects.toThrow(
      'Upstream error: 400',
    )
  })

  it('handles API error without error message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    })

    const rgbaData = new Uint8Array([255, 0, 0, 255])

    await expect(sendFrame('http://localhost:4200', rgbaData)).rejects.toThrow(
      'Failed to send frame: 500',
    )
  })
})
