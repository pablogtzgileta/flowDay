import { createFileRoute, Link, Navigate } from "@tanstack/react-router"
import { useSession } from "@/lib/auth-client"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export const Route = createFileRoute("/")({
  component: HomePage,
})

function HomePage() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Redirect authenticated users directly to Timeline
  if (session?.user) {
    return <Navigate to="/timeline" />
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">Flow Day</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Your AI-powered daily productivity companion
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          to="/sign-in"
          search={{ redirect: "/timeline" }}
          className="rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
        >
          Sign In
        </Link>
        <Link
          to="/sign-up"
          className="rounded-lg border border-border px-6 py-3 hover:bg-accent"
        >
          Sign Up
        </Link>
      </div>
    </div>
  )
}
