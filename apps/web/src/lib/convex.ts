import { ConvexReactClient } from "convex/react"
import { ConvexQueryClient } from "@convex-dev/react-query"
import { QueryClient } from "@tanstack/react-query"

const convexUrl = import.meta.env.VITE_CONVEX_URL
const siteUrl = import.meta.env.VITE_CONVEX_SITE_URL

if (!convexUrl) {
  throw new Error(
    "VITE_CONVEX_URL is not set. " +
    "Copy .env.example to .env.local and fill in the values."
  )
}

if (!siteUrl) {
  throw new Error(
    "VITE_CONVEX_SITE_URL is not set. " +
    "Copy .env.example to .env.local and fill in the values."
  )
}

// Create Convex client with auth expectation
export const convex = new ConvexReactClient(convexUrl, {
  // Pause queries until the user is authenticated
  // This ensures auth token is available before making requests
})

// Create Convex Query client for TanStack Query integration
export const convexQueryClient = new ConvexQueryClient(convex)

// Create TanStack Query client with Convex integration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
      staleTime: 0, // Convex handles freshness via subscriptions
      gcTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

// Connect the clients
convexQueryClient.connect(queryClient)
