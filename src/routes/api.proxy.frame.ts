import { createAPIFileRoute } from '@tanstack/start/api'

export const APIRoute = createAPIFileRoute('/api/proxy/frame')({
  POST: async ({ request }) => {
    try {
      const body = await request.json()
      const { endpointUrl, frameData } = body as { endpointUrl: string; frameData: number[] }

      if (!endpointUrl || !frameData) {
        return new Response(JSON.stringify({ error: 'endpointUrl and frameData are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const rgbaData = new Uint8Array(frameData)
      const formData = new FormData()
      formData.append('frame', new Blob([rgbaData]))

      const response = await fetch(`${endpointUrl}/frame`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        return new Response(JSON.stringify({ error: `Upstream error: ${response.status}` }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  },
})
