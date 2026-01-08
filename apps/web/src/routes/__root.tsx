import { Outlet, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"

import { convex, queryClient } from "@/lib/convex"
import { authClient } from "@/lib/auth-client"

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background text-foreground">
          <Outlet />
        </div>
        <Toaster richColors position="top-right" />
        {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
      </QueryClientProvider>
    </ConvexBetterAuthProvider>
  )
}
