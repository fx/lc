import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { InstanceForm } from '@/components/instance-form'
import { InstanceList } from '@/components/instance-list'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/settings')({
  component: Settings,
})

function Settings() {
  return (
    <main className="flex-1 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Instances</CardTitle>
            <CardDescription>
              Manage your LED matrix bridge instances. Each instance connects to a separate
              led-matrix-zmq-http-bridge API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <InstanceList />
            <Separator />
            <div>
              <h3 className="text-sm font-medium mb-4">Add New Instance</h3>
              <InstanceForm />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
