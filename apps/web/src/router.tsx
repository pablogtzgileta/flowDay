import { createRouter } from "@tanstack/react-router"

import { routeTree } from "./routeTree.gen"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { RouteErrorFallback } from "@/components/error-boundary"

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultPendingMs: 1000,
  defaultPendingComponent: () => (
    <div className="flex h-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  ),
  defaultErrorComponent: ({ error, reset }) => (
    <RouteErrorFallback error={error} reset={reset} />
  ),
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
