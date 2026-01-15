import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { useState, useEffect, useMemo } from "react"
import { format, addDays } from "date-fns"
import { Calendar, AlertCircle } from "lucide-react"

import { api, type Doc } from "@flow-day/convex"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TimeBlock } from "@/components/timeline/time-block"
import { TimeBlockSkeletonList } from "@/components/timeline/time-block-skeleton"
import { EmptyState } from "@/components/timeline/empty-state"
import { CurrentTimeIndicator } from "@/components/timeline/current-time-indicator"
import { EnergyZoneIndicator } from "@/components/timeline/energy-zone-indicator"

export const Route = createFileRoute("/_app/timeline")({
  component: TimelinePage,
})

type Goal = Doc<"goals">
type Block = Doc<"blocks">

type TabValue = "today" | "tomorrow"

// 10 second timeout for error handling
const QUERY_TIMEOUT_MS = 10000

function TimelinePage() {
  const [activeTab, setActiveTab] = useState<TabValue>("today")
  const [queryTimedOut, setQueryTimedOut] = useState(false)

  const today = format(new Date(), "yyyy-MM-dd")
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd")
  const selectedDate = activeTab === "today" ? today : tomorrow

  // Fetch timeline context for the selected date
  const timelineContext = useQuery(api.blocks.getTimelineContext, {
    date: selectedDate,
  })

  // Fetch goals to display goal titles on blocks
  const goals = useQuery(api.goals.getGoals)

  // Create a map for quick goal lookup
  const goalsMap = new Map<string, Goal>()
  if (goals) {
    for (const goal of goals) {
      goalsMap.set(goal._id, goal)
    }
  }

  // Handle query timeout
  useEffect(() => {
    setQueryTimedOut(false)
    const timer = setTimeout(() => {
      if (timelineContext === undefined) {
        setQueryTimedOut(true)
      }
    }, QUERY_TIMEOUT_MS)

    return () => clearTimeout(timer)
  }, [selectedDate, timelineContext])

  // Reset timeout when data arrives
  useEffect(() => {
    if (timelineContext !== undefined) {
      setQueryTimedOut(false)
    }
  }, [timelineContext])

  const isLoading = timelineContext === undefined && !queryTimedOut
  const hasError = queryTimedOut
  const blocks = timelineContext?.blocks ?? []
  const hasBlocks = blocks.length > 0

  // Format date for display
  const displayDate = activeTab === "today"
    ? format(new Date(), "EEEE, MMMM d")
    : format(addDays(new Date(), 1), "EEEE, MMMM d")

  return (
    <div className="container max-w-3xl space-y-6 px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Timeline</h1>
        <p className="text-muted-foreground">
          {displayDate}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2" role="tablist" aria-label="Timeline date selection">
        <Button
          variant={activeTab === "today" ? "default" : "outline"}
          onClick={() => setActiveTab("today")}
          className="flex-1 sm:flex-none min-h-[44px]"
          role="tab"
          aria-selected={activeTab === "today"}
          aria-controls="timeline-content"
        >
          Today
        </Button>
        <Button
          variant={activeTab === "tomorrow" ? "default" : "outline"}
          onClick={() => setActiveTab("tomorrow")}
          className="flex-1 sm:flex-none min-h-[44px]"
          role="tab"
          aria-selected={activeTab === "tomorrow"}
          aria-controls="timeline-content"
        >
          Tomorrow
        </Button>
      </div>

      {/* Energy Zone Indicator - shows when timeline context is loaded */}
      {timelineContext && (
        <EnergyZoneIndicator
          energyProfile={timelineContext.energyProfile}
          peakEnergyWindow={timelineContext.peakEnergyWindow}
          wakeTime={timelineContext.wakeTime}
          sleepTime={timelineContext.sleepTime}
          lazyModeActive={timelineContext.lazyModeActive}
        />
      )}

      {/* Timeline content */}
      <Card id="timeline-content" role="tabpanel" aria-label={`${activeTab === "today" ? "Today's" : "Tomorrow's"} schedule`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {activeTab === "today" ? "Today's Schedule" : "Tomorrow's Schedule"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Loading state */}
          {isLoading && <TimeBlockSkeletonList count={5} />}

          {/* Error state */}
          {hasError && (
            <EmptyState
              icon={AlertCircle}
              title="Unable to load timeline"
              subtitle="The request took too long. Please check your connection and try again."
              ctaLabel="Retry"
              ctaAction={() => window.location.reload()}
            />
          )}

          {/* Empty state */}
          {!isLoading && !hasError && !hasBlocks && (
            <EmptyState
              icon={Calendar}
              title={`No blocks for ${activeTab}`}
              subtitle="Start a conversation with the AI agent to plan your day"
              ctaLabel="Plan with AI"
              ctaTo="/agent"
            />
          )}

          {/* Blocks list with CurrentTimeIndicator */}
          {!isLoading && !hasError && hasBlocks && (
            <TimelineBlockList
              blocks={blocks}
              goalsMap={goalsMap}
              showCurrentTime={activeTab === "today"}
            />
          )}
        </CardContent>
      </Card>

      {/* Quick stats when there are blocks */}
      {!isLoading && !hasError && hasBlocks && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Total"
            value={blocks.length}
            suffix="blocks"
          />
          <StatCard
            label="Completed"
            value={blocks.filter((b: Block) => b.status === "completed").length}
            suffix={`of ${blocks.length}`}
          />
          <StatCard
            label="In Progress"
            value={blocks.filter((b: Block) => b.status === "in_progress").length}
            suffix="blocks"
          />
        </div>
      )}
    </div>
  )
}

// TimelineBlockList - renders blocks with CurrentTimeIndicator positioned correctly
interface TimelineBlockListProps {
  blocks: Block[]
  goalsMap: Map<string, Goal>
  showCurrentTime: boolean
}

function TimelineBlockList({ blocks, goalsMap, showCurrentTime }: TimelineBlockListProps) {
  // Track current time for positioning - updates every minute
  const [currentTimeString, setCurrentTimeString] = useState(() => format(new Date(), "HH:mm"))

  // Update the time every minute, synced to minute boundary
  useEffect(() => {
    if (!showCurrentTime) return

    let intervalId: ReturnType<typeof setInterval> | null = null

    // Calculate ms until next minute boundary
    const now = new Date()
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()

    // Initial timeout to sync with minute boundary
    const timeoutId = setTimeout(() => {
      setCurrentTimeString(format(new Date(), "HH:mm"))

      // Then update every 60 seconds
      intervalId = setInterval(() => {
        setCurrentTimeString(format(new Date(), "HH:mm"))
      }, 60000)
    }, msUntilNextMinute)

    return () => {
      clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId)
    }
  }, [showCurrentTime])

  // Find where to insert the CurrentTimeIndicator
  // It should appear before the first block that starts after the current time
  const currentTimeIndex = useMemo(() => {
    if (!showCurrentTime) return -1

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      if (!block) continue
      // If block starts after current time, insert indicator before it
      if (block.startTime > currentTimeString) {
        return i
      }
      // If current time is within a block's time range, insert after it
      if (block.startTime <= currentTimeString && block.endTime > currentTimeString) {
        return i + 1
      }
    }
    // Current time is after all blocks, show at the end
    return blocks.length
  }, [blocks, currentTimeString, showCurrentTime])

  return (
    <div className="space-y-3">
      {blocks.map((block: Block, index: number) => {
        const goalTitle = block.goalId
          ? goalsMap.get(block.goalId)?.title
          : undefined

        // Check if CurrentTimeIndicator should appear before this block
        const showIndicatorBefore = showCurrentTime && currentTimeIndex === index

        return (
          <div key={block._id}>
            {showIndicatorBefore && <CurrentTimeIndicator />}
            <TimeBlock block={block} goalTitle={goalTitle} />
          </div>
        )
      })}
      {/* Show indicator at the end if current time is after all blocks */}
      {showCurrentTime && currentTimeIndex === blocks.length && (
        <CurrentTimeIndicator />
      )}
    </div>
  )
}

// Simple stat card for timeline summary
interface StatCardProps {
  label: string
  value: number
  suffix?: string
}

function StatCard({ label, value, suffix }: StatCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {suffix && (
        <p className="text-xs text-muted-foreground">{suffix}</p>
      )}
    </div>
  )
}
