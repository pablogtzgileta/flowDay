import { memo } from "react"
import { ProgressRing } from "@/components/ui/progress-ring"
import { cn } from "@/lib/utils"

type GoalStatus = "ahead" | "on_track" | "behind" | "complete"

interface GoalProgressCardProps {
  title: string
  category: string
  targetMinutes: number
  completedMinutes: number
  percentComplete: number
  status: GoalStatus
  sessionsCompleted: number
  className?: string
}

const statusStyles: Record<GoalStatus, {
  badge: string
  label: string
  ringColor: string
}> = {
  complete: {
    badge: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
    label: "Complete",
    ringColor: "hsl(142 76% 36%)", // green-600
  },
  ahead: {
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
    label: "Ahead",
    ringColor: "hsl(221 83% 53%)", // blue-600
  },
  on_track: {
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    label: "On Track",
    ringColor: "hsl(var(--primary))",
  },
  behind: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
    label: "Behind",
    ringColor: "hsl(38 92% 50%)", // amber-500
  },
}

const categoryEmojis: Record<string, string> = {
  health: "💪",
  work: "💼",
  learning: "📚",
  creative: "🎨",
  social: "👥",
  personal: "🧘",
  finance: "💰",
  other: "🎯",
}

function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export const GoalProgressCard = memo(function GoalProgressCard({
  title,
  category,
  targetMinutes,
  completedMinutes,
  percentComplete,
  status,
  sessionsCompleted,
  className,
}: GoalProgressCardProps) {
  const styles = statusStyles[status]
  const emoji = categoryEmojis[category] || categoryEmojis.other

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg bg-card p-4",
        className
      )}
      role="article"
      aria-label={`${title}: ${percentComplete}% complete, ${styles.label}`}
    >
      {/* Progress Ring */}
      <ProgressRing
        progress={percentComplete}
        size={56}
        strokeWidth={5}
        showPercentage={true}
        color={styles.ringColor}
        backgroundColor="hsl(var(--muted-foreground))"
      />

      {/* Goal Info */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-base" aria-hidden="true">{emoji}</span>
          <h4 className="truncate text-sm font-semibold">{title}</h4>
        </div>

        <p className="text-xs text-muted-foreground">
          {formatMinutesToHours(completedMinutes)} of {formatMinutesToHours(targetMinutes)} ({sessionsCompleted} {sessionsCompleted === 1 ? "session" : "sessions"})
        </p>
      </div>

      {/* Status Badge */}
      <span className={cn("shrink-0 rounded-full px-2 py-1 text-xs font-medium", styles.badge)}>
        {styles.label}
      </span>
    </div>
  )
})
