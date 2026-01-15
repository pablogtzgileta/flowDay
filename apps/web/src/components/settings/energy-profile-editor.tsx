import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { api } from "@flow-day/convex"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PresetCard } from "./preset-card"

type EnergyLevel = "high" | "medium" | "low"
type PresetType = "morning_person" | "night_owl" | "steady" | "custom"

// Preset configuration with emojis
const PRESET_CONFIG: Record<
  Exclude<PresetType, "custom">,
  { emoji: string; label: string; description: string }
> = {
  morning_person: {
    emoji: "🌅",
    label: "Morning Person",
    description: "Peak energy in the morning, dip after lunch",
  },
  night_owl: {
    emoji: "🦉",
    label: "Night Owl",
    description: "Slow start, peak energy in the evening",
  },
  steady: {
    emoji: "⚖️",
    label: "Steady",
    description: "Consistent medium energy throughout the day",
  },
}

const CUSTOM_PRESET = {
  emoji: "🎨",
  label: "Custom",
  description: "Create your own energy profile",
}

// Default custom profile (all medium)
const DEFAULT_CUSTOM_LEVELS: EnergyLevel[] = Array(24).fill("medium")

// Energy level colors
const ENERGY_COLORS: Record<EnergyLevel, string> = {
  high: "bg-green-500",
  medium: "bg-yellow-500",
  low: "bg-gray-400",
}

// Energy level heights (as percentage)
const ENERGY_HEIGHTS: Record<EnergyLevel, string> = {
  high: "100%",
  medium: "66%",
  low: "33%",
}

// Cycle through energy levels - exported for testing
export function cycleEnergyLevel(current: EnergyLevel): EnergyLevel {
  const cycle: Record<EnergyLevel, EnergyLevel> = {
    low: "medium",
    medium: "high",
    high: "low",
  }
  return cycle[current]
}

export function EnergyProfileEditor() {
  const currentUser = useQuery(api.users.getCurrent)
  const presets = useQuery(api.users.getEnergyPresets)
  const updateEnergyProfile = useMutation(api.users.updateEnergyProfile)

  const [selectedPreset, setSelectedPreset] = useState<PresetType>("morning_person")
  const [hourlyLevels, setHourlyLevels] = useState<EnergyLevel[]>(DEFAULT_CUSTOM_LEVELS)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize from user data when it loads
  useEffect(() => {
    if (currentUser?.preferences?.energyProfile) {
      const profile = currentUser.preferences.energyProfile
      setSelectedPreset(profile.preset)
      if (profile.hourlyLevels && profile.hourlyLevels.length === 24) {
        setHourlyLevels(profile.hourlyLevels)
      }
    } else if (presets?.morning_person) {
      // Default to morning_person preset if no profile exists
      setHourlyLevels([...presets.morning_person.hourlyLevels])
    }
  }, [currentUser, presets])

  // Handle preset selection
  const handlePresetSelect = (preset: PresetType) => {
    setSelectedPreset(preset)
    setHasChanges(true)

    if (preset !== "custom" && presets?.[preset]) {
      setHourlyLevels([...presets[preset].hourlyLevels])
    }
  }

  // Handle bar click - cycle energy level and switch to custom
  const handleBarClick = (hour: number) => {
    const newLevels = [...hourlyLevels]
    newLevels[hour] = cycleEnergyLevel(newLevels[hour])
    setHourlyLevels(newLevels)
    setSelectedPreset("custom")
    setHasChanges(true)
  }

  // Save the energy profile
  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateEnergyProfile({
        preset: selectedPreset,
        hourlyLevels: hourlyLevels,
      })
      toast.success("Energy profile saved successfully!")
      setHasChanges(false)
    } catch (error) {
      console.error("Failed to save energy profile:", error)
      toast.error("Failed to save energy profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // Loading state
  if (currentUser === undefined || presets === undefined) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Preset Selection */}
      <div className="space-y-3">
        <Label>Energy Presets</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(Object.keys(PRESET_CONFIG) as Array<Exclude<PresetType, "custom">>).map(
            (preset) => (
              <PresetCard
                key={preset}
                emoji={PRESET_CONFIG[preset].emoji}
                label={PRESET_CONFIG[preset].label}
                description={PRESET_CONFIG[preset].description}
                selected={selectedPreset === preset}
                onClick={() => handlePresetSelect(preset)}
              />
            )
          )}
          <PresetCard
            emoji={CUSTOM_PRESET.emoji}
            label={CUSTOM_PRESET.label}
            description={CUSTOM_PRESET.description}
            selected={selectedPreset === "custom"}
            onClick={() => handlePresetSelect("custom")}
          />
        </div>
      </div>

      {/* Interactive Bar Chart */}
      <div className="space-y-3">
        <Label>24-Hour Energy Profile</Label>
        <p className="text-sm text-muted-foreground">
          Click any bar to cycle through energy levels. Modifying bars will switch to Custom mode.
        </p>

        <div className="rounded-lg border bg-card p-4">
          {/* Bar chart */}
          <div className="flex h-32 items-end gap-0.5">
            {hourlyLevels.map((level, hour) => (
              <button
                key={hour}
                onClick={() => handleBarClick(hour)}
                className={`flex-1 rounded-t transition-all hover:opacity-80 ${ENERGY_COLORS[level]}`}
                style={{ height: ENERGY_HEIGHTS[level] }}
                title={`${hour}:00 - ${level} energy (click to change)`}
                aria-label={`Hour ${hour}, ${level} energy. Click to change.`}
              />
            ))}
          </div>

          {/* Hour labels */}
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>12am</span>
            <span>6am</span>
            <span>12pm</span>
            <span>6pm</span>
            <span>12am</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded ${ENERGY_COLORS.high}`} />
          <span className="text-sm text-muted-foreground">High</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded ${ENERGY_COLORS.medium}`} />
          <span className="text-sm text-muted-foreground">Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded ${ENERGY_COLORS.low}`} />
          <span className="text-sm text-muted-foreground">Low</span>
        </div>
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={isSaving || !hasChanges} className="w-full sm:w-auto">
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Energy Profile
          </>
        )}
      </Button>
    </div>
  )
}
