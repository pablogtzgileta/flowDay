import { useState } from "react"
import { useMutation } from "convex/react"
import { ChevronDown, ChevronUp, Lightbulb, Loader2, Check } from "lucide-react"
import { toast } from "sonner"

import { api } from "@flow-day/convex"
import type { Id } from "@flow-day/convex"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"

interface SuggestionAction {
  type: string
  routineId?: string
  goalId?: string
  newDayOfWeek?: DayOfWeek
  newStartTime?: string
  newDuration?: number
}

interface SuggestionCardProps {
  id: string
  title: string
  description: string
  reasoning: string
  action: SuggestionAction
  onApplied?: () => void
  onDismiss?: () => void
  className?: string
}

export function SuggestionCard({
  id: _id,
  title,
  description,
  reasoning,
  action,
  onApplied,
  onDismiss,
  className,
}: SuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [isApplied, setIsApplied] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  // Mutations for applying suggestions
  const updateRoutine = useMutation(api.routines.update)
  const updateGoal = useMutation(api.goals.updateGoal)

  const handleApply = async () => {
    setIsApplying(true)
    try {
      switch (action.type) {
        case "move_routine":
          if (action.newDayOfWeek) {
            // Validate routineId is a non-empty string before casting
            if (typeof action.routineId !== "string" || !action.routineId.trim()) {
              console.error("Invalid routineId: expected non-empty string", action.routineId)
              toast.error("Invalid routine ID")
              setIsApplying(false)
              return
            }
            await updateRoutine({
              routineId: action.routineId as Id<"routines">,
              dayOfWeek: action.newDayOfWeek,
            })
            toast.success("Routine moved successfully")
          }
          break

        case "adjust_target":
          if (action.newDuration) {
            // Validate goalId is a non-empty string before casting
            if (typeof action.goalId !== "string" || !action.goalId.trim()) {
              console.error("Invalid goalId: expected non-empty string", action.goalId)
              toast.error("Invalid goal ID")
              setIsApplying(false)
              return
            }
            await updateGoal({
              goalId: action.goalId as Id<"goals">,
              weeklyTargetMinutes: action.newDuration,
            })
            toast.success("Goal target adjusted")
          }
          break

        // For other suggestion types, just mark as applied
        default:
          toast.success("Suggestion acknowledged")
          break
      }

      setIsApplied(true)
      onApplied?.()
    } catch (error) {
      console.error("Failed to apply suggestion:", error)
      toast.error("Failed to apply suggestion")
      setIsApplying(false)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  if (isDismissed) {
    return null
  }

  if (isApplied) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30",
          className
        )}
        role="status"
        aria-live="polite"
      >
        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
        <span className="text-sm font-medium text-green-600 dark:text-green-400">
          Applied successfully
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-primary/30 bg-card p-4",
        className
      )}
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/50">
          <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <h4 className="flex-1 text-sm font-semibold">{title}</h4>
      </div>

      {/* Description */}
      <p className="mb-3 text-sm text-muted-foreground">{description}</p>

      {/* Expandable reasoning section */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-3 flex w-full items-center gap-1 text-left text-xs font-semibold text-muted-foreground hover:text-foreground"
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        Why?
      </button>

      {isExpanded && (
        <div className="mb-3 rounded-md bg-muted/50 p-3">
          <p className="text-sm italic text-foreground">{reasoning}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          disabled={isApplying}
        >
          Dismiss
        </Button>
        <Button
          size="sm"
          onClick={handleApply}
          disabled={isApplying}
        >
          {isApplying ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Applying...
            </>
          ) : (
            "Apply"
          )}
        </Button>
      </div>
    </div>
  )
}
