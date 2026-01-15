import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router"
import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@flow-day/convex"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LocationStep } from "@/components/onboarding/location-step"

// Time options
const WAKE_TIME_OPTIONS = [
  "05:00", "05:30", "06:00", "06:30", "07:00", "07:30",
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00",
]

const SLEEP_TIME_OPTIONS = [
  "20:00", "20:30", "21:00", "21:30", "22:00", "22:30",
  "23:00", "23:30", "00:00", "00:30", "01:00", "01:30", "02:00",
]

type EnergyWindow = "morning" | "afternoon" | "evening"
type NotificationStyle = "minimal" | "proactive"

const TOTAL_STEPS = 5

// Format time for display (HH:MM to 12-hour format)
function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(":")
  const hour = parseInt(hours ?? "0", 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export const Route = createFileRoute("/onboarding")({
  beforeLoad: ({ context }) => {
    // If not authenticated, redirect to sign-in
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/sign-in", search: { redirect: "/onboarding" } })
    }
  },
  component: OnboardingPage,
})

function OnboardingPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [wakeTime, setWakeTime] = useState("07:00")
  const [sleepTime, setSleepTime] = useState("23:00")
  const [peakEnergy, setPeakEnergy] = useState<EnergyWindow>("morning")
  const [notificationStyle, setNotificationStyle] = useState<NotificationStyle>("proactive")

  // Mutations
  const updatePreferences = useMutation(api.users.updatePreferences)
  const completeOnboarding = useMutation(api.users.completeOnboarding)

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleComplete = async () => {
    setSaving(true)
    setError(null)

    try {
      // Get timezone from browser
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      // Save preferences
      await updatePreferences({
        wakeTime,
        sleepTime,
        peakEnergyWindow: peakEnergy,
        notificationStyle,
        timezone,
      })

      // Mark onboarding as complete
      await completeOnboarding({})

      // Navigate to dashboard
      navigate({ to: "/dashboard" })
    } catch (err) {
      console.error("Failed to save onboarding:", err)
      setError("Failed to save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Progress indicator */}
      {currentStep > 0 && (
        <div className="mb-8 flex gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index < currentStep
                  ? "w-2 bg-primary"
                  : index === currentStep
                    ? "w-6 bg-primary"
                    : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>
      )}

      {/* Step content */}
      <div className="w-full max-w-lg">
        {currentStep === 0 && <WelcomeStep />}
        {currentStep === 1 && (
          <TimePickerStep
            title="When do you wake up?"
            subtitle="This helps me plan your morning routine"
            selectedTime={wakeTime}
            onSelectTime={setWakeTime}
            timeOptions={WAKE_TIME_OPTIONS}
          />
        )}
        {currentStep === 2 && (
          <TimePickerStep
            title="When do you go to sleep?"
            subtitle="I'll make sure to wrap up your day on time"
            selectedTime={sleepTime}
            onSelectTime={setSleepTime}
            timeOptions={SLEEP_TIME_OPTIONS}
          />
        )}
        {currentStep === 3 && (
          <EnergyStep
            selectedEnergy={peakEnergy}
            onSelectEnergy={setPeakEnergy}
          />
        )}
        {currentStep === 4 && (
          <NotificationStep
            selectedStyle={notificationStyle}
            onSelectStyle={setNotificationStyle}
          />
        )}
        {currentStep === 5 && <LocationStepComponent />}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      )}

      {/* Navigation buttons */}
      <div className="mt-8 flex gap-4">
        {currentStep > 0 && (
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={saving}
          >
            Back
          </Button>
        )}

        {currentStep < TOTAL_STEPS && (
          <Button
            onClick={handleNext}
            disabled={saving}
            className={currentStep === 0 ? "min-w-[200px]" : ""}
          >
            {currentStep === 0 ? "Get Started" : "Continue"}
          </Button>
        )}

        {currentStep === TOTAL_STEPS && (
          <Button
            onClick={handleComplete}
            disabled={saving}
          >
            {saving ? "Saving..." : "Finish"}
          </Button>
        )}
      </div>
    </div>
  )
}

// Step Components

function WelcomeStep() {
  return (
    <div className="text-center">
      <div className="mb-6 text-6xl">👋</div>
      <h1 className="mb-4 text-3xl font-bold">Welcome to FlowDay</h1>
      <p className="text-lg text-muted-foreground">
        Let's personalize your experience. This takes about 1 minute.
      </p>
    </div>
  )
}

interface TimePickerStepProps {
  title: string
  subtitle: string
  selectedTime: string
  onSelectTime: (time: string) => void
  timeOptions: string[]
}

function TimePickerStep({
  title,
  subtitle,
  selectedTime,
  onSelectTime,
  timeOptions,
}: TimePickerStepProps) {
  return (
    <div className="text-center">
      <h2 className="mb-2 text-2xl font-bold">{title}</h2>
      <p className="mb-6 text-muted-foreground">{subtitle}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {timeOptions.map((time) => (
          <button
            key={time}
            onClick={() => onSelectTime(time)}
            className={`min-w-[100px] rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
              selectedTime === time
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-accent"
            }`}
          >
            {formatTimeDisplay(time)}
          </button>
        ))}
      </div>
    </div>
  )
}

interface EnergyStepProps {
  selectedEnergy: EnergyWindow
  onSelectEnergy: (energy: EnergyWindow) => void
}

const ENERGY_OPTIONS: Array<{ value: EnergyWindow; emoji: string; title: string; description: string }> = [
  { value: "morning", emoji: "🌅", title: "Morning Person", description: "I'm most productive before noon" },
  { value: "afternoon", emoji: "☀️", title: "Afternoon Peak", description: "I hit my stride after lunch" },
  { value: "evening", emoji: "🌙", title: "Night Owl", description: "I do my best work in the evening" },
]

function EnergyStep({ selectedEnergy, onSelectEnergy }: EnergyStepProps) {
  return (
    <div className="text-center">
      <h2 className="mb-2 text-2xl font-bold">When do you have the most energy?</h2>
      <p className="mb-6 text-muted-foreground">I'll schedule important tasks during your peak hours</p>
      <div className="flex flex-col gap-3">
        {ENERGY_OPTIONS.map((option) => (
          <Card
            key={option.value}
            className={`cursor-pointer transition-colors ${
              selectedEnergy === option.value
                ? "border-primary bg-primary/5"
                : "hover:bg-accent"
            }`}
            onClick={() => onSelectEnergy(option.value)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <span className="text-3xl">{option.emoji}</span>
              <div className="text-left">
                <div className="font-semibold">{option.title}</div>
                <div className="text-sm text-muted-foreground">{option.description}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

interface NotificationStepProps {
  selectedStyle: NotificationStyle
  onSelectStyle: (style: NotificationStyle) => void
}

const NOTIFICATION_OPTIONS: Array<{
  value: NotificationStyle
  emoji: string
  title: string
  description: string
  examples: string[]
}> = [
  {
    value: "minimal",
    emoji: "🔕",
    title: "Minimal",
    description: "Only notify me when it's important",
    examples: ["Upcoming meetings", "Urgent deadlines", "Travel reminders"],
  },
  {
    value: "proactive",
    emoji: "🔔",
    title: "Proactive",
    description: "Help me stay on track throughout the day",
    examples: ["Task start reminders", "Break suggestions", "Daily planning prompts"],
  },
]

function NotificationStep({ selectedStyle, onSelectStyle }: NotificationStepProps) {
  return (
    <div className="text-center">
      <h2 className="mb-2 text-2xl font-bold">How should I remind you?</h2>
      <p className="mb-6 text-muted-foreground">You can change this anytime in settings</p>
      <div className="flex flex-col gap-3">
        {NOTIFICATION_OPTIONS.map((option) => (
          <Card
            key={option.value}
            className={`cursor-pointer transition-colors ${
              selectedStyle === option.value
                ? "border-primary bg-primary/5"
                : "hover:bg-accent"
            }`}
            onClick={() => onSelectStyle(option.value)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{option.emoji}</span>
                <div className="text-left">
                  <div className="font-semibold">{option.title}</div>
                  <div className="text-sm text-muted-foreground">{option.description}</div>
                </div>
              </div>
              <div className="ml-12 mt-3 flex flex-wrap gap-2">
                {option.examples.map((example) => (
                  <span
                    key={example}
                    className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                  >
                    {example}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function LocationStepComponent() {
  return <LocationStep />
}
