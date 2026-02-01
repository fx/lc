import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Define RouterContext type for TanStack Query integration
export interface RouterContext {
  queryClient: QueryClient
}

// Create a new router instance with fresh QueryClient per request for SSR
export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5000,
      },
    },
  })

  const router = createRouter({
    routeTree,
    context: {
      queryClient,
    },

    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

  return router
}
