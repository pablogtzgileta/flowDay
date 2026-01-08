import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./auth";
import { timeToHour, timeToMinutes, minutesToTime } from "./utils/time";

// Re-export for backward compatibility
export { timeToHour, timeToMinutes, minutesToTime } from "./utils/time";

// Energy level type
export type EnergyLevel = "high" | "medium" | "low";

// Energy profile type
export type EnergyProfile = {
  hourlyLevels: EnergyLevel[];
  preset: "morning_person" | "night_owl" | "steady" | "custom";
};

// Default energy presets - single source of truth (imported by users.ts)
export const ENERGY_PRESETS: Record<string, EnergyLevel[]> = {
  morning_person: [
    "low", "low", "low", "low", "low", "low",
    "medium", "high", "high", "high", "high", "high",
    "medium", "low", "medium", "medium", "medium", "medium",
    "medium", "low", "low", "low", "low", "low",
  ],
  night_owl: [
    "low", "low", "low", "low", "low", "low",
    "low", "low", "medium", "medium", "medium", "medium",
    "medium", "medium", "high", "high", "high", "high",
    "high", "high", "high", "medium", "medium", "low",
  ],
  steady: [
    "low", "low", "low", "low", "low", "low",
    "medium", "medium", "medium", "medium", "medium", "medium",
    "medium", "medium", "medium", "medium", "medium", "medium",
    "medium", "medium", "low", "low", "low", "low",
  ],
};

// Get energy level for a specific hour based on user's profile
export function getEnergyLevelForHour(
  hour: number,
  energyProfile: EnergyProfile | undefined,
  peakEnergyWindow: "morning" | "afternoon" | "evening"
): EnergyLevel {
  // If user has a custom energy profile, use it
  if (energyProfile?.hourlyLevels?.length === 24) {
    return energyProfile.hourlyLevels[hour] ?? "medium";
  }

  // Fall back to deriving from peakEnergyWindow
  return deriveEnergyFromPeakWindow(hour, peakEnergyWindow);
}

// Derive energy level from legacy peakEnergyWindow setting
function deriveEnergyFromPeakWindow(
  hour: number,
  peakEnergyWindow: "morning" | "afternoon" | "evening"
): EnergyLevel {
  // Sleep hours (midnight to 6am)
  if (hour >= 0 && hour < 6) return "low";

  // Late evening (10pm to midnight)
  if (hour >= 22) return "low";

  // Map peak windows to hours
  const peakRanges = {
    morning: { start: 6, end: 12 },
    afternoon: { start: 12, end: 18 },
    evening: { start: 18, end: 22 },
  };

  const peak = peakRanges[peakEnergyWindow];

  if (hour >= peak.start && hour < peak.end) {
    return "high";
  }

  return "medium";
}

// Get energy level for a time string "HH:MM"
export function getEnergyLevelForTime(
  time: string,
  energyProfile: EnergyProfile | undefined,
  peakEnergyWindow: "morning" | "afternoon" | "evening"
): EnergyLevel {
  const hour = timeToHour(time);
  return getEnergyLevelForHour(hour, energyProfile, peakEnergyWindow);
}

// Score how well a time slot matches a task's energy requirement
// Higher score = better match
export function scoreSlotForEnergy(
  slotStartTime: string,
  slotEndTime: string,
  taskEnergyLevel: EnergyLevel,
  energyProfile: EnergyProfile | undefined,
  peakEnergyWindow: "morning" | "afternoon" | "evening"
): number {
  // Get energy level at slot midpoint
  const startMinutes = timeToMinutes(slotStartTime);
  const endMinutes = timeToMinutes(slotEndTime);
  const midpointMinutes = (startMinutes + endMinutes) / 2;
  const midpointHour = Math.floor(midpointMinutes / 60);

  const slotEnergy = getEnergyLevelForHour(midpointHour, energyProfile, peakEnergyWindow);

  // Scoring logic
  let score = 0;

  // Perfect match: task energy matches slot energy
  if (taskEnergyLevel === slotEnergy) {
    score += 20;
  }

  // High-energy task in high-energy slot is ideal
  if (taskEnergyLevel === "high" && slotEnergy === "high") {
    score += 15;
  }

  // High-energy task in low-energy slot is bad
  if (taskEnergyLevel === "high" && slotEnergy === "low") {
    score -= 15;
  }

  // Low-energy task in high-energy slot is wasteful but not terrible
  if (taskEnergyLevel === "low" && slotEnergy === "high") {
    score -= 5;
  }

  // Low-energy task in low-energy slot is efficient
  if (taskEnergyLevel === "low" && slotEnergy === "low") {
    score += 10;
  }

  // Medium energy is flexible
  if (taskEnergyLevel === "medium" || slotEnergy === "medium") {
    score += 5;
  }

  return score;
}

// Check if lazy mode is currently active
export function isLazyModeActive(
  lazyModeEnabled: boolean | undefined,
  lazyModeUntil: number | undefined
): boolean {
  if (!lazyModeEnabled) return false;

  // If there's an expiry time, check if it has passed
  if (lazyModeUntil && Date.now() > lazyModeUntil) {
    return false;
  }

  return true;
}

// Get energy schedule as human-readable string
export function formatEnergySchedule(
  energyProfile: EnergyProfile | undefined,
  peakEnergyWindow: "morning" | "afternoon" | "evening",
  wakeTime: string,
  sleepTime: string
): string {
  const wakeHour = timeToHour(wakeTime);
  const sleepHour = timeToHour(sleepTime);

  const segments: string[] = [];
  let currentEnergy: EnergyLevel | null = null;
  let segmentStart = wakeHour;

  // Build list of hours to process (handles overnight schedules)
  const hoursToProcess: number[] = [];
  if (wakeHour < sleepHour) {
    // Normal schedule (e.g., wake 7, sleep 23)
    for (let h = wakeHour; h < sleepHour; h++) hoursToProcess.push(h);
  } else if (wakeHour > sleepHour) {
    // Overnight schedule (e.g., wake 20, sleep 8)
    for (let h = wakeHour; h < 24; h++) hoursToProcess.push(h);
    for (let h = 0; h < sleepHour; h++) hoursToProcess.push(h);
  }
  // If wakeHour === sleepHour, hoursToProcess stays empty (edge case)

  // Iterate through waking hours
  for (const hour of hoursToProcess) {
    const energy = getEnergyLevelForHour(hour, energyProfile, peakEnergyWindow);

    if (energy !== currentEnergy) {
      if (currentEnergy !== null) {
        segments.push(
          `${segmentStart.toString().padStart(2, "0")}:00-${hour.toString().padStart(2, "0")}:00: ${currentEnergy} energy`
        );
      }
      currentEnergy = energy;
      segmentStart = hour;
    }
  }

  // Add final segment
  if (currentEnergy !== null) {
    segments.push(
      `${segmentStart.toString().padStart(2, "0")}:00-${sleepHour.toString().padStart(2, "0")}:00: ${currentEnergy} energy`
    );
  }

  return segments.join(", ");
}

// Get current energy level based on current time
export function getCurrentEnergyLevel(
  energyProfile: EnergyProfile | undefined,
  peakEnergyWindow: "morning" | "afternoon" | "evening",
  timezone: string
): EnergyLevel {
  // Get current hour in user's timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: timezone,
  });
  const hourStr = formatter.format(now);
  const hour = parseInt(hourStr, 10);

  return getEnergyLevelForHour(hour, energyProfile, peakEnergyWindow);
}

// Query: Get current energy context for a user
export const getEnergyContext = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const { preferences } = user;
    const energyProfile = preferences.energyProfile;
    const lazyModeActive = isLazyModeActive(
      preferences.lazyModeEnabled,
      preferences.lazyModeUntil
    );

    const currentEnergy = getCurrentEnergyLevel(
      energyProfile,
      preferences.peakEnergyWindow,
      preferences.timezone
    );

    const energySchedule = formatEnergySchedule(
      energyProfile,
      preferences.peakEnergyWindow,
      preferences.wakeTime,
      preferences.sleepTime
    );

    return {
      currentEnergy,
      energySchedule,
      lazyModeActive,
      lazyModeUntil: preferences.lazyModeUntil,
      energyProfile: energyProfile ?? null,
      peakEnergyWindow: preferences.peakEnergyWindow,
    };
  },
});

// Query: Find optimal time slots for a task with given energy requirement
export const findOptimalSlots = query({
  args: {
    date: v.string(),
    taskEnergyLevel: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    durationMinutes: v.number(),
    // Optional: exclude certain time ranges
    excludeRanges: v.optional(
      v.array(
        v.object({
          startTime: v.string(),
          endTime: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, { date, taskEnergyLevel, durationMinutes, excludeRanges }) => {
    const user = await requireAuth(ctx);
    const { preferences } = user;

    // Get existing blocks for the date
    const existingBlocks = await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", date)
      )
      .collect();

    // Filter to active blocks
    const activeBlocks = existingBlocks.filter(
      (b) => b.status !== "moved" && b.status !== "skipped"
    );

    // Build list of busy times
    const busyRanges = activeBlocks.map((b) => ({
      start: timeToMinutes(b.startTime),
      end: timeToMinutes(b.endTime),
    }));

    // Add excluded ranges
    if (excludeRanges) {
      for (const range of excludeRanges) {
        busyRanges.push({
          start: timeToMinutes(range.startTime),
          end: timeToMinutes(range.endTime),
        });
      }
    }

    // Sort busy ranges
    busyRanges.sort((a, b) => a.start - b.start);

    // Define available window (wake to sleep)
    const wakeMinutes = timeToMinutes(preferences.wakeTime);
    const sleepMinutes = timeToMinutes(preferences.sleepTime);

    // Find free slots
    const freeSlots: Array<{ start: number; end: number }> = [];
    let currentStart = wakeMinutes;

    for (const busy of busyRanges) {
      if (busy.start > currentStart) {
        freeSlots.push({ start: currentStart, end: busy.start });
      }
      currentStart = Math.max(currentStart, busy.end);
    }

    // Add final slot if there's time before sleep
    if (currentStart < sleepMinutes) {
      freeSlots.push({ start: currentStart, end: sleepMinutes });
    }

    // Filter slots that can fit the task
    const viableSlots = freeSlots.filter(
      (slot) => slot.end - slot.start >= durationMinutes
    );

    // Score each slot
    const scoredSlots = viableSlots.map((slot) => {
      const startTime = minutesToTime(slot.start);
      const endTime = minutesToTime(Math.min(slot.start + durationMinutes, slot.end));

      const score = scoreSlotForEnergy(
        startTime,
        endTime,
        taskEnergyLevel,
        preferences.energyProfile,
        preferences.peakEnergyWindow
      );

      const slotEnergy = getEnergyLevelForTime(
        startTime,
        preferences.energyProfile,
        preferences.peakEnergyWindow
      );

      return {
        startTime,
        endTime,
        slotEnergy,
        score,
        isOptimal: slotEnergy === taskEnergyLevel,
      };
    });

    // Sort by score (highest first)
    scoredSlots.sort((a, b) => b.score - a.score);

    return {
      slots: scoredSlots.slice(0, 5), // Return top 5 options
      lazyModeActive: isLazyModeActive(
        preferences.lazyModeEnabled,
        preferences.lazyModeUntil
      ),
    };
  },
});

// Query: Validate if a specific time is energy-appropriate for a task
export const validateEnergyMatch = query({
  args: {
    startTime: v.string(),
    endTime: v.string(),
    taskEnergyLevel: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
  },
  handler: async (ctx, { startTime, endTime, taskEnergyLevel }) => {
    const user = await requireAuth(ctx);
    const { preferences } = user;

    const slotEnergy = getEnergyLevelForTime(
      startTime,
      preferences.energyProfile,
      preferences.peakEnergyWindow
    );

    const score = scoreSlotForEnergy(
      startTime,
      endTime,
      taskEnergyLevel,
      preferences.energyProfile,
      preferences.peakEnergyWindow
    );

    const lazyModeActive = isLazyModeActive(
      preferences.lazyModeEnabled,
      preferences.lazyModeUntil
    );

    // Generate warning if there's a mismatch
    let warning: string | null = null;

    if (taskEnergyLevel === "high" && slotEnergy === "low") {
      warning = `This is a high-energy task scheduled during a low-energy period (${startTime}). Consider scheduling earlier when you have more energy.`;
    } else if (taskEnergyLevel === "high" && lazyModeActive) {
      warning = `Lazy mode is active. Consider a lighter task or scheduling this for another day.`;
    }

    return {
      isMatch: taskEnergyLevel === slotEnergy,
      taskEnergy: taskEnergyLevel,
      slotEnergy,
      score,
      warning,
      lazyModeActive,
    };
  },
});

// Query: Get lazy mode alternatives for high-energy tasks
export const getLazyModeAlternatives = query({
  args: {
    originalTaskTitle: v.string(),
    originalEnergyLevel: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    goalId: v.optional(v.id("goals")),
  },
  handler: async (ctx, { originalTaskTitle, originalEnergyLevel, goalId }) => {
    const user = await requireAuth(ctx);

    const lazyModeActive = isLazyModeActive(
      user.preferences.lazyModeEnabled,
      user.preferences.lazyModeUntil
    );

    if (!lazyModeActive) {
      return {
        lazyModeActive: false,
        alternatives: [],
        suggestions: [],
      };
    }

    // Generate alternative suggestions based on task type
    const alternatives: Array<{
      title: string;
      energyLevel: EnergyLevel;
      description: string;
    }> = [];

    const suggestions: string[] = [];

    if (originalEnergyLevel === "high") {
      // Suggest lighter alternatives
      alternatives.push({
        title: `Light ${originalTaskTitle.toLowerCase()}`,
        energyLevel: "low",
        description: "A gentler version of this task",
      });

      alternatives.push({
        title: `Plan for ${originalTaskTitle.toLowerCase()}`,
        energyLevel: "low",
        description: "Prepare and organize instead of doing the full task",
      });

      suggestions.push("Consider breaking this into smaller, easier steps");
      suggestions.push("You could reschedule this to a higher-energy day");
      suggestions.push("Try a 15-minute version instead of the full session");
    } else if (originalEnergyLevel === "medium") {
      alternatives.push({
        title: `Quick ${originalTaskTitle.toLowerCase()}`,
        energyLevel: "low",
        description: "A shorter, simpler version",
      });

      suggestions.push("Consider doing just the essential part");
    }

    // If linked to a goal, suggest shorter session
    if (goalId) {
      const goal = await ctx.db.get(goalId);
      if (goal) {
        alternatives.push({
          title: `${goal.preferredSessionLength.min}-min ${goal.title} session`,
          energyLevel: "medium",
          description: "Minimum session length to maintain progress",
        });
      }
    }

    return {
      lazyModeActive: true,
      alternatives,
      suggestions,
    };
  },
});
