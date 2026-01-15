import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation } from "convex/react"
import { useState, useMemo } from "react"
import { format, addDays, startOfWeek } from "date-fns"
import { ChevronLeft, ChevronRight, Calendar, RefreshCw } from "lucide-react"

import { api, type Doc } from "@flow-day/convex"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_app/scheduler")({
  component: SchedulerPage,
})

type ScheduleBlock = Doc<"blocks">

interface DayScheduleProps {
  date: Date
  dateStr: string
  isToday: boolean
  isPast: boolean
  isGenerating: boolean
  onGenerate: () => void
}

// Separate component to properly use hooks for each day
function DaySchedule({ date, dateStr, isToday, isPast, isGenerating, onGenerate }: DayScheduleProps) {
  const schedule = useQuery(api.schedules.getScheduleByDate, { date: dateStr })

  return (
    <Card className={isToday ? "border-primary" : isPast ? "opacity-60" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm ${isToday ? "text-primary" : ""}`}>
          {format(date, "EEE")}
        </CardTitle>
        <CardDescription className={isToday ? "font-medium text-primary" : ""}>
          {format(date, "d")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {schedule === undefined ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : schedule === null || !schedule.blocks?.length ? (
          <div className="flex h-32 flex-col items-center justify-center text-center">
            <Calendar className="h-6 w-6 text-muted-foreground/50" />
            <p className="mt-2 text-xs text-muted-foreground">No schedule</p>
            {!isPast && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={onGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  "Generate"
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {schedule.blocks.slice(0, 5).map((block: ScheduleBlock) => (
              <div
                key={block._id}
                className={`rounded px-2 py-1 text-xs ${
                  block.status === "completed"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : block.status === "in_progress"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      : "bg-secondary"
                }`}
              >
                <div className="font-medium truncate">{block.title || "Untitled"}</div>
                <div className="text-[10px] opacity-75">{block.startTime}</div>
              </div>
            ))}
            {schedule.blocks.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{schedule.blocks.length - 5} more
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SchedulerPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const startDate = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 })

  // Get all 7 days of the week - memoized to avoid recreating on every render
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startDate, i)),
    [startDate.getTime()]
  )

  const generateSchedule = useMutation(api.schedules.generateDailySchedule)
  const [isGenerating, setIsGenerating] = useState<string | null>(null)

  const handleGenerateSchedule = async (date: string) => {
    setIsGenerating(date)
    try {
      await generateSchedule({ date })
    } finally {
      setIsGenerating(null)
    }
  }

  const today = format(new Date(), "yyyy-MM-dd")

  return (
    <div className="container max-w-7xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weekly Scheduler</h1>
          <p className="text-muted-foreground">
            Plan and manage your weekly schedule
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setWeekOffset(0)}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week header */}
      <div className="text-center">
        <p className="text-lg font-medium">
          {format(startDate, "MMMM d")} - {format(addDays(startDate, 6), "MMMM d, yyyy")}
        </p>
      </div>

      {/* Week grid - responsive: 1 col mobile, 2 col tablet, 7 col desktop */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {weekDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd")
          const isToday = dateStr === today
          const isPast = day < new Date() && !isToday

          return (
            <DaySchedule
              key={dateStr}
              date={day}
              dateStr={dateStr}
              isToday={isToday}
              isPast={isPast}
              isGenerating={isGenerating === dateStr}
              onGenerate={() => handleGenerateSchedule(dateStr)}
            />
          )
        })}
      </div>

      {/* Legend - wraps on mobile */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-secondary" />
          <span className="text-muted-foreground">Planned</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-blue-100 dark:bg-blue-900" />
          <span className="text-muted-foreground">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-green-100 dark:bg-green-900" />
          <span className="text-muted-foreground">Completed</span>
        </div>
      </div>
    </div>
  )
}
