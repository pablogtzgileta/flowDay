import { useState, memo } from "react"
import { Link } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { Check, X, Target, Car, Clock } from "lucide-react"
import { toast } from "sonner"

import { api, type Doc } from "@flow-day/convex"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { calculateDuration } from "@/lib/date-utils"

type Block = Doc<"blocks">

interface TimeBlockProps {
  block: Block
  goalTitle?: string
}

// Status to color mapping
const statusStyles: Record<Block["status"], string> = {
  planned: "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/30",
  in_progress: "border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/30",
  completed: "border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/30",
  skipped: "border-l-4 border-l-gray-400 bg-gray-50 dark:bg-gray-900/50 opacity-60",
  moved: "border-l-4 border-l-purple-500 bg-purple-50 dark:bg-purple-950/30 opacity-60",
}

// Truncate description to a max length
function truncateDescription(text: string | undefined, maxLength: number = 80): string {
  if (!text) return ""
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + "..."
}

export const TimeBlock = memo(function TimeBlock({ block, goalTitle }: TimeBlockProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const updateStatus = useMutation(api.blocks.updateStatus)

  const duration = calculateDuration(block.startTime, block.endTime)
  const isActionable = block.status === "planned" || block.status === "in_progress"

  const handleComplete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isUpdating) return

    setIsUpdating(true)
    try {
      await updateStatus({
        blockId: block._id,
        status: "completed",
      })
      toast.success("Block completed!", {
        description: block.title,
      })
    } catch (error) {
      toast.error("Failed to complete block")
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSkip = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isUpdating) return

    setIsUpdating(true)
    try {
      await updateStatus({
        blockId: block._id,
        status: "skipped",
      })
      toast.success("Block skipped", {
        description: block.title,
      })
    } catch (error) {
      toast.error("Failed to skip block")
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div
      className={cn(
        "group relative rounded-lg p-4 transition-all duration-200",
        statusStyles[block.status],
        isHovered && isActionable && "shadow-md ring-1 ring-primary/20"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={`Block: ${block.title}, ${block.startTime} to ${block.endTime}, status: ${block.status}`}
    >
      {/* Time range and duration */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Clock className="h-3.5 w-3.5" />
        <span className="font-medium">
          {block.startTime} - {block.endTime}
        </span>
        <span className="text-xs">({duration} min)</span>
      </div>

      {/* Title */}
      <h3 className={cn(
        "font-semibold text-base",
        block.status === "completed" && "line-through",
        block.status === "skipped" && "line-through text-muted-foreground"
      )}>
        {block.title}
      </h3>

      {/* Description */}
      {block.description && (
        <p className="text-sm text-muted-foreground mt-1">
          {truncateDescription(block.description)}
        </p>
      )}

      {/* Metadata row */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {/* Goal link */}
        {block.goalId && goalTitle && (
          <Link
            to="/goals/$goalId"
            params={{ goalId: block.goalId }}
            className="inline-flex items-center gap-1.5 text-xs bg-secondary/80 hover:bg-secondary px-2 py-1 rounded-full transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Target className="h-3 w-3" />
            <span>{goalTitle}</span>
          </Link>
        )}

        {/* Travel time badge */}
        {block.requiresTravel && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full">
            <Car className="h-3 w-3" />
            <span>
              {block.estimatedTravelTime
                ? `${block.estimatedTravelTime} min travel`
                : "Travel required"
              }
            </span>
          </span>
        )}

        {/* Energy level badge */}
        {block.energyLevel && (
          <span className={cn(
            "inline-flex items-center text-xs px-2 py-1 rounded-full",
            block.energyLevel === "high" && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
            block.energyLevel === "medium" && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
            block.energyLevel === "low" && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
          )}>
            {block.energyLevel} energy
          </span>
        )}

        {/* Status badge for non-planned states */}
        {block.status !== "planned" && (
          <span className={cn(
            "inline-flex items-center text-xs px-2 py-1 rounded-full capitalize",
            block.status === "completed" && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
            block.status === "in_progress" && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
            block.status === "skipped" && "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
            block.status === "moved" && "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
          )}>
            {block.status.replace("_", " ")}
          </span>
        )}
      </div>

      {/* Quick action buttons - always visible on mobile, hover-triggered on desktop */}
      {isActionable && (
        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-11 w-11 rounded-full bg-green-100 hover:bg-green-200 dark:bg-green-900/50 dark:hover:bg-green-800/50 text-green-700 dark:text-green-300 transition-transform touch-manipulation",
              "hover:scale-105 active:scale-95"
            )}
            onClick={handleComplete}
            disabled={isUpdating}
            aria-label="Mark as complete"
          >
            <Check className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-11 w-11 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-transform touch-manipulation",
              "hover:scale-105 active:scale-95"
            )}
            onClick={handleSkip}
            disabled={isUpdating}
            aria-label="Skip this block"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  )
})
