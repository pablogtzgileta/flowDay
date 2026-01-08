import { createFileRoute, Link } from "@tanstack/react-router"
import { useSession } from "@/lib/auth-client"

export const Route = createFileRoute("/")({
  component: HomePage,
})

function HomePage() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    )
  }

  if (session?.user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6">
        <h1 className="text-4xl font-bold">Welcome back, {session.user.name || session.user.email}</h1>
        <p className="text-muted-foreground">You are signed in.</p>
        <Link
          to="/dashboard"
          className="rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
        >
          Go to Dashboard
        </Link>
      </div>
    )
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
