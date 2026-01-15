import { createFileRoute, Outlet, Link, useNavigate, redirect } from "@tanstack/react-router"
import { Home, Target, Calendar, MessageSquare, Settings, LogOut, Menu, Clock, BarChart3 } from "lucide-react"
import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@flow-day/convex"

import { signOut } from "@/lib/auth-client"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { FullPageLoading } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: "/sign-in",
        search: {
          redirect: location.pathname,
        },
      })
    }
  },
  component: AppLayout,
})

const navItems = [
  { to: "/timeline", label: "Timeline", icon: Clock },
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/scheduler", label: "Scheduler", icon: Calendar },
  { to: "/agent", label: "AI Agent", icon: MessageSquare },
  { to: "/review", label: "Review", icon: BarChart3 },
]

function AppLayout() {
  const { auth } = Route.useRouteContext()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Enable keyboard shortcuts
  useKeyboardShortcuts()

  // Check if user has completed onboarding
  const currentUser = useQuery(api.users.getCurrent)

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (currentUser && currentUser.onboardingCompleted === false) {
      navigate({ to: "/onboarding" })
    }
  }, [currentUser, navigate])

  const handleSignOut = async () => {
    await signOut()
    navigate({ to: "/" })
  }

  // Show loading while checking auth/onboarding status
  // currentUser is undefined while loading, null if not found (auth not synced yet)
  if (currentUser === undefined || currentUser === null) {
    return <FullPageLoading message="Loading your workspace..." />
  }

  const userInitials = auth.user?.name
    ? auth.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : auth.user?.email?.charAt(0).toUpperCase() || "U"

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Logo */}
            <Link to="/timeline" className="flex items-center gap-2 font-bold">
              <span className="text-xl">Flow Day</span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex md:items-center md:gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent [&.active]:bg-accent"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={auth.user?.image || undefined} alt={auth.user?.name || ""} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-2 p-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{auth.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{auth.user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile navigation */}
        {isMobileMenuOpen && (
          <nav className="border-t px-4 pb-4 md:hidden">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent [&.active]:bg-accent"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
