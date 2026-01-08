import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./auth";
import type { Doc, Id } from "./_generated/dataModel";
import { timeToMinutes } from "./utils/time";

// Day of week type
type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

// Validate time format (HH:MM)
function validateTimeFormat(time: string): boolean {
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
}

// Get all routines for the current user
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const routines = await ctx.db
      .query("routines")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Sort by day of week, then by start time
    const dayOrder: Record<DayOfWeek, number> = {
      mon: 0,
      tue: 1,
      wed: 2,
      thu: 3,
      fri: 4,
      sat: 5,
      sun: 6,
    };

    return routines.sort((a, b) => {
      const dayDiff = dayOrder[a.dayOfWeek] - dayOrder[b.dayOfWeek];
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });
  },
});

// Get routines for a specific day of week
export const getByDay = query({
  args: {
    dayOfWeek: v.union(
      v.literal("mon"),
      v.literal("tue"),
      v.literal("wed"),
      v.literal("thu"),
      v.literal("fri"),
      v.literal("sat"),
      v.literal("sun")
    ),
  },
  handler: async (ctx, { dayOfWeek }) => {
    const user = await requireAuth(ctx);

    const routines = await ctx.db
      .query("routines")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", user._id).eq("dayOfWeek", dayOfWeek)
      )
      .collect();

    return routines.sort((a, b) => a.startTime.localeCompare(b.startTime));
  },
});

// Get a single routine by ID
export const getById = query({
  args: {
    routineId: v.id("routines"),
  },
  handler: async (ctx, { routineId }) => {
    const user = await requireAuth(ctx);

    const routine = await ctx.db.get(routineId);

    if (!routine || routine.userId !== user._id) {
      return null;
    }

    return routine;
  },
});

// Create a new routine
export const create = mutation({
  args: {
    dayOfWeek: v.union(
      v.literal("mon"),
      v.literal("tue"),
      v.literal("wed"),
      v.literal("thu"),
      v.literal("fri"),
      v.literal("sat"),
      v.literal("sun")
    ),
    startTime: v.string(),
    endTime: v.string(),
    label: v.string(),
    locationId: v.optional(v.id("locations")),
    flexibility: v.union(
      v.literal("fixed"),
      v.literal("semi-flexible"),
      v.literal("free")
    ),
    isRecurring: v.boolean(),
    color: v.optional(v.string()),
    energyLevel: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Validate time format
    if (!validateTimeFormat(args.startTime)) {
      throw new Error("Invalid start time format. Use HH:MM (24-hour)");
    }
    if (!validateTimeFormat(args.endTime)) {
      throw new Error("Invalid end time format. Use HH:MM (24-hour)");
    }

    // Validate time order
    const startMinutes = timeToMinutes(args.startTime);
    const endMinutes = timeToMinutes(args.endTime);

    if (startMinutes >= endMinutes) {
      throw new Error("End time must be after start time");
    }

    // Validate label
    if (args.label.trim().length === 0) {
      throw new Error("Label cannot be empty");
    }
    if (args.label.length > 100) {
      throw new Error("Label must be 100 characters or less");
    }

    // Validate location if provided
    if (args.locationId) {
      const location = await ctx.db.get(args.locationId);
      if (!location || location.userId !== user._id) {
        throw new Error("Location not found");
      }
    }

    // Check for overlapping routines on the same day
    const existingRoutines = await ctx.db
      .query("routines")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", user._id).eq("dayOfWeek", args.dayOfWeek)
      )
      .collect();

    for (const routine of existingRoutines) {
      const routineStart = timeToMinutes(routine.startTime);
      const routineEnd = timeToMinutes(routine.endTime);

      if (startMinutes < routineEnd && endMinutes > routineStart) {
        throw new Error(
          `Conflicts with "${routine.label}" (${routine.startTime}-${routine.endTime})`
        );
      }
    }

    const now = Date.now();

    const routineId = await ctx.db.insert("routines", {
      userId: user._id,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
      label: args.label.trim(),
      locationId: args.locationId,
      flexibility: args.flexibility,
      isRecurring: args.isRecurring,
      color: args.color,
      energyLevel: args.energyLevel,
      createdAt: now,
      updatedAt: now,
    });

    return routineId;
  },
});

// Update an existing routine
export const update = mutation({
  args: {
    routineId: v.id("routines"),
    dayOfWeek: v.optional(
      v.union(
        v.literal("mon"),
        v.literal("tue"),
        v.literal("wed"),
        v.literal("thu"),
        v.literal("fri"),
        v.literal("sat"),
        v.literal("sun")
      )
    ),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    label: v.optional(v.string()),
    locationId: v.optional(v.id("locations")),
    flexibility: v.optional(
      v.union(
        v.literal("fixed"),
        v.literal("semi-flexible"),
        v.literal("free")
      )
    ),
    isRecurring: v.optional(v.boolean()),
    color: v.optional(v.string()),
    energyLevel: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
    ),
  },
  handler: async (ctx, { routineId, ...updates }) => {
    const user = await requireAuth(ctx);

    const routine = await ctx.db.get(routineId);
    if (!routine || routine.userId !== user._id) {
      throw new Error("Routine not found");
    }

    // Validate time format if provided
    if (updates.startTime && !validateTimeFormat(updates.startTime)) {
      throw new Error("Invalid start time format. Use HH:MM (24-hour)");
    }
    if (updates.endTime && !validateTimeFormat(updates.endTime)) {
      throw new Error("Invalid end time format. Use HH:MM (24-hour)");
    }

    // Calculate effective times
    const newStartTime = updates.startTime || routine.startTime;
    const newEndTime = updates.endTime || routine.endTime;
    const newDayOfWeek = updates.dayOfWeek || routine.dayOfWeek;

    // Validate time order
    const startMinutes = timeToMinutes(newStartTime);
    const endMinutes = timeToMinutes(newEndTime);

    if (startMinutes >= endMinutes) {
      throw new Error("End time must be after start time");
    }

    // Validate label if provided
    if (updates.label !== undefined) {
      if (updates.label.trim().length === 0) {
        throw new Error("Label cannot be empty");
      }
      if (updates.label.length > 100) {
        throw new Error("Label must be 100 characters or less");
      }
    }

    // Validate location if provided
    if (updates.locationId) {
      const location = await ctx.db.get(updates.locationId);
      if (!location || location.userId !== user._id) {
        throw new Error("Location not found");
      }
    }

    // Check for overlapping routines if time or day changed
    if (updates.startTime || updates.endTime || updates.dayOfWeek) {
      const existingRoutines = await ctx.db
        .query("routines")
        .withIndex("by_user_day", (q) =>
          q.eq("userId", user._id).eq("dayOfWeek", newDayOfWeek)
        )
        .collect();

      for (const otherRoutine of existingRoutines) {
        if (otherRoutine._id === routineId) continue; // Skip self

        const routineStart = timeToMinutes(otherRoutine.startTime);
        const routineEnd = timeToMinutes(otherRoutine.endTime);

        if (startMinutes < routineEnd && endMinutes > routineStart) {
          throw new Error(
            `Conflicts with "${otherRoutine.label}" (${otherRoutine.startTime}-${otherRoutine.endTime})`
          );
        }
      }
    }

    // Build update object
    interface RoutineUpdate {
      updatedAt: number;
      dayOfWeek?: DayOfWeek;
      startTime?: string;
      endTime?: string;
      label?: string;
      locationId?: Id<"locations">;
      flexibility?: "fixed" | "semi-flexible" | "free";
      isRecurring?: boolean;
      color?: string;
      energyLevel?: "high" | "medium" | "low";
    }

    const updateData: RoutineUpdate = { updatedAt: Date.now() };

    if (updates.dayOfWeek !== undefined) updateData.dayOfWeek = updates.dayOfWeek;
    if (updates.startTime !== undefined) updateData.startTime = updates.startTime;
    if (updates.endTime !== undefined) updateData.endTime = updates.endTime;
    if (updates.label !== undefined) updateData.label = updates.label.trim();
    if (updates.locationId !== undefined) updateData.locationId = updates.locationId;
    if (updates.flexibility !== undefined) updateData.flexibility = updates.flexibility;
    if (updates.isRecurring !== undefined) updateData.isRecurring = updates.isRecurring;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.energyLevel !== undefined) updateData.energyLevel = updates.energyLevel;

    await ctx.db.patch(routineId, updateData);

    return routineId;
  },
});

// Delete a routine
export const deleteRoutine = mutation({
  args: {
    routineId: v.id("routines"),
    deleteFutureBlocks: v.optional(v.boolean()),
  },
  handler: async (ctx, { routineId, deleteFutureBlocks }) => {
    const user = await requireAuth(ctx);

    const routine = await ctx.db.get(routineId);
    if (!routine || routine.userId !== user._id) {
      throw new Error("Routine not found");
    }

    // Optionally delete future blocks generated from this routine
    if (deleteFutureBlocks) {
      const today = new Date().toISOString().split("T")[0] ?? "";

      const futureBlocks = await ctx.db
        .query("blocks")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      // Filter in JS since routineId might be undefined
      const blocksToDelete = futureBlocks.filter(
        (b) =>
          b.routineId === routineId &&
          b.date >= today &&
          b.status === "planned"
      );

      for (const block of blocksToDelete) {
        await ctx.db.delete(block._id);
      }
    }

    await ctx.db.delete(routineId);

    return { deletedRoutineId: routineId };
  },
});

// Duplicate a routine to another day
export const duplicateToDay = mutation({
  args: {
    routineId: v.id("routines"),
    targetDay: v.union(
      v.literal("mon"),
      v.literal("tue"),
      v.literal("wed"),
      v.literal("thu"),
      v.literal("fri"),
      v.literal("sat"),
      v.literal("sun")
    ),
  },
  handler: async (ctx, { routineId, targetDay }) => {
    const user = await requireAuth(ctx);

    const routine = await ctx.db.get(routineId);
    if (!routine || routine.userId !== user._id) {
      throw new Error("Routine not found");
    }

    // Check for overlapping routines on the target day
    const existingRoutines = await ctx.db
      .query("routines")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", user._id).eq("dayOfWeek", targetDay)
      )
      .collect();

    const startMinutes = timeToMinutes(routine.startTime);
    const endMinutes = timeToMinutes(routine.endTime);

    for (const existing of existingRoutines) {
      const existingStart = timeToMinutes(existing.startTime);
      const existingEnd = timeToMinutes(existing.endTime);

      if (startMinutes < existingEnd && endMinutes > existingStart) {
        throw new Error(
          `Conflicts with "${existing.label}" (${existing.startTime}-${existing.endTime}) on ${targetDay}`
        );
      }
    }

    const now = Date.now();

    const newRoutineId = await ctx.db.insert("routines", {
      userId: user._id,
      dayOfWeek: targetDay,
      startTime: routine.startTime,
      endTime: routine.endTime,
      label: routine.label,
      locationId: routine.locationId,
      flexibility: routine.flexibility,
      isRecurring: routine.isRecurring,
      color: routine.color,
      energyLevel: routine.energyLevel,
      createdAt: now,
      updatedAt: now,
    });

    return newRoutineId;
  },
});
