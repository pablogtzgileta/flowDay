import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { format, addHours, setHours, setMinutes, isAfter } from "date-fns"

import { api } from "@flow-day/convex"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface DurationOption {
  label: string
  hours: number
}

export function LazyModeToggle() {
  const currentUser = useQuery(api.users.getCurrent)
  const toggleLazyMode = useMutation(api.users.toggleLazyMode)

  const [isToggling, setIsToggling] = useState(false)
  const [showDurationPicker, setShowDurationPicker] = useState(false)

  // Check if lazy mode is currently active
  const isLazyModeActive = currentUser?.preferences?.lazyModeEnabled ?? false
  const lazyModeUntil = currentUser?.preferences?.lazyModeUntil

  // Calculate if lazy mode has expired
  const isExpired = lazyModeUntil ? Date.now() > lazyModeUntil : false
  const effectiveLazyMode = isLazyModeActive && !isExpired

  // Calculate duration options based on user's wake/sleep times
  const getDurationOptions = (): DurationOption[] => {
    const now = new Date()
    const wakeTime = currentUser?.preferences?.wakeTime ?? "07:00"
    const sleepTime = currentUser?.preferences?.sleepTime ?? "23:00"

    // Parse sleep time for today
    const [sleepHour, sleepMinute] = sleepTime.split(":").map(Number)
    let sleepDate = setMinutes(setHours(now, sleepHour ?? 23), sleepMinute ?? 0)

    // If sleep time is past (e.g., it's 11pm and sleep is 10pm), use tomorrow
    if (!isAfter(sleepDate, now)) {
      sleepDate = addHours(sleepDate, 24)
    }

    // Calculate hours until sleep
    const hoursUntilSleep = Math.max(1, Math.floor((sleepDate.getTime() - now.getTime()) / (1000 * 60 * 60)))

    // Parse wake time for tomorrow
    const [wakeHour, wakeMinute] = wakeTime.split(":").map(Number)
    let wakeDate = setMinutes(setHours(now, wakeHour ?? 7), wakeMinute ?? 0)
    wakeDate = addHours(wakeDate, 24) // Tomorrow's wake time

    const hoursUntilTomorrow = Math.max(1, Math.floor((wakeDate.getTime() - now.getTime()) / (1000 * 60 * 60)))

    const options: DurationOption[] = [
      { label: "Next 2 hours", hours: 2 },
      { label: "Next 4 hours", hours: 4 },
    ]

    // Add "Rest of today" if there's more than 4 hours until sleep
    if (hoursUntilSleep > 4) {
      options.push({
        label: `Rest of today (~${hoursUntilSleep}h)`,
        hours: hoursUntilSleep,
      })
    }

    // Add "Until tomorrow"
    options.push({
      label: `Until tomorrow (~${hoursUntilTomorrow}h)`,
      hours: hoursUntilTomorrow,
    })

    return options
  }

  const durationOptions = getDurationOptions()

  // Handle toggle click
  const handleToggleClick = async () => {
    if (effectiveLazyMode) {
      // Disable lazy mode
      setIsToggling(true)
      try {
        await toggleLazyMode({ enabled: false })
        toast.success("Lazy mode disabled")
      } catch (error) {
        console.error("Failed to disable lazy mode:", error)
        toast.error("Failed to disable lazy mode")
      } finally {
        setIsToggling(false)
      }
    } else {
      // Show duration picker
      setShowDurationPicker(true)
    }
  }

  // Handle duration selection
  const handleDurationSelect = async (hours: number) => {
    setIsToggling(true)
    setShowDurationPicker(false)
    try {
      await toggleLazyMode({ enabled: true, durationHours: hours })
      toast.success("Lazy mode enabled")
    } catch (error) {
      console.error("Failed to enable lazy mode:", error)
      toast.error("Failed to enable lazy mode")
    } finally {
      setIsToggling(false)
    }
  }

  // Format expiry time for display
  const formatExpiryTime = () => {
    if (!lazyModeUntil) return null
    return format(new Date(lazyModeUntil), "h:mm a")
  }

  // Close duration picker when clicking outside or pressing escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowDurationPicker(false)
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  if (currentUser === undefined) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">😴</span>
              <div>
                <CardTitle className="text-base">Lazy Mode</CardTitle>
                <CardDescription>Loading...</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">😴</span>
            <div>
              <CardTitle className="text-base">Lazy Mode</CardTitle>
              <CardDescription>
                {effectiveLazyMode
                  ? `Active until ${formatExpiryTime()}`
                  : "Take a break from scheduling pressure"}
              </CardDescription>
            </div>
          </div>

          {/* Custom Toggle Switch */}
          <button
            onClick={handleToggleClick}
            disabled={isToggling}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              effectiveLazyMode ? "bg-primary" : "bg-gray-300 dark:bg-gray-600",
              isToggling && "opacity-50 cursor-not-allowed"
            )}
            aria-label={effectiveLazyMode ? "Disable lazy mode" : "Enable lazy mode"}
          >
            {isToggling ? (
              <Loader2 className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
            ) : (
              <span
                className={cn(
                  "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  effectiveLazyMode && "translate-x-5"
                )}
              />
            )}
          </button>
        </div>
      </CardHeader>

      {/* Duration Picker */}
      {showDurationPicker && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">How long do you want to relax?</p>
            <div className="flex flex-wrap gap-2">
              {durationOptions.map((option) => (
                <button
                  key={option.hours}
                  onClick={() => handleDurationSelect(option.hours)}
                  className="min-h-[44px] rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:border-primary/50 touch-manipulation"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDurationPicker(false)}
              className="mt-2 min-h-[44px] px-4 py-2 text-sm text-muted-foreground hover:text-foreground touch-manipulation"
            >
              Cancel
            </button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
