import { createFileRoute } from '@tanstack/react-router'
import { ThemeToggle } from '@/components/theme-toggle'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main className="flex-1 p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">LED Matrix Controller</h1>
        <ThemeToggle />
      </div>
      <p className="text-muted-foreground">
        Control your LED matrix displays via the led-matrix-zmq-http-bridge API.
      </p>
    </main>
  )
}
