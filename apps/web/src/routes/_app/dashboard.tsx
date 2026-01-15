import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { format } from "date-fns"
import { Calendar, Clock, CheckCircle2, PlayCircle } from "lucide-react"

import { api, type Doc } from "@flow-day/convex"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { calculateDuration } from "@/lib/date-utils"

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
})

type Block = Doc<"blocks">
type Goal = Doc<"goals">

function DashboardPage() {
  const today = format(new Date(), "yyyy-MM-dd")
  const blocks = useQuery(api.blocks.getByDate, { date: today })
  const goals = useQuery(api.goals.getGoals)

  const completedBlocks = blocks?.filter((b: Block) => b.status === "completed").length ?? 0
  const totalBlocks = blocks?.length ?? 0

  return (
    <div className="container max-w-6xl space-y-6 px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Progress</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedBlocks} / {totalBlocks}
            </div>
            <p className="text-xs text-muted-foreground">blocks completed</p>
            {totalBlocks > 0 && (
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(completedBlocks / totalBlocks) * 100}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goals?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">goals in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Next Block</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {blocks?.find((b: Block) => b.status === "planned") ? (
              <>
                <div className="text-lg font-bold truncate">
                  {blocks.find((b: Block) => b.status === "planned")?.title || "Untitled"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {blocks.find((b: Block) => b.status === "planned")?.startTime}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No upcoming blocks</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Schedule
          </CardTitle>
          <CardDescription>
            Your planned activities for today
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!blocks || blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No schedule for today</p>
              <Button className="mt-4" variant="outline" asChild>
                <a href="/scheduler">Create Schedule</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map((block: Block) => (
                <div
                  key={block._id}
                  className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                    block.status === "completed"
                      ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                      : block.status === "in_progress"
                        ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
                        : "hover:bg-accent"
                  }`}
                >
                  <div className="flex-shrink-0 text-sm font-medium text-muted-foreground">
                    {block.startTime}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{block.title || "Untitled"}</p>
                    {block.goalId && (
                      <p className="text-xs text-muted-foreground truncate">
                        Goal: {goals?.find((g: Goal) => g._id === block.goalId)?.title}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-xs text-muted-foreground">
                    {calculateDuration(block.startTime, block.endTime)} min
                  </div>
                  <div className="flex-shrink-0">
                    {block.status === "completed" && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    {block.status === "in_progress" && (
                      <PlayCircle className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
