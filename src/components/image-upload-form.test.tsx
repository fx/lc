import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import * as sendImageModule from '@/lib/send-image-to-display'
import { useInstancesStore } from '@/stores/instances'
import { ImageUploadForm } from './image-upload-form'

// Mock the server function
vi.mock('@/lib/send-image-to-display', () => ({
  sendUploadedImageToDisplay: vi.fn(),
}))

// Mock useInstances hook
vi.mock('@/hooks/use-instances', () => ({
  useInstances: vi.fn(),
}))

import { useInstances } from '@/hooks/use-instances'

const mockInstances = [
  {
    id: '1',
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

// Create a mock file with proper arrayBuffer method (jsdom doesn't fully support it)
function createMockFile(name: string, type: string, size: number = 1024): File {
  const content = new Uint8Array(size)
  const file = new File([content], name, { type })

  // Polyfill arrayBuffer for jsdom
  if (!file.arrayBuffer || typeof file.arrayBuffer !== 'function') {
    ;(file as File & { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer = () =>
      Promise.resolve(content.buffer)
  }

  return file
}

function uploadFile(container: HTMLElement, file: File): void {
  const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(fileInput, { target: { files: [file] } })
}

function createMockDragEvent(files: File[] = []): Partial<React.DragEvent<HTMLDivElement>> {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    dataTransfer: {
      files: files as unknown as FileList,
    } as DataTransfer,
  }
}

function getDropZone(container: HTMLElement): HTMLElement {
  // The drop zone is the label element with the border-dashed class (drag and drop area)
  return container.querySelector('label.border-dashed') as HTMLElement
}

describe('ImageUploadForm', () => {
  beforeEach(() => {
    useInstancesStore.setState({ selectedId: null })
    vi.clearAllMocks()
    ;(useInstances as Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders with file input and upload button', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })

    expect(container.querySelector('input[type="file"]')).toBeDefined()
    expect(within(container).getByRole('button', { name: /select file/i })).toBeDefined()
  })

  it('shows selected instance name in card title', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: [{ ...mockInstances[0], name: 'Living Room' }],
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })

    expect(container.textContent).toContain('Upload Image to Living Room')
  })

  it('shows "No Instance Selected" when no instance selected', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: null })

    const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })

    expect(container.textContent).toContain('No Instance Selected')
  })

  it('disables button when no instance selected', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: null })

    const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })

    const button = within(container).getByRole('button', { name: /select file/i })
    expect(button).toHaveProperty('disabled', true)
  })

  it('enables button when instance selected', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })

    const button = within(container).getByRole('button', { name: /select file/i })
    expect(button).toHaveProperty('disabled', false)
  })

  it('shows drag and drop zone with instructions', () => {
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })

    expect(container.textContent).toContain('Drag and drop an image, or click to select')
    expect(container.textContent).toContain('PNG, JPEG, GIF, BMP')
  })

  it('shows error for unsupported file type', async () => {
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })

    const unsupportedFile = createMockFile('test.txt', 'text/plain')
    uploadFile(container, unsupportedFile)

    await waitFor(() => {
      expect(container.textContent).toContain('Unsupported file type')
    })
  })

  it('shows error for file too large', async () => {
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })

    // 11MB file (over 10MB limit)
    const largeFile = createMockFile('test.png', 'image/png', 11 * 1024 * 1024)
    uploadFile(container, largeFile)

    await waitFor(() => {
      expect(container.textContent).toContain('File too large')
    })
  })

  it('triggers upload on valid file selection', async () => {
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    vi.mocked(sendImageModule.sendUploadedImageToDisplay).mockResolvedValue({ success: true })

    const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })

    const validFile = createMockFile('test.png', 'image/png', 1024)
    uploadFile(container, validFile)

    await waitFor(() => {
      expect(sendImageModule.sendUploadedImageToDisplay).toHaveBeenCalled()
    })
  })

  it('shows success message after successful upload', async () => {
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    vi.mocked(sendImageModule.sendUploadedImageToDisplay).mockResolvedValue({ success: true })

    const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })

    const validFile = createMockFile('test.png', 'image/png')
    uploadFile(container, validFile)

    await waitFor(() => {
      expect(container.textContent).toContain('Image sent successfully')
    })
  })

  it('shows error message on upload failure', async () => {
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    vi.mocked(sendImageModule.sendUploadedImageToDisplay).mockResolvedValue({
      success: false,
      error: 'Connection refused',
    })

    const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })

    const validFile = createMockFile('test.png', 'image/png')
    uploadFile(container, validFile)

    await waitFor(() => {
      expect(container.textContent).toContain('Connection refused')
    })
  })

  it('shows loading state during upload', async () => {
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    // Make mutation hang
    vi.mocked(sendImageModule.sendUploadedImageToDisplay).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    )

    const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })

    const validFile = createMockFile('test.png', 'image/png')
    uploadFile(container, validFile)

    await waitFor(() => {
      expect(container.textContent).toContain('Sending...')
    })
  })

  it('calls sendUploadedImageToDisplay with correct arguments', async () => {
    ;(useInstances as Mock).mockReturnValue({
      data: mockInstances,
      isLoading: false,
      error: null,
    })
    useInstancesStore.setState({ selectedId: '1' })

    vi.mocked(sendImageModule.sendUploadedImageToDisplay).mockResolvedValue({ success: true })

    const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })

    const validFile = createMockFile('test.png', 'image/png', 4)
    uploadFile(container, validFile)

    await waitFor(() => {
      expect(sendImageModule.sendUploadedImageToDisplay).toHaveBeenCalledWith({
        data: {
          imageData: expect.any(Array),
          mimeType: 'image/png',
          endpointUrl: 'http://localhost:4200',
        },
      })
    })
  })

  describe('drag and drop', () => {
    it('resets isDragging state on dragLeave', () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })
      const dropZone = getDropZone(container)

      // First drag over to set isDragging to true
      fireEvent.dragOver(dropZone, createMockDragEvent())

      // Verify drag state is active (border-primary class applied)
      expect(dropZone.className).toContain('border-primary')

      // Now drag leave
      fireEvent.dragLeave(dropZone, createMockDragEvent())

      // Verify drag state is reset (border-primary class removed)
      expect(dropZone.className).not.toContain('border-primary')
    })

    it('handles drop with invalid file type', async () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })
      const dropZone = getDropZone(container)

      const invalidFile = createMockFile('test.txt', 'text/plain')
      fireEvent.drop(dropZone, createMockDragEvent([invalidFile]))

      await waitFor(() => {
        expect(container.textContent).toContain('Unsupported file type')
      })

      // Should not call the server function
      expect(sendImageModule.sendUploadedImageToDisplay).not.toHaveBeenCalled()
    })

    it('handles drop with file too large', async () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })
      const dropZone = getDropZone(container)

      // 11MB file (over 10MB limit)
      const largeFile = createMockFile('test.png', 'image/png', 11 * 1024 * 1024)
      fireEvent.drop(dropZone, createMockDragEvent([largeFile]))

      await waitFor(() => {
        expect(container.textContent).toContain('File too large')
      })

      // Should not call the server function
      expect(sendImageModule.sendUploadedImageToDisplay).not.toHaveBeenCalled()
    })

    it('ignores drop when no instance is selected', async () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      // No instance selected
      useInstancesStore.setState({ selectedId: null })

      const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })
      const dropZone = getDropZone(container)

      const validFile = createMockFile('test.png', 'image/png')
      fireEvent.drop(dropZone, createMockDragEvent([validFile]))

      // Wait a bit to ensure nothing happens
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should not call the server function
      expect(sendImageModule.sendUploadedImageToDisplay).not.toHaveBeenCalled()
    })

    it('ignores drop when mutation is pending', async () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      // Make mutation hang
      vi.mocked(sendImageModule.sendUploadedImageToDisplay).mockImplementation(
        () => new Promise(() => {}), // Never resolves
      )

      const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })
      const dropZone = getDropZone(container)

      // Start first upload
      const firstFile = createMockFile('first.png', 'image/png')
      uploadFile(container, firstFile)

      // Wait for mutation to be pending
      await waitFor(() => {
        expect(container.textContent).toContain('Sending...')
      })

      // Reset mock call count
      vi.mocked(sendImageModule.sendUploadedImageToDisplay).mockClear()

      // Try to drop another file while pending
      const secondFile = createMockFile('second.png', 'image/png')
      fireEvent.drop(dropZone, createMockDragEvent([secondFile]))

      // Wait a bit to ensure nothing happens
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should not call the server function again
      expect(sendImageModule.sendUploadedImageToDisplay).not.toHaveBeenCalled()
    })

    it('handles drop with empty dataTransfer files', async () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })
      const dropZone = getDropZone(container)

      // Drop with no files
      fireEvent.drop(dropZone, createMockDragEvent([]))

      // Wait a bit to ensure nothing happens
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should not call the server function
      expect(sendImageModule.sendUploadedImageToDisplay).not.toHaveBeenCalled()
    })

    it('triggers upload on valid file drop', async () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      vi.mocked(sendImageModule.sendUploadedImageToDisplay).mockResolvedValue({ success: true })

      const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })
      const dropZone = getDropZone(container)

      const validFile = createMockFile('test.png', 'image/png')
      fireEvent.drop(dropZone, createMockDragEvent([validFile]))

      await waitFor(() => {
        expect(sendImageModule.sendUploadedImageToDisplay).toHaveBeenCalled()
      })
    })

    it('does not set isDragging on dragOver when no instance selected', () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      // No instance selected
      useInstancesStore.setState({ selectedId: null })

      const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })
      const dropZone = getDropZone(container)

      fireEvent.dragOver(dropZone, createMockDragEvent())

      // Should not have dragging state (no border-primary class)
      expect(dropZone.className).not.toContain('border-primary')
    })

    it('does not set isDragging on dragOver when mutation is pending', async () => {
      ;(useInstances as Mock).mockReturnValue({
        data: mockInstances,
        isLoading: false,
        error: null,
      })
      useInstancesStore.setState({ selectedId: '1' })

      // Make mutation hang
      vi.mocked(sendImageModule.sendUploadedImageToDisplay).mockImplementation(
        () => new Promise(() => {}), // Never resolves
      )

      const { container } = render(<ImageUploadForm />, { wrapper: createWrapper() })
      const dropZone = getDropZone(container)

      // Start upload
      const firstFile = createMockFile('first.png', 'image/png')
      uploadFile(container, firstFile)

      // Wait for mutation to be pending
      await waitFor(() => {
        expect(container.textContent).toContain('Sending...')
      })

      // Try to drag over while pending
      fireEvent.dragOver(dropZone, createMockDragEvent())

      // Should not have dragging state (disabled state takes precedence)
      expect(dropZone.className).not.toContain('border-primary')
    })
  })
})
