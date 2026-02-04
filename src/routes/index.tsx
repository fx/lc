import { createFileRoute, Link } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import { ImageUrlForm } from '@/components/image-url-form'
import { useInstancesStore } from '@/stores/instances'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const instances = useInstancesStore((state) => state.instances)
  const hasInstances = instances.length > 0

  return (
    <main className="flex-1 p-6">
      {hasInstances ? (
        <div className="space-y-6">
          <p className="text-muted-foreground">
            Control your LED matrix displays via the led-matrix-zmq-http-bridge API.
          </p>
          <ImageUrlForm />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <h2 className="text-xl font-semibold mb-2">No instances configured</h2>
          <p className="text-muted-foreground mb-4">
            Add an LED matrix bridge instance to get started.
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <Settings className="h-4 w-4" />
            Go to Settings
          </Link>
        </div>
      )}
    </main>
  )
}
