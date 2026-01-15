import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { useQuery, useMutation } from "convex/react"
import { useState } from "react"
import {
  User,
  Clock,
  Moon,
  Sun,
  Zap,
  Bell,
  LogOut,
  Save,
  Loader2,
  ChevronRight,
  BarChart3
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@flow-day/convex"
import { signOut } from "@/lib/auth-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { PageLoading } from "@/components/ui/loading-spinner"
import { LazyModeToggle } from "@/components/settings/lazy-mode-toggle"
import { RolloverSettings } from "@/components/settings/rollover-settings"
import { LocationManager } from "@/components/settings/location-manager"

// Time options (same as onboarding)
const WAKE_TIME_OPTIONS = [
  "05:00", "05:30", "06:00", "06:30", "07:00", "07:30",
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00",
]

const SLEEP_TIME_OPTIONS = [
  "20:00", "20:30", "21:00", "21:30", "22:00", "22:30",
  "23:00", "23:30", "00:00", "00:30", "01:00", "01:30", "02:00",
]

type EnergyWindow = "morning" | "afternoon" | "evening"
type NotificationStyle = "minimal" | "proactive"

// Format time for display
function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(":")
  const hour = parseInt(hours ?? "0", 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const navigate = useNavigate()
  const currentUser = useQuery(api.users.getCurrent)
  const updatePreferences = useMutation(api.users.updatePreferences)

  // Local form state
  const [wakeTime, setWakeTime] = useState<string | null>(null)
  const [sleepTime, setSleepTime] = useState<string | null>(null)
  const [peakEnergy, setPeakEnergy] = useState<EnergyWindow | null>(null)
  const [notificationStyle, setNotificationStyle] = useState<NotificationStyle | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize form state when user data loads
  const effectiveWakeTime = wakeTime ?? currentUser?.preferences?.wakeTime ?? "07:00"
  const effectiveSleepTime = sleepTime ?? currentUser?.preferences?.sleepTime ?? "23:00"
  const effectivePeakEnergy = peakEnergy ?? currentUser?.preferences?.peakEnergyWindow ?? "morning"
  const effectiveNotificationStyle = notificationStyle ?? currentUser?.preferences?.notificationStyle ?? "proactive"

  const handleSavePreferences = async () => {
    setIsSaving(true)

    try {
      await updatePreferences({
        wakeTime: effectiveWakeTime,
        sleepTime: effectiveSleepTime,
        peakEnergyWindow: effectivePeakEnergy,
        notificationStyle: effectiveNotificationStyle,
      })
      toast.success("Settings saved successfully!")
      // Clear local state to use server values
      setWakeTime(null)
      setSleepTime(null)
      setPeakEnergy(null)
      setNotificationStyle(null)
    } catch (error) {
      console.error("Failed to update preferences:", error)
      toast.error("Failed to save settings. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate({ to: "/" })
  }

  // Check if there are unsaved changes
  const hasChanges =
    (wakeTime !== null && wakeTime !== currentUser?.preferences?.wakeTime) ||
    (sleepTime !== null && sleepTime !== currentUser?.preferences?.sleepTime) ||
    (peakEnergy !== null && peakEnergy !== currentUser?.preferences?.peakEnergyWindow) ||
    (notificationStyle !== null && notificationStyle !== currentUser?.preferences?.notificationStyle)

  if (currentUser === undefined) {
    return <PageLoading message="Loading settings..." />
  }

  return (
    <div className="container max-w-4xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSavePreferences} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        )}
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="font-medium">{currentUser?.name || "Not set"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{currentUser?.email || "Not set"}</p>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Timezone</Label>
            <p className="font-medium">{currentUser?.preferences?.timezone || "UTC"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Schedule Preferences
          </CardTitle>
          <CardDescription>Customize your daily schedule</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Wake Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-amber-500" />
              <Label>Wake Time</Label>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Wake time options">
              {WAKE_TIME_OPTIONS.map((time) => (
                <button
                  key={time}
                  onClick={() => setWakeTime(time)}
                  aria-pressed={effectiveWakeTime === time}
                  className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium transition-colors touch-manipulation ${
                    effectiveWakeTime === time
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {formatTimeDisplay(time)}
                </button>
              ))}
            </div>
          </div>

          {/* Sleep Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-indigo-500" />
              <Label>Sleep Time</Label>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Sleep time options">
              {SLEEP_TIME_OPTIONS.map((time) => (
                <button
                  key={time}
                  onClick={() => setSleepTime(time)}
                  aria-pressed={effectiveSleepTime === time}
                  className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium transition-colors touch-manipulation ${
                    effectiveSleepTime === time
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {formatTimeDisplay(time)}
                </button>
              ))}
            </div>
          </div>

          {/* Peak Energy */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <Label>Peak Energy Window</Label>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Peak energy window options">
              {[
                { value: "morning" as const, label: "Morning", emoji: "🌅" },
                { value: "afternoon" as const, label: "Afternoon", emoji: "☀️" },
                { value: "evening" as const, label: "Evening", emoji: "🌙" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPeakEnergy(option.value)}
                  aria-pressed={effectivePeakEnergy === option.value}
                  className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors touch-manipulation ${
                    effectivePeakEnergy === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <span aria-hidden="true">{option.emoji}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>How should we remind you?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row" role="group" aria-label="Notification style options">
            <button
              onClick={() => setNotificationStyle("minimal")}
              aria-pressed={effectiveNotificationStyle === "minimal"}
              className={`min-h-[44px] flex-1 rounded-lg border p-4 text-left transition-colors touch-manipulation ${
                effectiveNotificationStyle === "minimal"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">🔕</span>
                <div>
                  <div className="font-semibold">Minimal</div>
                  <div className="text-sm text-muted-foreground">
                    Only notify for important events
                  </div>
                </div>
              </div>
            </button>
            <button
              onClick={() => setNotificationStyle("proactive")}
              aria-pressed={effectiveNotificationStyle === "proactive"}
              className={`min-h-[44px] flex-1 rounded-lg border p-4 text-left transition-colors touch-manipulation ${
                effectiveNotificationStyle === "proactive"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">🔔</span>
                <div>
                  <div className="font-semibold">Proactive</div>
                  <div className="text-sm text-muted-foreground">
                    Help me stay on track throughout the day
                  </div>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Location Manager */}
      <LocationManager />

      {/* Lazy Mode */}
      <LazyModeToggle />

      {/* Rollover Settings */}
      <RolloverSettings />

      {/* Energy Profile Link */}
      <Card className="transition-colors hover:bg-accent/50">
        <Link to="/settings/energy">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <CardTitle className="text-base">Energy Profile</CardTitle>
                <CardDescription>
                  Customize your 24-hour energy levels for smarter scheduling
                </CardDescription>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
        </Link>
      </Card>

      {/* Weekly Insights Link */}
      <Card className="transition-colors hover:bg-accent/50">
        <Link to="/review">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base">Weekly Insights</CardTitle>
                <CardDescription>
                  View your weekly stats, progress, and personalized suggestions
                </CardDescription>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
        </Link>
      </Card>

      {/* Danger Zone */}
      <Separator />
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Sign Out</CardTitle>
          <CardDescription>
            Sign out of your account on this device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
