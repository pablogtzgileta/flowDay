import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./auth";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { CACHE_TTL_MS } from "./travelTimeCache";
import {
  getEnergyLevelForTime,
  scoreSlotForEnergy,
  isLazyModeActive,
  type EnergyLevel,
} from "./scheduling";
import { timeToMinutes } from "./utils/time";
import {
  validateTimeFormat,
  validateDateFormat,
  timesOverlap,
} from "./utils/validation";

// Re-export validation functions for backward compatibility
export { validateTimeFormat, validateDateFormat, timesOverlap } from "./utils/validation";

// Default prep buffer when travel time is unknown
const DEFAULT_TRAVEL_PREP_BUFFER = 10; // minutes

// Default notification buffer (minutes before start time to notify)
const DEFAULT_NOTIFICATION_BUFFER = 5; // minutes

// Calculate notifyAt timestamp for a block
function calculateNotifyAt(params: {
  date: string;
  startTime: string;
  prepBuffer: number;
  estimatedTravelTime?: number;
  sleepTime: string;
  wakeTime: string;
}): number | undefined {
  const { date, startTime, prepBuffer, estimatedTravelTime, sleepTime, wakeTime } =
    params;

  // Parse start time into a timestamp
  const [hours, minutes] = startTime.split(":").map(Number);
  const blockStartDate = new Date(`${date}T${startTime}:00`);
  const blockStartMs = blockStartDate.getTime();

  // Calculate notification time:
  // startTime - prepBuffer - travelTime - 5 min default buffer
  let notifyMinutesBefore = prepBuffer + DEFAULT_NOTIFICATION_BUFFER;

  if (estimatedTravelTime) {
    notifyMinutesBefore += estimatedTravelTime;
  }

  const notifyAtMs = blockStartMs - notifyMinutesBefore * 60 * 1000;

  // Check if notification time is in quiet hours (sleep time)
  const notifyDate = new Date(notifyAtMs);
  const notifyMinutes = notifyDate.getHours() * 60 + notifyDate.getMinutes();
  const sleepMinutes = timeToMinutes(sleepTime);
  const wakeMinutes = timeToMinutes(wakeTime);

  // Handle overnight case (e.g., sleep 23:00, wake 07:00)
  let isQuietHours = false;
  if (sleepMinutes > wakeMinutes) {
    isQuietHours = notifyMinutes >= sleepMinutes || notifyMinutes < wakeMinutes;
  } else {
    isQuietHours = notifyMinutes >= sleepMinutes && notifyMinutes < wakeMinutes;
  }

  if (isQuietHours) {
    return undefined; // Don't notify during sleep
  }

  // Don't return if notification time is in the past
  if (notifyAtMs <= Date.now()) {
    return undefined;
  }

  return notifyAtMs;
}

// Get blocks for a specific date
export const getByDate = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, { date }) => {
    const user = await requireAuth(ctx);

    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", date)
      )
      .collect();

    // Sort by start time
    return blocks.sort((a, b) => a.startTime.localeCompare(b.startTime));
  },
});

// Get blocks for a date range - optimized with index bounds
export const getByDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const user = await requireAuth(ctx);

    // Use the by_user_date index with bounds for efficient range queries
    // This avoids loading all user blocks and filtering in memory
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).gte("date", startDate).lte("date", endDate)
      )
      .collect();

    // Sort by date and time
    return blocks.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  },
});

// Combined query for timeline - reduces waterfall by combining blocks + user context
// Returns everything needed to render the timeline in a single subscription
export const getTimelineContext = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, { date }) => {
    const user = await requireAuth(ctx);

    // Fetch blocks for the requested date
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", date)
      )
      .collect();

    // Sort by start time
    const sortedBlocks = blocks.sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

    // Check lazy mode status
    const { lazyModeEnabled, lazyModeUntil, energyProfile, peakEnergyWindow } =
      user.preferences;
    const lazyModeActive =
      lazyModeEnabled === true &&
      (lazyModeUntil === undefined || lazyModeUntil > Date.now());

    return {
      blocks: sortedBlocks,
      energyProfile,
      peakEnergyWindow,
      wakeTime: user.preferences.wakeTime,
      sleepTime: user.preferences.sleepTime,
      lazyModeActive,
      notificationStyle: user.preferences.notificationStyle,
    };
  },
});

// Create a new block with validation and conflict detection
export const create = mutation({
  args: {
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    source: v.union(
      v.literal("routine"),
      v.literal("user_request"),
      v.literal("ai_suggestion"),
      v.literal("goal_session")
    ),
    requiresTravel: v.boolean(),
    locationId: v.optional(v.id("locations")),
    goalId: v.optional(v.id("goals")),
    energyLevel: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Validate date format
    if (!validateDateFormat(args.date)) {
      throw new Error("Invalid date format. Use YYYY-MM-DD");
    }

    // Validate time format
    if (
      !validateTimeFormat(args.startTime) ||
      !validateTimeFormat(args.endTime)
    ) {
      throw new Error("Invalid time format. Use HH:MM (24-hour)");
    }

    const startMinutes = timeToMinutes(args.startTime);
    const endMinutes = timeToMinutes(args.endTime);

    if (startMinutes >= endMinutes) {
      throw new Error("End time must be after start time");
    }

    // Validate title
    if (args.title.trim().length === 0) {
      throw new Error("Title cannot be empty");
    }

    if (args.title.length > 100) {
      throw new Error("Title must be 100 characters or less");
    }

    // Check for conflicts
    const existingBlocks = await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", args.date)
      )
      .collect();

    const activeBlocks = existingBlocks.filter(
      (b) => b.status !== "moved" && b.status !== "skipped"
    );

    for (const block of activeBlocks) {
      const blockStart = timeToMinutes(block.startTime);
      const blockEnd = timeToMinutes(block.endTime);

      if (timesOverlap(startMinutes, endMinutes, blockStart, blockEnd)) {
        throw new Error(
          `Conflicts with "${block.title}" (${block.startTime}-${block.endTime})`
        );
      }
    }

    // Create block
    const now = Date.now();

    // Calculate travel time if block requires travel and has a location
    let estimatedTravelTime: number | undefined;
    let prepBuffer = 0;

    if (args.requiresTravel && args.locationId) {
      // Get user's home/default location
      const homeLocation = await ctx.db
        .query("locations")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("isDefault"), true))
        .first();

      // Fallback: try to find "Home" by label
      const fallbackHome =
        homeLocation ??
        (await ctx.db
          .query("locations")
          .withIndex("by_user_label", (q) =>
            q.eq("userId", user._id).eq("label", "Home")
          )
          .first());

      if (fallbackHome && args.locationId && fallbackHome._id !== args.locationId) {
        // Check travel time cache
        const cachedTravelTime = await ctx.db
          .query("travelTimeCache")
          .withIndex("by_locations", (q) =>
            q
              .eq("fromLocationId", fallbackHome._id)
              .eq("toLocationId", args.locationId!)
          )
          .first();

        if (cachedTravelTime) {
          // Check if cache is still fresh
          const cacheAge = now - cachedTravelTime.calculatedAt;

          if (cacheAge < CACHE_TTL_MS) {
            estimatedTravelTime = cachedTravelTime.travelTimeMinutes;
            // Add buffer based on traffic: light +5min, moderate +10min, heavy +15min
            const trafficBuffer =
              cachedTravelTime.trafficCondition === "heavy"
                ? 15
                : cachedTravelTime.trafficCondition === "moderate"
                  ? 10
                  : 5;
            prepBuffer = trafficBuffer;
          }
        }
      }

      // Fallback if no cached travel time found
      if (estimatedTravelTime === undefined) {
        prepBuffer = DEFAULT_TRAVEL_PREP_BUFFER;
      }
    }

    // Calculate notifyAt based on user preferences
    const notifyAt = calculateNotifyAt({
      date: args.date,
      startTime: args.startTime,
      prepBuffer,
      estimatedTravelTime,
      sleepTime: user.preferences.sleepTime,
      wakeTime: user.preferences.wakeTime,
    });

    // Energy validation
    const { preferences } = user;
    const slotEnergy = getEnergyLevelForTime(
      args.startTime,
      preferences.energyProfile,
      preferences.peakEnergyWindow
    );

    const lazyModeActive = isLazyModeActive(
      preferences.lazyModeEnabled,
      preferences.lazyModeUntil
    );

    // Build energy warning if there's a mismatch
    let energyWarning: {
      message: string;
      taskEnergy: EnergyLevel;
      slotEnergy: EnergyLevel;
    } | undefined;

    const taskEnergy = args.energyLevel ?? "medium";

    if (taskEnergy === "high" && slotEnergy === "low") {
      energyWarning = {
        message: `This high-energy task is scheduled during a low-energy period (${args.startTime}). Consider scheduling earlier when you have more energy.`,
        taskEnergy,
        slotEnergy,
      };
    } else if (taskEnergy === "high" && lazyModeActive) {
      energyWarning = {
        message: "Lazy mode is active. Consider a lighter task or scheduling this for another day.",
        taskEnergy,
        slotEnergy,
      };
    }

    const blockId = await ctx.db.insert("blocks", {
      userId: user._id,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      title: args.title.trim(),
      description: args.description,
      source: args.source,
      status: "planned",
      requiresTravel: args.requiresTravel,
      locationId: args.locationId,
      estimatedTravelTime,
      goalId: args.goalId,
      energyLevel: args.energyLevel,
      prepBuffer,
      notifyAt,
      timesPostponed: 0,
      createdAt: now,
      updatedAt: now,
    });

    return {
      blockId,
      energyWarning,
      slotEnergy,
      lazyModeActive,
    };
  },
});

// Helper to verify block ownership
async function getBlockWithOwnership(
  ctx: MutationCtx,
  blockId: Id<"blocks">,
  userId: Id<"users">
): Promise<Doc<"blocks">> {
  const block = await ctx.db.get(blockId);
  if (!block) {
    throw new Error("Block not found");
  }
  // Verify ownership - don't reveal existence to non-owners
  if (block.userId !== userId) {
    throw new Error("Block not found");
  }
  return block;
}

// Update block status
export const updateStatus = mutation({
  args: {
    blockId: v.id("blocks"),
    status: v.union(
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("skipped"),
      v.literal("moved")
    ),
  },
  handler: async (ctx, { blockId, status }) => {
    const user = await requireAuth(ctx);
    const block = await getBlockWithOwnership(ctx, blockId, user._id);

    interface BlockStatusUpdate {
      status: typeof status;
      updatedAt: number;
      completedAt?: number;
    }

    const updates: BlockStatusUpdate = {
      status,
      updatedAt: Date.now(),
    };

    if (status === "completed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(block._id, updates);
  },
});

// Update block details
export const update = mutation({
  args: {
    blockId: v.id("blocks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    energyLevel: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
    ),
  },
  handler: async (ctx, { blockId, ...updates }) => {
    const user = await requireAuth(ctx);
    const block = await getBlockWithOwnership(ctx, blockId, user._id);

    // Validate title if provided
    if (updates.title !== undefined) {
      if (updates.title.trim().length === 0) {
        throw new Error("Title cannot be empty");
      }
      if (updates.title.length > 100) {
        throw new Error("Title must be 100 characters or less");
      }
    }

    // Validate times if provided
    if (updates.startTime && !validateTimeFormat(updates.startTime)) {
      throw new Error("Invalid start time format. Use HH:MM (24-hour)");
    }
    if (updates.endTime && !validateTimeFormat(updates.endTime)) {
      throw new Error("Invalid end time format. Use HH:MM (24-hour)");
    }

    // Check time ordering if both times provided
    const newStartTime = updates.startTime || block.startTime;
    const newEndTime = updates.endTime || block.endTime;

    if (updates.startTime || updates.endTime) {
      const startMinutes = timeToMinutes(newStartTime);
      const endMinutes = timeToMinutes(newEndTime);

      if (startMinutes >= endMinutes) {
        throw new Error("End time must be after start time");
      }

      // Check for conflicts with other blocks
      const existingBlocks = await ctx.db
        .query("blocks")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", user._id).eq("date", block.date)
        )
        .collect();

      const activeBlocks = existingBlocks.filter(
        (b) =>
          b._id !== blockId && b.status !== "moved" && b.status !== "skipped"
      );

      for (const otherBlock of activeBlocks) {
        const blockStart = timeToMinutes(otherBlock.startTime);
        const blockEnd = timeToMinutes(otherBlock.endTime);

        if (timesOverlap(startMinutes, endMinutes, blockStart, blockEnd)) {
          throw new Error(
            `Conflicts with "${otherBlock.title}" (${otherBlock.startTime}-${otherBlock.endTime})`
          );
        }
      }
    }

    // Build update object with proper typing
    interface BlockUpdate {
      updatedAt: number;
      title?: string;
      description?: string;
      startTime?: string;
      endTime?: string;
      energyLevel?: "high" | "medium" | "low";
    }

    const updateData: BlockUpdate = { updatedAt: Date.now() };

    if (updates.title !== undefined) updateData.title = updates.title.trim();
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.startTime !== undefined) updateData.startTime = updates.startTime;
    if (updates.endTime !== undefined) updateData.endTime = updates.endTime;
    if (updates.energyLevel !== undefined)
      updateData.energyLevel = updates.energyLevel;

    await ctx.db.patch(block._id, updateData);

    return block._id;
  },
});

// Delete a block
export const deleteBlock = mutation({
  args: {
    blockId: v.id("blocks"),
  },
  handler: async (ctx, { blockId }) => {
    const user = await requireAuth(ctx);
    const block = await getBlockWithOwnership(ctx, blockId, user._id);

    await ctx.db.delete(block._id);

    return { deletedBlockId: block._id };
  },
});

// Update notification ID for a block (called from client after scheduling)
export const updateNotificationId = mutation({
  args: {
    blockId: v.id("blocks"),
    notificationId: v.string(),
  },
  handler: async (ctx, { blockId, notificationId }) => {
    const user = await requireAuth(ctx);
    const block = await getBlockWithOwnership(ctx, blockId, user._id);

    await ctx.db.patch(block._id, {
      notificationId,
      updatedAt: Date.now(),
    });
  },
});

// Reschedule block to new time/date
export const reschedule = mutation({
  args: {
    blockId: v.id("blocks"),
    newDate: v.string(),
    newStartTime: v.string(),
    newEndTime: v.string(),
  },
  handler: async (ctx, { blockId, newDate, newStartTime, newEndTime }) => {
    const user = await requireAuth(ctx);
    const block = await getBlockWithOwnership(ctx, blockId, user._id);

    // Validate inputs
    if (!validateDateFormat(newDate)) {
      throw new Error("Invalid date format. Use YYYY-MM-DD");
    }

    if (!validateTimeFormat(newStartTime) || !validateTimeFormat(newEndTime)) {
      throw new Error("Invalid time format. Use HH:MM (24-hour)");
    }

    const startMinutes = timeToMinutes(newStartTime);
    const endMinutes = timeToMinutes(newEndTime);

    if (startMinutes >= endMinutes) {
      throw new Error("End time must be after start time");
    }

    // Check for conflicts at new time
    const existingBlocks = await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", newDate)
      )
      .collect();

    const activeBlocks = existingBlocks.filter(
      (b) => b._id !== blockId && b.status !== "moved" && b.status !== "skipped"
    );

    for (const otherBlock of activeBlocks) {
      const blockStart = timeToMinutes(otherBlock.startTime);
      const blockEnd = timeToMinutes(otherBlock.endTime);

      if (timesOverlap(startMinutes, endMinutes, blockStart, blockEnd)) {
        throw new Error(
          `Conflicts with "${otherBlock.title}" (${otherBlock.startTime}-${otherBlock.endTime})`
        );
      }
    }

    // Recalculate notifyAt for new time
    const notifyAt = calculateNotifyAt({
      date: newDate,
      startTime: newStartTime,
      prepBuffer: block.prepBuffer,
      estimatedTravelTime: block.estimatedTravelTime,
      sleepTime: user.preferences.sleepTime,
      wakeTime: user.preferences.wakeTime,
    });

    await ctx.db.patch(block._id, {
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      originalDate: block.originalDate || block.date,
      timesPostponed: block.timesPostponed + 1,
      status: "planned",
      notifyAt,
      notificationId: undefined, // Clear old notification ID so client can reschedule
      updatedAt: Date.now(),
    });
  },
});

// Proposed block structure for schedule preview validation
interface ProposedBlock {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  requiresTravel?: boolean;
  energyLevel?: "high" | "medium" | "low";
}

// Validation result for a single proposed block
interface BlockValidationResult {
  index: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
  conflictsWith?: {
    type: "existing" | "proposed";
    title: string;
    startTime: string;
    endTime: string;
  }[];
}

// Summary of all validation results
interface PreviewValidationSummary {
  totalBlocks: number;
  validBlocks: number;
  invalidBlocks: number;
  hasConflicts: boolean;
  hasFormatErrors: boolean;
}

// Validate proposed schedule blocks before creating them
export const validateSchedulePreview = query({
  args: {
    blocks: v.array(
      v.object({
        title: v.string(),
        date: v.string(),
        startTime: v.string(),
        endTime: v.string(),
        description: v.optional(v.string()),
        requiresTravel: v.optional(v.boolean()),
        energyLevel: v.optional(
          v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
        ),
      })
    ),
  },
  handler: async (ctx, { blocks }): Promise<{
    valid: boolean;
    blockResults: BlockValidationResult[];
    summary: PreviewValidationSummary;
  }> => {
    const user = await requireAuth(ctx);

    // Limit to 5 blocks for MVP (critical warning from plan)
    if (blocks.length > 5) {
      return {
        valid: false,
        blockResults: [
          {
            index: 0,
            valid: false,
            errors: [
              `Maximum 5 blocks allowed for preview. You provided ${blocks.length}.`,
            ],
            warnings: [],
          },
        ],
        summary: {
          totalBlocks: blocks.length,
          validBlocks: 0,
          invalidBlocks: 1,
          hasConflicts: false,
          hasFormatErrors: true,
        },
      };
    }

    if (blocks.length === 0) {
      return {
        valid: false,
        blockResults: [
          {
            index: 0,
            valid: false,
            errors: ["At least one block is required for preview."],
            warnings: [],
          },
        ],
        summary: {
          totalBlocks: 0,
          validBlocks: 0,
          invalidBlocks: 1,
          hasConflicts: false,
          hasFormatErrors: true,
        },
      };
    }

    const blockResults: BlockValidationResult[] = [];
    let hasAnyConflicts = false;
    let hasAnyFormatErrors = false;

    // Collect all unique dates from proposed blocks
    const uniqueDates = [...new Set(blocks.map((b) => b.date))];

    // Fetch existing blocks for all relevant dates
    const existingBlocksByDate: Map<string, Doc<"blocks">[]> = new Map();
    for (const date of uniqueDates) {
      const existingBlocks = await ctx.db
        .query("blocks")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", user._id).eq("date", date)
        )
        .collect();

      // Filter out moved/skipped blocks
      const activeBlocks = existingBlocks.filter(
        (b) => b.status !== "moved" && b.status !== "skipped"
      );
      existingBlocksByDate.set(date, activeBlocks);
    }

    // Parse proposed blocks into a structure with validated times
    const parsedProposed: Array<{
      index: number;
      block: ProposedBlock;
      startMinutes: number;
      endMinutes: number;
      hasFormatError: boolean;
    }> = [];

    // Validate each proposed block
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]!; // Safe: we know i < blocks.length
      const errors: string[] = [];
      const warnings: string[] = [];
      const conflictsWith: BlockValidationResult["conflictsWith"] = [];

      // 1. Validate title
      if (!block.title || block.title.trim().length === 0) {
        errors.push("Title cannot be empty");
      } else if (block.title.length > 100) {
        errors.push("Title must be 100 characters or less");
      }

      // 2. Validate date format
      if (!validateDateFormat(block.date)) {
        errors.push(`Invalid date format "${block.date}". Use YYYY-MM-DD`);
        hasAnyFormatErrors = true;
      }

      // 3. Validate time formats
      let startMinutes = 0;
      let endMinutes = 0;
      let hasFormatError = false;

      if (!validateTimeFormat(block.startTime)) {
        errors.push(
          `Invalid start time format "${block.startTime}". Use HH:MM (24-hour)`
        );
        hasAnyFormatErrors = true;
        hasFormatError = true;
      } else {
        startMinutes = timeToMinutes(block.startTime);
      }

      if (!validateTimeFormat(block.endTime)) {
        errors.push(
          `Invalid end time format "${block.endTime}". Use HH:MM (24-hour)`
        );
        hasAnyFormatErrors = true;
        hasFormatError = true;
      } else {
        endMinutes = timeToMinutes(block.endTime);
      }

      // 4. Validate time ordering (start < end)
      if (!hasFormatError && startMinutes >= endMinutes) {
        errors.push(
          `End time (${block.endTime}) must be after start time (${block.startTime})`
        );
      }

      // Store parsed block for cross-block validation
      parsedProposed.push({
        index: i,
        block,
        startMinutes,
        endMinutes,
        hasFormatError,
      });

      // 5. Check conflicts with existing blocks (only if times are valid)
      if (!hasFormatError && validateDateFormat(block.date)) {
        const existingBlocks = existingBlocksByDate.get(block.date) || [];

        for (const existing of existingBlocks) {
          const existingStart = timeToMinutes(existing.startTime);
          const existingEnd = timeToMinutes(existing.endTime);

          if (
            timesOverlap(startMinutes, endMinutes, existingStart, existingEnd)
          ) {
            conflictsWith.push({
              type: "existing",
              title: existing.title,
              startTime: existing.startTime,
              endTime: existing.endTime,
            });
            hasAnyConflicts = true;
          }
        }
      }

      // 6. Check cross-block conflicts (proposed blocks conflicting with each other)
      // Only compare with blocks we've already validated to avoid duplicate conflict reports
      if (!hasFormatError) {
        for (const parsed of parsedProposed) {
          // Skip self and blocks with format errors
          if (parsed.index >= i || parsed.hasFormatError) continue;

          // Only check if on the same date
          if (parsed.block.date !== block.date) continue;

          if (
            timesOverlap(
              startMinutes,
              endMinutes,
              parsed.startMinutes,
              parsed.endMinutes
            )
          ) {
            conflictsWith.push({
              type: "proposed",
              title: parsed.block.title,
              startTime: parsed.block.startTime,
              endTime: parsed.block.endTime,
            });
            hasAnyConflicts = true;
          }
        }
      }

      const isValid = errors.length === 0 && conflictsWith.length === 0;

      blockResults.push({
        index: i,
        valid: isValid,
        errors,
        warnings,
        conflictsWith: conflictsWith.length > 0 ? conflictsWith : undefined,
      });
    }

    // Calculate summary
    const validBlocks = blockResults.filter((r) => r.valid).length;
    const invalidBlocks = blockResults.length - validBlocks;

    return {
      valid: validBlocks === blockResults.length,
      blockResults,
      summary: {
        totalBlocks: blocks.length,
        validBlocks,
        invalidBlocks,
        hasConflicts: hasAnyConflicts,
        hasFormatErrors: hasAnyFormatErrors,
      },
    };
  },
});
