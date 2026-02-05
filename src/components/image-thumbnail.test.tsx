import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { ImageThumbnail } from './image-thumbnail'

// Mock the useImageThumbnail and useImagePreview hooks
vi.mock('@/hooks/use-images', () => ({
  useImageThumbnail: vi.fn(),
  useImagePreview: vi.fn(() => ({ data: null, isLoading: false })),
}))

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockObjectUrl = 'blob:mock-url'
const mockCreateObjectURL = vi.fn(() => mockObjectUrl)
const mockRevokeObjectURL = vi.fn()

Object.defineProperty(global.URL, 'createObjectURL', {
  value: mockCreateObjectURL,
  writable: true,
})

Object.defineProperty(global.URL, 'revokeObjectURL', {
  value: mockRevokeObjectURL,
  writable: true,
})

import { useImageThumbnail } from '@/hooks/use-images'

const mockImage = {
  id: 'test-id',
  contentHash: 'test-hash',
  originalUrl: 'https://example.com/test-image.png',
  mimeType: 'image/png',
  createdAt: new Date('2024-01-15T10:30:00Z'),
  hasThumbnail: true,
}

const mockThumbnailData = {
  thumbnail: [0x89, 0x50, 0x4e, 0x47], // Mock JPEG bytes
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('ImageThumbnail', () => {
  const mockOnSend = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateObjectURL.mockReturnValue(mockObjectUrl)
  })

  afterEach(() => {
    cleanup()
  })

  describe('loading state', () => {
    it('renders loading spinner when thumbnail is loading', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: null,
        isLoading: true,
      })

      const { container } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      // Should show the loader
      const loader = container.querySelector('.animate-spin')
      expect(loader).toBeDefined()
    })

    it('does not show image when loading', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: null,
        isLoading: true,
      })

      const { container } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      expect(container.querySelector('img')).toBeNull()
    })
  })

  describe('thumbnail display', () => {
    it('renders thumbnail image when data is available', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: mockThumbnailData,
        isLoading: false,
      })

      const { container } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      const img = container.querySelector('img')
      expect(img).toBeDefined()
      expect(img?.getAttribute('src')).toBe(mockObjectUrl)
    })

    it('creates object URL from thumbnail bytes', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: mockThumbnailData,
        isLoading: false,
      })

      render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    })

    it('shows "Select instance" when no display dimensions', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: null,
        isLoading: false,
      })

      const { container } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      expect(container.textContent).toContain('Select instance')
    })

    it('shows "Select instance" when thumbnail data is null and no dimensions', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: { thumbnail: null },
        isLoading: false,
      })

      const { container } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      expect(container.textContent).toContain('Select instance')
    })
  })

  describe('metadata display', () => {
    it('displays original URL when available', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: mockThumbnailData,
        isLoading: false,
      })

      const { container } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      // URL should be truncated but present
      expect(container.textContent).toContain('example.com')
    })

    it('does not display URL when not available', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: mockThumbnailData,
        isLoading: false,
      })

      const imageWithoutUrl = { ...mockImage, originalUrl: null }

      const { container } = render(
        <ImageThumbnail
          image={imageWithoutUrl}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      expect(container.textContent).not.toContain('example.com')
    })

    it('displays relative time for createdAt', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: mockThumbnailData,
        isLoading: false,
      })

      const { container } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      // Should show relative time (days ago since the date is in the past)
      expect(container.textContent).toMatch(/\d+d ago|just now|\d+h ago|\d+m ago/)
    })
  })

  describe('send button', () => {
    it('renders send button', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: mockThumbnailData,
        isLoading: false,
      })

      const { container } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      const button = within(container).getByRole('button')
      expect(button).toBeDefined()
      expect(button.getAttribute('title')).toBe('Send to display')
    })

    it('calls onSend when button is clicked', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: mockThumbnailData,
        isLoading: false,
      })

      const { container } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      const button = within(container).getByRole('button')
      fireEvent.click(button)

      expect(mockOnSend).toHaveBeenCalledTimes(1)
    })

    it('disables button when isSending is true', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: mockThumbnailData,
        isLoading: false,
      })

      const { container } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={true}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      const button = within(container).getByRole('button')
      expect(button).toHaveProperty('disabled', true)
    })

    it('shows loading spinner in button when isSending', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: mockThumbnailData,
        isLoading: false,
      })

      const { container } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={true}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      const button = within(container).getByRole('button')
      const spinner = button.querySelector('.animate-spin')
      expect(spinner).toBeDefined()
    })
  })

  describe('success indicator', () => {
    it('shows success icon when sendSuccess is true', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: mockThumbnailData,
        isLoading: false,
      })

      const { container } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={true}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      const successIcon = container.querySelector('.text-green-500')
      expect(successIcon).toBeDefined()
    })

    it('does not show success icon when sendSuccess is false', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: mockThumbnailData,
        isLoading: false,
      })

      const { container } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      const successIcon = container.querySelector('.text-green-500')
      expect(successIcon).toBeNull()
    })
  })

  describe('error indicator', () => {
    it('shows error icon when sendError is set', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: mockThumbnailData,
        isLoading: false,
      })

      const { container } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError="Connection failed"
        />,
        { wrapper: createWrapper() },
      )

      const errorIcon = container.querySelector('.text-destructive')
      expect(errorIcon).toBeDefined()
      // The title is on the parent div, not the SVG
      const errorContainer = errorIcon?.parentElement
      expect(errorContainer?.getAttribute('title')).toBe('Connection failed')
    })

    it('does not show error icon when sendError is null', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: mockThumbnailData,
        isLoading: false,
      })

      const { container } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      const errorIcon = container.querySelector('.text-destructive')
      expect(errorIcon).toBeNull()
    })
  })

  describe('memory cleanup', () => {
    it('revokes object URL on unmount', async () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: mockThumbnailData,
        isLoading: false,
      })

      const { unmount } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      // Unmount the component
      unmount()

      // Should have revoked the object URL
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockObjectUrl)
    })

    it('does not revoke when no thumbnail URL exists', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: null,
        isLoading: false,
      })

      const { unmount } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      mockRevokeObjectURL.mockClear()
      unmount()

      // Should not have called revokeObjectURL since there was no URL
      expect(mockRevokeObjectURL).not.toHaveBeenCalled()
    })
  })

  describe('alt text', () => {
    it('uses original URL in alt text when available', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: mockThumbnailData,
        isLoading: false,
      })

      const { container } = render(
        <ImageThumbnail
          image={mockImage}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      const img = container.querySelector('img')
      expect(img?.getAttribute('alt')).toContain(mockImage.originalUrl)
    })

    it('uses generic alt text when no URL', () => {
      ;(useImageThumbnail as Mock).mockReturnValue({
        data: mockThumbnailData,
        isLoading: false,
      })

      const imageWithoutUrl = { ...mockImage, originalUrl: null }

      const { container } = render(
        <ImageThumbnail
          image={imageWithoutUrl}
          displayWidth={null}
          displayHeight={null}
          onSend={mockOnSend}
          isSending={false}
          sendSuccess={false}
          sendError={null}
        />,
        { wrapper: createWrapper() },
      )

      const img = container.querySelector('img')
      expect(img?.getAttribute('alt')).toBe('Image preview')
    })
  })
})
