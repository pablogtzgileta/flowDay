import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { useState } from "react"
import { ChevronLeft, ChevronRight, BarChart3, AlertCircle } from "lucide-react"
import { format, parseISO, addDays } from "date-fns"

import { api } from "@flow-day/convex"
import { Button } from "@/components/ui/button"
import { PageLoading } from "@/components/ui/loading-spinner"
import { StatCard } from "@/components/review/stat-card"
import { WeeklyChart } from "@/components/review/weekly-chart"
import { InsightCard } from "@/components/review/insight-card"
import { SuggestionCard } from "@/components/review/suggestion-card"
import { GoalProgressCard } from "@/components/review/goal-progress-card"

// Types for the weekly review data
type InsightSeverity = "info" | "warning" | "success" | "error"
type GoalStatus = "ahead" | "on_track" | "behind" | "complete"
type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"

interface WeeklyInsight {
  id: string
  icon: string
  title: string
  description: string
  severity: InsightSeverity
}

interface WeeklySuggestion {
  id: string
  title: string
  description: string
  reasoning: string
  action: {
    type: string
    routineId?: string
    goalId?: string
    newDayOfWeek?: DayOfWeek
    newStartTime?: string
    newDuration?: number
  }
}

interface GoalProgress {
  goalId: string
  title: string
  category: string
  targetMinutes: number
  completedMinutes: number
  percentComplete: number
  status: GoalStatus
  sessionsCompleted: number
}

export const Route = createFileRoute("/_app/review")({
  component: ReviewPage,
  pendingComponent: () => <PageLoading message="Loading weekly review..." />,
})

function ReviewPage() {
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)

  // Get available weeks for navigation
  const availableWeeks = useQuery(api.weeklyReview.getAvailableWeeks)

  // Get selected week data
  const selectedWeek = availableWeeks?.[selectedWeekIndex]
  const weeklyReview = useQuery(
    api.weeklyReview.getWeeklyReview,
    selectedWeek ? { weekStartDate: selectedWeek.weekStart } : "skip"
  )
  const insights = useQuery(
    api.weeklyReview.getWeeklyInsights,
    selectedWeek ? { weekStartDate: selectedWeek.weekStart } : "skip"
  )
  const suggestions = useQuery(
    api.weeklyReview.getSuggestions,
    selectedWeek ? { weekStartDate: selectedWeek.weekStart } : "skip"
  )

  // Navigation handlers
  const goToPreviousWeek = () => {
    if (availableWeeks && selectedWeekIndex < availableWeeks.length - 1) {
      setSelectedWeekIndex(selectedWeekIndex + 1)
    }
  }

  const goToNextWeek = () => {
    if (selectedWeekIndex > 0) {
      setSelectedWeekIndex(selectedWeekIndex - 1)
    }
  }

  // Format week label
  const getWeekLabel = () => {
    if (!selectedWeek) return "Loading..."
    const startDate = parseISO(selectedWeek.weekStart)
    const endDate = addDays(startDate, 6)
    return `Week of ${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
  }

  // Loading state
  if (!availableWeeks || !selectedWeek || weeklyReview === undefined) {
    return <PageLoading message="Loading your weekly review..." />
  }

  // Error state when review data fails
  if (weeklyReview === null) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-semibold">Unable to load review data</h2>
        <p className="text-muted-foreground">Please try again later</p>
        <Button onClick={() => window.location.reload()}>Reload Page</Button>
      </div>
    )
  }

  const canGoPrevious = selectedWeekIndex < availableWeeks.length - 1
  const canGoNext = selectedWeekIndex > 0

  return (
    <div className="container max-w-4xl space-y-6 px-4 py-6">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Weekly Review</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousWeek}
            disabled={!canGoPrevious}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="min-w-[180px] text-center text-sm font-medium">
            {getWeekLabel()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextWeek}
            disabled={!canGoNext}
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      {weeklyReview && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Completion"
            value={`${weeklyReview.stats.completionRate}%`}
            subtitle={`${weeklyReview.stats.completedBlocks}/${weeklyReview.stats.totalBlocks} blocks`}
          />
          <StatCard
            label="Hours Completed"
            value={weeklyReview.stats.totalCompletedHours.toFixed(1)}
            subtitle={`of ${weeklyReview.stats.totalPlannedHours.toFixed(1)}h planned`}
          />
          <StatCard
            label="Best Day"
            value={weeklyReview.bestDay?.label || "N/A"}
            subtitle={weeklyReview.bestDay ? `${weeklyReview.bestDay.completionRate}% completion` : undefined}
          />
          <StatCard
            label="Energy Alignment"
            value={`${weeklyReview.energyAlignmentScore}%`}
            subtitle="High-energy task timing"
          />
        </div>
      )}

      {/* Weekly Chart */}
      {weeklyReview && weeklyReview.dayStats.length > 0 && (
        <WeeklyChart
          data={weeklyReview.dayStats}
          bestDay={weeklyReview.bestDay?.day}
          worstDay={weeklyReview.worstDay?.day}
        />
      )}

      {/* Goals Progress */}
      {weeklyReview && weeklyReview.goalProgress.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Goal Progress</h2>
          <div className="space-y-3">
            {weeklyReview.goalProgress.map((goal: GoalProgress) => (
              <GoalProgressCard
                key={goal.goalId}
                title={goal.title}
                category={goal.category}
                targetMinutes={goal.targetMinutes}
                completedMinutes={goal.completedMinutes}
                percentComplete={goal.percentComplete}
                status={goal.status}
                sessionsCompleted={goal.sessionsCompleted}
              />
            ))}
          </div>
        </section>
      )}

      {/* Insights */}
      {insights && insights.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Insights</h2>
          <div className="space-y-3">
            {insights.map((insight: WeeklyInsight) => (
              <InsightCard
                key={insight.id}
                icon={insight.icon}
                title={insight.title}
                description={insight.description}
                severity={insight.severity}
              />
            ))}
          </div>
        </section>
      )}

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Suggestions</h2>
          <div className="space-y-3">
            {suggestions.map((suggestion: WeeklySuggestion) => (
              <SuggestionCard
                key={suggestion.id}
                id={suggestion.id}
                title={suggestion.title}
                description={suggestion.description}
                reasoning={suggestion.reasoning}
                action={suggestion.action}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state when no data */}
      {weeklyReview && weeklyReview.stats.totalBlocks === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No data for this week</h3>
          <p className="text-muted-foreground">
            Start scheduling blocks to see your weekly review!
          </p>
        </div>
      )}
    </div>
  )
}
