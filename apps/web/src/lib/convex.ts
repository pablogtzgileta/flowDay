import { ConvexReactClient } from "convex/react"
import { ConvexQueryClient } from "@convex-dev/react-query"
import { QueryClient } from "@tanstack/react-query"

const convexUrl = import.meta.env.VITE_CONVEX_URL

if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL environment variable is required")
}

// Create Convex client with auth expectation
export const convex = new ConvexReactClient(convexUrl, {
  // skipConvexDeploymentUrlCheck: true, // Enable if using custom domains
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
