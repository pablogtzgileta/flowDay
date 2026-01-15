import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { api } from "@flow-day/convex"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type RolloverBehavior = "rollover_once" | "auto_skip" | "prompt_agent"

interface RolloverOption {
  value: RolloverBehavior
  emoji: string
  label: string
  description: string
}

const ROLLOVER_OPTIONS: RolloverOption[] = [
  {
    value: "rollover_once",
    emoji: "🔄",
    label: "Rollover Once",
    description: "Move incomplete tasks to tomorrow, skip if still incomplete",
  },
  {
    value: "auto_skip",
    emoji: "⏭️",
    label: "Auto Skip",
    description: "Automatically skip incomplete tasks at end of day",
  },
  {
    value: "prompt_agent",
    emoji: "🤖",
    label: "Ask Agent",
    description: "Let the AI agent decide what to do with incomplete tasks",
  },
]

export function RolloverSettings() {
  const currentUser = useQuery(api.users.getCurrent)
  const updateRolloverBehavior = useMutation(api.users.updateRolloverBehavior)

  const [isUpdating, setIsUpdating] = useState<RolloverBehavior | null>(null)

  const currentBehavior: RolloverBehavior =
    currentUser?.preferences?.rolloverBehavior ?? "rollover_once"

  const handleOptionSelect = async (behavior: RolloverBehavior) => {
    if (behavior === currentBehavior) return

    setIsUpdating(behavior)
    try {
      await updateRolloverBehavior({ rolloverBehavior: behavior })
      toast.success("Rollover behavior updated")
    } catch (error) {
      console.error("Failed to update rollover behavior:", error)
      toast.error("Failed to update rollover behavior")
    } finally {
      setIsUpdating(null)
    }
  }

  if (currentUser === undefined) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <CardTitle className="text-base">Incomplete Tasks</CardTitle>
              <CardDescription>Loading...</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <CardTitle className="text-base">Incomplete Tasks</CardTitle>
            <CardDescription>
              What should happen to tasks you don't complete?
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {ROLLOVER_OPTIONS.map((option) => {
          const isSelected = currentBehavior === option.value
          const isLoading = isUpdating === option.value

          return (
            <button
              key={option.value}
              onClick={() => handleOptionSelect(option.value)}
              disabled={isUpdating !== null}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:bg-accent/50 hover:border-primary/50",
                isUpdating !== null && !isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="text-xl">{option.emoji}</span>
              <div className="flex-1">
                <div className="font-semibold">{option.label}</div>
                <div className="text-sm text-muted-foreground">{option.description}</div>
              </div>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : isSelected ? (
                <Check className="h-5 w-5 text-primary" />
              ) : null}
            </button>
          )
        })}

        <p className="text-xs text-muted-foreground pt-2">
          This setting controls how your schedule handles tasks that weren't completed by their scheduled time.
        </p>
      </CardContent>
    </Card>
  )
}
