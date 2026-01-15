import { memo } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  subtitle?: string
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  color?: string
  size?: "small" | "medium" | "large"
  className?: string
}

export const StatCard = memo(function StatCard({
  label,
  value,
  subtitle,
  trend,
  trendValue,
  color,
  size = "medium",
  className,
}: StatCardProps) {
  const getValueSize = () => {
    switch (size) {
      case "small":
        return "text-lg"
      case "large":
        return "text-3xl"
      default:
        return "text-2xl"
    }
  }

  const getTrendColor = () => {
    if (trend === "up") return "text-green-500"
    if (trend === "down") return "text-red-500"
    return "text-muted-foreground"
  }

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null

  return (
    <div
      className={cn(
        "flex min-w-[100px] flex-1 flex-col rounded-lg bg-card p-4",
        className
      )}
      role="group"
      aria-label={`${label}: ${value}${trendValue ? `, ${trend === "up" ? "increased" : trend === "down" ? "decreased" : ""} by ${trendValue}` : ""}${subtitle ? `, ${subtitle}` : ""}`}
    >
      <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>

      <div className="flex items-baseline gap-2">
        <span
          className={cn("font-bold", getValueSize())}
          style={color ? { color } : undefined}
        >
          {value}
        </span>

        {trend && trendValue && (
          <div className={cn("flex items-center gap-0.5 text-xs font-semibold", getTrendColor())}>
            {TrendIcon && <TrendIcon className="h-3 w-3" />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      {subtitle && (
        <span className="mt-1 text-sm text-muted-foreground">
          {subtitle}
        </span>
      )}
    </div>
  )
})
