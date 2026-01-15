import { memo } from "react"
import { cn } from "@/lib/utils"

type InsightSeverity = "info" | "warning" | "success" | "error"

interface InsightCardProps {
  icon: string
  title: string
  description: string
  severity: InsightSeverity
  onClick?: () => void
  className?: string
}

const severityStyles: Record<InsightSeverity, {
  container: string
  iconBg: string
  title: string
}> = {
  success: {
    container: "bg-green-50 dark:bg-green-950/30",
    iconBg: "bg-green-100 dark:bg-green-900/50",
    title: "text-green-700 dark:text-green-400",
  },
  warning: {
    container: "bg-amber-50 dark:bg-amber-950/30",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    title: "text-amber-700 dark:text-amber-400",
  },
  error: {
    container: "bg-red-50 dark:bg-red-950/30",
    iconBg: "bg-red-100 dark:bg-red-900/50",
    title: "text-red-700 dark:text-red-400",
  },
  info: {
    container: "bg-blue-50 dark:bg-blue-950/30",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    title: "text-blue-700 dark:text-blue-400",
  },
}

export const InsightCard = memo(function InsightCard({
  icon,
  title,
  description,
  severity,
  onClick,
  className,
}: InsightCardProps) {
  const styles = severityStyles[severity]
  const severityLabel = severity === "info" ? "information" : severity

  const content = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg p-3",
        styles.container,
        onClick && "cursor-pointer transition-opacity hover:opacity-80",
        className
      )}
      role={onClick ? "button" : "article"}
      aria-label={`${severityLabel} insight: ${title}. ${description}`}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      } : undefined}
    >
      {/* Icon container */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xl",
          styles.iconBg
        )}
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold", styles.title)}>
          {title}
        </p>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  )

  return content
})
