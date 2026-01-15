import { Link, type LinkProps } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  ctaLabel?: string
  ctaTo?: LinkProps["to"]
  ctaAction?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  ctaLabel,
  ctaTo,
  ctaAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-semibold mb-1">{title}</h3>

      {subtitle && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {subtitle}
        </p>
      )}

      {ctaLabel && (ctaTo || ctaAction) && (
        <>
          {ctaTo ? (
            <Button asChild>
              <Link to={ctaTo}>{ctaLabel}</Link>
            </Button>
          ) : (
            <Button onClick={ctaAction}>{ctaLabel}</Button>
          )}
        </>
      )}
    </div>
  )
}
