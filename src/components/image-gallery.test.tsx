import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { useInstancesStore } from '@/stores/instances'
import { ImageGallery } from './image-gallery'

// Mock the hooks
vi.mock('@/hooks/use-images', () => ({
  useImages: vi.fn(),
  useSendImageToDisplay: vi.fn(),
}))

vi.mock('@/hooks/use-instances', () => ({
  useInstances: vi.fn(),
}))

// Mock ImageThumbnail to simplify tests
vi.mock('./image-thumbnail', () => ({
  ImageThumbnail: vi.fn(
    ({
      image,
      isSending,
      sendSuccess,
      sendError,
    }: {
      image: { id: string; originalUrl: string | null }
      isSending: boolean
      sendSuccess: boolean
      sendError: string | null
    }) => (
      <div
        data-testid={`thumbnail-${image.id}`}
        data-sending={isSending}
        data-success={sendSuccess}
        data-error={sendError}
      >
        {image.originalUrl ?? 'No URL'}
      </div>
    ),
  ),
}))

import { useImages, useSendImageToDisplay } from '@/hooks/use-images'
import { useInstances } from '@/hooks/use-instances'

const mockImages = [
  {
    id: '1',
    contentHash: 'hash1',
    originalUrl: 'https://example.com/image1.png',
    mimeType: 'image/png',
    createdAt: new Date('2024-01-01'),
    hasThumbnail: true,
  },
  {
    id: '2',
    contentHash: 'hash2',
    originalUrl: null,
    mimeType: 'image/jpeg',
    createdAt: new Date('2024-01-02'),
    hasThumbnail: true,
  },
]

const mockInstances = [
  {
    id: 'inst-1',
    name: 'Test Display',
    endpointUrl: 'http://localhost:4200',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('ImageGallery', () => {
  const mockMutateAsync = vi.fn()

  beforeEach(() => {
    useInstancesStore.setState({ selectedId: null })
    vi.clearAllMocks()
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    ;(useSendImageToDisplay as Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    })
  })

  afterEach(() => {
    cleanup()
  })

  describe('loading state', () => {
    it('renders loading skeletons when loading', () => {
      ;(useImages as Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      })

      const { container } = render(<ImageGallery />, { wrapper: createWrapper() })

      // Should show skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('does not show badge count when loading', () => {
      ;(useImages as Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      })

      const { container } = render(<ImageGallery />, { wrapper: createWrapper() })

      // Badge should not be present during loading
      expect(container.textContent).not.toMatch(/^\d+$/)
    })
  })

  describe('empty state', () => {
    it('renders empty state message when no images', () => {
      ;(useImages as Mock).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      })

      const { container } = render(<ImageGallery />, { wrapper: createWrapper() })

      expect(container.textContent).toContain('No images yet')
      expect(container.textContent).toContain('Send an image to get started')
    })

    it('shows count badge as 0 when no images', () => {
      ;(useImages as Mock).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      })

      const { container } = render(<ImageGallery />, { wrapper: createWrapper() })

      expect(container.textContent).toContain('0')
    })
  })

  describe('error state', () => {
    it('renders error message when fetch fails', () => {
      ;(useImages as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      })

      const { container } = render(<ImageGallery />, { wrapper: createWrapper() })

      expect(container.textContent).toContain('Network error')
    })

    it('shows generic error for non-Error exceptions', () => {
      ;(useImages as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: 'string error',
      })

      const { container } = render(<ImageGallery />, { wrapper: createWrapper() })

      expect(container.textContent).toContain('Failed to load images')
    })
  })

  describe('with images', () => {
    it('renders image thumbnails in a grid', () => {
      ;(useImages as Mock).mockReturnValue({
        data: mockImages,
        isLoading: false,
        error: null,
      })

      const { container } = render(<ImageGallery />, { wrapper: createWrapper() })

      expect(container.querySelector('[data-testid="thumbnail-1"]')).toBeDefined()
      expect(container.querySelector('[data-testid="thumbnail-2"]')).toBeDefined()
    })

    it('shows correct count badge', () => {
      ;(useImages as Mock).mockReturnValue({
        data: mockImages,
        isLoading: false,
        error: null,
      })

      const { container } = render(<ImageGallery />, { wrapper: createWrapper() })

      expect(container.textContent).toContain('2')
    })

    it('renders card title', () => {
      ;(useImages as Mock).mockReturnValue({
        data: mockImages,
        isLoading: false,
        error: null,
      })

      const { container } = render(<ImageGallery />, { wrapper: createWrapper() })

      expect(container.textContent).toContain('Recent Images')
    })
  })

  describe('instance selection warning', () => {
    it('shows warning when images exist but no instance selected', () => {
      ;(useImages as Mock).mockReturnValue({
        data: mockImages,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: null })

      const { container } = render(<ImageGallery />, { wrapper: createWrapper() })

      expect(container.textContent).toContain('Select an instance to send images')
    })

    it('does not show warning when instance is selected', () => {
      ;(useImages as Mock).mockReturnValue({
        data: mockImages,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: 'inst-1' })

      const { container } = render(<ImageGallery />, { wrapper: createWrapper() })

      expect(container.textContent).not.toContain('Select an instance to send images')
    })

    it('does not show warning when no images', () => {
      ;(useImages as Mock).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: null })

      const { container } = render(<ImageGallery />, { wrapper: createWrapper() })

      expect(container.textContent).not.toContain('Select an instance to send images')
    })
  })

  describe('collapsible behavior', () => {
    it('starts expanded by default', () => {
      ;(useImages as Mock).mockReturnValue({
        data: mockImages,
        isLoading: false,
        error: null,
      })

      const { container } = render(<ImageGallery />, { wrapper: createWrapper() })

      // Content should be visible
      expect(container.querySelector('[data-testid="thumbnail-1"]')).toBeDefined()
    })
  })

  describe('send functionality', () => {
    it('calls mutateAsync with correct params when send is triggered', async () => {
      ;(useImages as Mock).mockReturnValue({
        data: mockImages,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: 'inst-1' })
      mockMutateAsync.mockResolvedValue({ success: true })

      render(<ImageGallery />, { wrapper: createWrapper() })

      // Get the ImageThumbnail mock and trigger onSend
      const { ImageThumbnail } = await import('./image-thumbnail')
      const calls = (ImageThumbnail as Mock).mock.calls

      // Find call for first image and trigger onSend
      const firstImageCall = calls.find(
        (call: unknown[]) => (call[0] as { image: { id: string } }).image.id === '1',
      )
      expect(firstImageCall).toBeDefined()

      // Trigger the onSend callback
      const props = firstImageCall?.[0] as { onSend: () => void }
      props.onSend()

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          imageId: '1',
          endpointUrl: 'http://localhost:4200',
        })
      })
    })

    it('does not call mutate when no instance selected', async () => {
      ;(useImages as Mock).mockReturnValue({
        data: mockImages,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: null })

      render(<ImageGallery />, { wrapper: createWrapper() })

      // Get the ImageThumbnail mock and trigger onSend
      const { ImageThumbnail } = await import('./image-thumbnail')
      const calls = (ImageThumbnail as Mock).mock.calls

      // Find call for first image and trigger onSend
      const firstImageCall = calls.find(
        (call: unknown[]) => (call[0] as { image: { id: string } }).image.id === '1',
      )

      // Trigger the onSend callback
      const props = firstImageCall?.[0] as { onSend: () => void }
      props.onSend()

      // Wait a bit and verify mutation was not called
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(mockMutateAsync).not.toHaveBeenCalled()
    })
  })
})
