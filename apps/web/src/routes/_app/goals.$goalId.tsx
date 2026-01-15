import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation } from "convex/react"
import { useState } from "react"
import {
  ArrowLeft,
  Target,
  Clock,
  Zap,
  Calendar,
  TrendingUp,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  MessageSquare
} from "lucide-react"
import { toast } from "sonner"

import { api, type Id } from "@flow-day/convex"

// Session type from the getGoalById query
interface RecentSession {
  _id: Id<"blocks">
  date: string
  title: string
  startTime: string
  endTime: string
  duration: number
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const CATEGORIES = ["learning", "health", "career", "personal", "creative"] as const
const TIME_PREFERENCES = ["morning", "afternoon", "evening", "any"] as const
const ENERGY_LEVELS = ["high", "medium", "low"] as const

const CATEGORY_COLORS: Record<string, string> = {
  learning: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  health: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  career: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  personal: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  creative: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
}

export const Route = createFileRoute("/_app/goals/$goalId")({
  component: GoalDetailPage,
})

function GoalDetailPage() {
  const { goalId } = Route.useParams()
  const navigate = useNavigate()

  const goal = useQuery(api.goals.getGoalById, {
    goalId: goalId as Id<"goals">
  })
  const updateGoal = useMutation(api.goals.updateGoal)
  const toggleActive = useMutation(api.goals.toggleGoalActive)
  const deleteGoal = useMutation(api.goals.deleteGoal)

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Edit form state
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editWeeklyHours, setEditWeeklyHours] = useState(3)
  const [editCategory, setEditCategory] = useState<typeof CATEGORIES[number]>("personal")
  const [editPreferredTime, setEditPreferredTime] = useState<typeof TIME_PREFERENCES[number]>("any")
  const [editEnergyLevel, setEditEnergyLevel] = useState<typeof ENERGY_LEVELS[number]>("medium")
  const [editPriority, setEditPriority] = useState(3)

  if (goal === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (goal === null) {
    return (
      <div className="container max-w-4xl px-4 py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Goal not found</p>
            <Button className="mt-4" variant="outline" asChild>
              <Link to="/goals">Back to Goals</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const openEditDialog = () => {
    setEditTitle(goal.title)
    setEditDescription(goal.description || "")
    setEditWeeklyHours(Math.round(goal.weeklyTargetMinutes / 60))
    setEditCategory(goal.category)
    setEditPreferredTime(goal.preferredTime)
    setEditEnergyLevel(goal.energyLevel)
    setEditPriority(goal.priority)
    setIsEditDialogOpen(true)
  }

  const handleUpdateGoal = async () => {
    try {
      await updateGoal({
        goalId: goal._id,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        weeklyTargetMinutes: editWeeklyHours * 60,
        category: editCategory,
        preferredTime: editPreferredTime,
        energyLevel: editEnergyLevel,
        priority: editPriority,
      })
      toast.success("Goal updated successfully!")
      setIsEditDialogOpen(false)
    } catch {
      toast.error("Failed to update goal. Please try again.")
    }
  }

  const handleToggleActive = async () => {
    try {
      await toggleActive({ goalId: goal._id })
      toast.success(goal.isActive ? "Goal archived" : "Goal reactivated")
    } catch {
      toast.error("Failed to update goal status.")
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteGoal({ goalId: goal._id, deleteAssociatedBlocks: false })
      toast.success("Goal deleted")
      navigate({ to: "/goals" })
    } catch {
      toast.error("Failed to delete goal.")
    } finally {
      setIsDeleting(false)
    }
  }

  // Calculate progress percentage
  const progressPercent = Math.min(
    100,
    Math.round((goal.weeklyProgress.completedMinutes / goal.weeklyTargetMinutes) * 100)
  )

  // Determine progress color
  const getProgressColor = () => {
    if (progressPercent >= 100) return "text-green-500"
    if (progressPercent >= 50) return "text-primary"
    return "text-amber-500"
  }

  return (
    <div className="container max-w-4xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/goals">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{goal.title}</h1>
            {!goal.isActive && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Archived
              </span>
            )}
          </div>
          {goal.description && (
            <p className="text-muted-foreground">{goal.description}</p>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${CATEGORY_COLORS[goal.category]}`}>
          {goal.category}
        </span>
      </div>

      {/* Progress Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Weekly Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6 md:flex-row">
            {/* Progress Ring */}
            <div className="relative flex h-32 w-32 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${progressPercent * 2.51} 251`}
                  className={getProgressColor()}
                />
              </svg>
              <div className="absolute text-center">
                <div className={`text-2xl font-bold ${getProgressColor()}`}>
                  {progressPercent}%
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <div className="text-2xl font-bold">
                    {(goal.weeklyProgress.completedMinutes / 60).toFixed(1)}h
                  </div>
                  <div className="text-sm text-muted-foreground">
                    of {(goal.weeklyTargetMinutes / 60).toFixed(0)}h target
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <div className="text-2xl font-bold">
                    {goal.weeklyProgress.sessionsCompleted}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    sessions this week
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All-Time Stats */}
      <Card>
        <CardHeader>
          <CardTitle>All-Time Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <div className="text-2xl font-bold">
                {(goal.totalMinutes / 60).toFixed(1)}h
              </div>
              <div className="text-sm text-muted-foreground">total hours</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <div className="text-2xl font-bold">{goal.totalSessions}</div>
              <div className="text-sm text-muted-foreground">total sessions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Session Length</div>
                <div className="text-sm text-muted-foreground">
                  {goal.preferredSessionLength.min}-{goal.preferredSessionLength.max} min
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Preferred Time</div>
                <div className="text-sm capitalize text-muted-foreground">
                  {goal.preferredTime === "any" ? "Any Time" : goal.preferredTime}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Energy Level</div>
                <div className="text-sm capitalize text-muted-foreground">
                  {goal.energyLevel}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Priority</div>
                <div className="text-sm text-muted-foreground">
                  Level {goal.priority}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      {goal.recentSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {goal.recentSessions.map((session: RecentSession) => (
                <div
                  key={session._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="font-medium">{session.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {session.date} &middot; {session.startTime} - {session.endTime}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {session.duration} min
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Separator />
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/agent">
            <MessageSquare className="mr-2 h-4 w-4" />
            Schedule Session
          </Link>
        </Button>
        <Button variant="outline" onClick={openEditDialog}>
          <Edit2 className="mr-2 h-4 w-4" />
          Edit Goal
        </Button>
        <Button variant="outline" onClick={handleToggleActive}>
          {goal.isActive ? (
            <>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </>
          ) : (
            <>
              <ArchiveRestore className="mr-2 h-4 w-4" />
              Reactivate
            </>
          )}
        </Button>
        <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
            <DialogDescription>
              Update your goal settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Goal Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            {/* Weekly hours */}
            <div className="space-y-2">
              <Label>Weekly Target (hours)</Label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 5, 7, 10].map((hours) => (
                  <Button
                    key={hours}
                    variant={editWeeklyHours === hours ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditWeeklyHours(hours)}
                  >
                    {hours}h
                  </Button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    variant={editCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditCategory(cat)}
                    className="capitalize"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            {/* Preferred time */}
            <div className="space-y-2">
              <Label>Preferred Time</Label>
              <div className="flex flex-wrap gap-2">
                {TIME_PREFERENCES.map((time) => (
                  <Button
                    key={time}
                    variant={editPreferredTime === time ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditPreferredTime(time)}
                    className="capitalize"
                  >
                    {time === "any" ? "Any Time" : time}
                  </Button>
                ))}
              </div>
            </div>

            {/* Energy level */}
            <div className="space-y-2">
              <Label>Energy Required</Label>
              <div className="flex flex-wrap gap-2">
                {ENERGY_LEVELS.map((level) => (
                  <Button
                    key={level}
                    variant={editEnergyLevel === level ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditEnergyLevel(level)}
                    className="capitalize"
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority (1 = highest)</Label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((p) => (
                  <Button
                    key={p}
                    variant={editPriority === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditPriority(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateGoal} disabled={!editTitle.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{goal.title}"? This action cannot be undone.
              Associated sessions will be kept but unlinked from this goal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
