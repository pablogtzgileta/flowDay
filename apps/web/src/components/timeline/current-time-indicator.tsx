import { memo, useState, useEffect, useRef } from "react"
import { format } from "date-fns"

/**
 * CurrentTimeIndicator - Red dot + horizontal line + time label
 * Updates every minute (synced to minute boundary)
 * Only shown on "Today" tab (controlled by parent)
 */
function CurrentTimeIndicatorComponent() {
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Calculate ms until next minute boundary for precise timing
    const now = new Date()
    const msUntilNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds()

    // Initial timeout to sync with minute boundary
    const initialTimeout = setTimeout(() => {
      setCurrentTime(new Date())

      // Then update every 60 seconds
      intervalRef.current = setInterval(() => {
        setCurrentTime(new Date())
      }, 60000)
    }, msUntilNextMinute)

    // Handle visibility change - sync time when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setCurrentTime(new Date())
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearTimeout(initialTimeout)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  const timeString = format(currentTime, "HH:mm")
  const accessibleTimeString = format(currentTime, "h:mm a")

  return (
    <div
      className="flex items-center gap-0 my-2 -ml-1"
      role="status"
      aria-label={`Current time: ${accessibleTimeString}`}
      aria-live="polite"
    >
      {/* Red dot */}
      <div
        className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0"
        aria-hidden="true"
      />

      {/* Horizontal line */}
      <div
        className="flex-1 h-0.5 bg-red-500"
        aria-hidden="true"
      />

      {/* Time label */}
      <span
        className="text-xs font-semibold text-red-500 ml-2 flex-shrink-0"
        aria-hidden="true"
      >
        {timeString}
      </span>
    </div>
  )
}

// Memoize - this component has no props, so memo is simple
export const CurrentTimeIndicator = memo(CurrentTimeIndicatorComponent)
