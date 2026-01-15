import { memo, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

export type EnergyLevel = "high" | "medium" | "low"

interface EnergyZoneIndicatorProps {
  energyProfile?: {
    hourlyLevels: EnergyLevel[]
    preset: string
  }
  peakEnergyWindow: "morning" | "afternoon" | "evening"
  wakeTime: string
  sleepTime: string
  lazyModeActive?: boolean
}

interface EnergyZone {
  startHour: number
  endHour: number
  level: EnergyLevel
}

// Peak energy ranges by window type
const PEAK_RANGES = {
  morning: { start: 6, end: 12 },
  afternoon: { start: 12, end: 18 },
  evening: { start: 18, end: 22 },
} as const

// Get energy level for a specific hour - exported for testing
export function getEnergyForHour(
  hour: number,
  energyProfile: EnergyZoneIndicatorProps["energyProfile"],
  peakEnergyWindow: EnergyZoneIndicatorProps["peakEnergyWindow"]
): EnergyLevel {
  // Use custom profile if available
  if (energyProfile?.hourlyLevels?.length === 24) {
    return energyProfile.hourlyLevels[hour] ?? "medium"
  }

  // Derive from peak window
  if (hour >= 0 && hour < 6) return "low"
  if (hour >= 22) return "low"

  const peak = PEAK_RANGES[peakEnergyWindow]
  if (hour >= peak.start && hour < peak.end) return "high"
  return "medium"
}

// Calculate energy zones - exported for testing
export function calculateZones(
  wakeHour: number,
  sleepHour: number,
  energyProfile: EnergyZoneIndicatorProps["energyProfile"],
  peakEnergyWindow: EnergyZoneIndicatorProps["peakEnergyWindow"]
): EnergyZone[] {
  const zones: EnergyZone[] = []
  let currentLevel = getEnergyForHour(wakeHour, energyProfile, peakEnergyWindow)
  let zoneStart = wakeHour

  for (let hour = wakeHour; hour <= sleepHour; hour++) {
    const level = getEnergyForHour(hour, energyProfile, peakEnergyWindow)
    if (level !== currentLevel || hour === sleepHour) {
      zones.push({ startHour: zoneStart, endHour: hour, level: currentLevel })
      currentLevel = level
      zoneStart = hour
    }
  }

  // Add final zone if needed
  if (zoneStart < sleepHour) {
    zones.push({ startHour: zoneStart, endHour: sleepHour, level: currentLevel })
  }

  return zones
}

// Format hour to 12-hour format with AM/PM - exported for testing
export function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return "12 AM"
  if (hour === 12) return "12 PM"
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

// Get colors for energy levels
function getEnergyColor(level: EnergyLevel): { bg: string; text: string; legend: string } {
  switch (level) {
    case "high":
      return {
        bg: "bg-green-400 dark:bg-green-500",
        text: "text-green-700 dark:text-green-300",
        legend: "bg-green-500",
      }
    case "medium":
      return {
        bg: "bg-yellow-400 dark:bg-yellow-500",
        text: "text-yellow-700 dark:text-yellow-300",
        legend: "bg-yellow-500",
      }
    case "low":
      return {
        bg: "bg-gray-300 dark:bg-gray-600",
        text: "text-gray-600 dark:text-gray-400",
        legend: "bg-gray-400 dark:bg-gray-500",
      }
  }
}

function EnergyZoneIndicatorComponent({
  energyProfile,
  peakEnergyWindow,
  wakeTime,
  sleepTime,
  lazyModeActive,
}: EnergyZoneIndicatorProps) {
  const [hoveredZone, setHoveredZone] = useState<number | null>(null)

  // Parse times once
  const wakeHour = useMemo(
    () => parseInt(wakeTime.split(":")[0] ?? "7", 10),
    [wakeTime]
  )
  const sleepHour = useMemo(
    () => parseInt(sleepTime.split(":")[0] ?? "23", 10),
    [sleepTime]
  )

  // Memoize zone calculations - only recalculate when inputs change
  const zones = useMemo(
    () => calculateZones(wakeHour, sleepHour, energyProfile, peakEnergyWindow),
    [wakeHour, sleepHour, energyProfile, peakEnergyWindow]
  )

  const totalHours = sleepHour - wakeHour

  // Build accessibility description for the energy zones
  const energyDescription = useMemo(() => {
    const zoneDescriptions = zones.map((zone) => {
      return `${zone.level} energy from ${formatHour(zone.startHour)} to ${formatHour(zone.endHour)}`
    })
    return zoneDescriptions.join(", ")
  }, [zones])

  return (
    <div
      className="rounded-lg bg-muted/50 border p-4 mb-4"
      role="region"
      aria-label={`Energy schedule for today${lazyModeActive ? ", Lazy Mode is active" : ""}`}
    >
      {/* Lazy Mode Badge */}
      {lazyModeActive && (
        <div className="inline-flex items-center gap-1.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full mb-3">
          <span className="font-semibold">Lazy Mode Active</span>
        </div>
      )}

      {/* Energy Bar */}
      <div
        className="relative flex h-2.5 rounded-full overflow-hidden"
        role="img"
        aria-label={`Energy zones: ${energyDescription}`}
      >
        {zones.map((zone, index) => {
          const width = ((zone.endHour - zone.startHour) / totalHours) * 100
          const colors = getEnergyColor(zone.level)
          const isHovered = hoveredZone === index

          return (
            <div
              key={`${zone.startHour}-${zone.endHour}-${index}`}
              className={cn(
                "relative h-full transition-all duration-150 cursor-pointer",
                colors.bg,
                isHovered && "ring-2 ring-offset-1 ring-primary/50 z-10"
              )}
              style={{ width: `${width}%` }}
              onMouseEnter={() => setHoveredZone(index)}
              onMouseLeave={() => setHoveredZone(null)}
              title={`${zone.level.charAt(0).toUpperCase() + zone.level.slice(1)} energy: ${formatHour(zone.startHour)} - ${formatHour(zone.endHour)}`}
            />
          )
        })}
      </div>

      {/* Hover tooltip */}
      {hoveredZone !== null && zones[hoveredZone] && (
        <div className="mt-2 text-xs text-muted-foreground text-center animate-in fade-in duration-150">
          <span className="font-medium capitalize">{zones[hoveredZone].level} energy</span>
          <span className="mx-1">:</span>
          <span>
            {formatHour(zones[hoveredZone].startHour)} - {formatHour(zones[hoveredZone].endHour)}
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3" aria-hidden="true">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-xs text-muted-foreground">Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
          <span className="text-xs text-muted-foreground">Low</span>
        </div>
      </div>
    </div>
  )
}

// Efficient array comparison without JSON.stringify - exported for testing
export function arraysEqual(a?: EnergyLevel[], b?: EnergyLevel[]): boolean {
  if (a === b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

// Custom comparison - only re-render when relevant props change
function areEqual(
  prev: EnergyZoneIndicatorProps,
  next: EnergyZoneIndicatorProps
): boolean {
  return (
    prev.wakeTime === next.wakeTime &&
    prev.sleepTime === next.sleepTime &&
    prev.peakEnergyWindow === next.peakEnergyWindow &&
    prev.lazyModeActive === next.lazyModeActive &&
    prev.energyProfile?.preset === next.energyProfile?.preset &&
    arraysEqual(prev.energyProfile?.hourlyLevels, next.energyProfile?.hourlyLevels)
  )
}

export const EnergyZoneIndicator = memo(EnergyZoneIndicatorComponent, areEqual)
