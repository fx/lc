import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Loader2, Upload, XCircle } from 'lucide-react'
import { type ChangeEvent, type DragEvent, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useInstances } from '@/hooks/use-instances'
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
} from '@/lib/image-constants'
import { sendUploadedImageToDisplay } from '@/lib/send-image-to-display'
import { cn } from '@/lib/utils'
import { useInstancesStore } from '@/stores/instances'

export function ImageUploadForm() {
  const formId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const { data: instances } = useInstances()
  const selectedId = useInstancesStore((state) => state.selectedId)
  const selectedInstance = instances?.find((i) => i.id === selectedId)

  const fileInputId = `${formId}-file`
  const fileErrorId = `${formId}-file-error`

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      if (!selectedInstance) {
        throw new Error('No instance selected')
      }

      const arrayBuffer = await file.arrayBuffer()
      const imageData = Array.from(new Uint8Array(arrayBuffer))

      const result = await sendUploadedImageToDisplay({
        data: {
          imageData,
          mimeType: file.type,
          endpointUrl: selectedInstance.endpointUrl,
        },
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to send image')
      }
      return result
    },
    onSuccess: () => {
      setFileError(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
  })

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return `Unsupported file type: ${file.type || 'unknown'}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_UPLOAD_SIZE_MB}MB limit`
    }
    return null
  }

  const handleFile = (file: File) => {
    const error = validateFile(file)
    if (error) {
      setFileError(error)
      return
    }
    setFileError(null)
    mutation.reset()
    mutation.mutate(file)
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!selectedInstance || mutation.isPending) return
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (!selectedInstance || mutation.isPending) return

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const isDisabled = !selectedInstance || mutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {selectedInstance ? `Upload Image to ${selectedInstance.name}` : 'No Instance Selected'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={fileInputId}>Image File</Label>
            <label
              htmlFor={fileInputId}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'flex flex-col items-center justify-center gap-2 border-2 border-dashed p-6 transition-colors cursor-pointer',
                isDragging && 'border-primary bg-primary/5',
                isDisabled && 'cursor-not-allowed opacity-50',
                !isDragging &&
                  !isDisabled &&
                  'border-muted-foreground/25 hover:border-muted-foreground/50',
              )}
              aria-describedby={fileError ? fileErrorId : undefined}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {mutation.isPending ? 'Uploading...' : 'Drag and drop an image, or click to select'}
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPEG, GIF, BMP (max {MAX_UPLOAD_SIZE_MB}MB)
              </p>
            </label>
            <Input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              accept={ALLOWED_MIME_TYPES.join(',')}
              onChange={handleFileChange}
              disabled={isDisabled}
              className="sr-only"
              aria-invalid={!!fileError}
              aria-describedby={fileError ? fileErrorId : undefined}
            />
            {fileError && (
              <p id={fileErrorId} className="text-sm text-destructive">
                {fileError}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Select File
                </>
              )}
            </Button>

            {mutation.isSuccess && (
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Image sent successfully
              </span>
            )}

            {mutation.isError && (
              <span className="flex items-center gap-1 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                {mutation.error instanceof Error ? mutation.error.message : 'Failed to send image'}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
