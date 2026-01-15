import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery, useMutation } from "convex/react"
import { useState } from "react"
import { Plus, Target, Clock, Zap, Calendar } from "lucide-react"
import { toast } from "sonner"

import { api, type Doc } from "@flow-day/convex"
import { GOAL_TEMPLATES, type GoalTemplate } from "@flow-day/shared"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Goal = Doc<"goals">

export const Route = createFileRoute("/_app/goals")({
  component: GoalsPage,
})

const CATEGORIES = ["learning", "health", "career", "personal", "creative"] as const
const TIME_PREFERENCES = ["morning", "afternoon", "evening", "any"] as const
const ENERGY_LEVELS = ["high", "medium", "low"] as const

function GoalsPage() {
  const goals = useQuery(api.goals.getGoals)
  const createGoal = useMutation(api.goals.create)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null)

  // Keyboard shortcut: Cmd/Ctrl + N to open new goal dialog
  useKeyboardShortcuts({
    onNewGoal: () => setIsDialogOpen(true),
    onEscape: () => setIsDialogOpen(false),
  })

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [weeklyHours, setWeeklyHours] = useState(3)
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("personal")
  const [preferredTime, setPreferredTime] = useState<typeof TIME_PREFERENCES[number]>("any")
  const [energyLevel, setEnergyLevel] = useState<typeof ENERGY_LEVELS[number]>("medium")

  const handleTemplateSelect = (template: GoalTemplate) => {
    setSelectedTemplate(template)
    setTitle(template.title)
    setWeeklyHours(Math.round(template.weeklyTargetMinutes / 60))
    setCategory(template.category as typeof CATEGORIES[number])
    setPreferredTime(template.preferredTime as typeof TIME_PREFERENCES[number])
    setEnergyLevel(template.energyLevel as typeof ENERGY_LEVELS[number])
  }

  const handleCreateGoal = async () => {
    if (!title.trim()) return

    try {
      await createGoal({
        title: title.trim(),
        description: description.trim() || undefined,
        weeklyTargetMinutes: weeklyHours * 60,
        preferredSessionLength: { min: 30, max: 45 },
        preferredTime,
        energyLevel,
        priority: 5,
        category,
      })

      toast.success("Goal created successfully!")

      // Reset form
      setTitle("")
      setDescription("")
      setWeeklyHours(3)
      setCategory("personal")
      setPreferredTime("any")
      setEnergyLevel("medium")
      setSelectedTemplate(null)
      setIsDialogOpen(false)
    } catch {
      toast.error("Failed to create goal. Please try again.")
    }
  }

  return (
    <div className="container max-w-6xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground">
            Track and manage your weekly goals
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>
                Set up a new goal to track your progress
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Templates */}
              <div className="space-y-2">
                <Label>Quick Start Templates</Label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_TEMPLATES.map((template) => (
                    <Button
                      key={template.id}
                      variant={selectedTemplate?.id === template.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      {template.title}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Goal Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Learn Spanish"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What do you want to achieve?"
                />
              </div>

              {/* Weekly hours */}
              <div className="space-y-2">
                <Label>Weekly Target (hours)</Label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 5, 7, 10].map((hours) => (
                    <Button
                      key={hours}
                      variant={weeklyHours === hours ? "default" : "outline"}
                      size="sm"
                      onClick={() => setWeeklyHours(hours)}
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
                      variant={category === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCategory(cat)}
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
                      variant={preferredTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreferredTime(time)}
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
                      variant={energyLevel === level ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEnergyLevel(level)}
                      className="capitalize"
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Submit button */}
              <Button className="w-full" onClick={handleCreateGoal} disabled={!title.trim()}>
                Create Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Goals grid */}
      {!goals || goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No goals yet</p>
            <Button className="mt-4" variant="outline" onClick={() => setIsDialogOpen(true)}>
              Create your first goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal: Goal) => (
            <Link key={goal._id} to="/goals/$goalId" params={{ goalId: goal._id }}>
              <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {goal.title}
                    {!goal.isActive && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Archived
                      </span>
                    )}
                  </CardTitle>
                  {goal.description && (
                    <CardDescription>{goal.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{Math.round(goal.weeklyTargetMinutes / 60)}h / week</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="capitalize">{goal.preferredTime === "any" ? "Any time" : goal.preferredTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="h-4 w-4" />
                    <span className="capitalize">{goal.energyLevel} energy</span>
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize">
                      {goal.category}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
