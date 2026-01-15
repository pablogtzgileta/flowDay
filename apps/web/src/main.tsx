import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider } from "@tanstack/react-router"
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { QueryClientProvider } from "@tanstack/react-query"

import "./styles.css"

import { router } from "./router"
import { useSession, authClient } from "@/lib/auth-client"
import { convex, queryClient } from "@/lib/convex"
import { ErrorBoundary } from "@/components/error-boundary"
import { FullPageLoading } from "@/components/ui/loading-spinner"

function AppRouter() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return <FullPageLoading message="Loading..." />
  }

  const auth = {
    isAuthenticated: Boolean(session?.user),
    user: session?.user ?? null,
    isPending,
  }

  return <RouterProvider router={router} context={{ auth }} />
}

// Render the app
const rootElement = document.getElementById("app")
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <ConvexBetterAuthProvider client={convex} authClient={authClient}>
          <QueryClientProvider client={queryClient}>
            <AppRouter />
          </QueryClientProvider>
        </ConvexBetterAuthProvider>
      </ErrorBoundary>
    </StrictMode>
  )
}
