import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./auth";
import type { Doc, Id } from "./_generated/dataModel";
import { startOfWeek, format } from "date-fns";
import { timeToMinutes } from "./utils/time";

// Category labels for display
export const CATEGORY_LABELS: Record<string, string> = {
  learning: "Learning",
  health: "Health",
  career: "Career",
  personal: "Personal",
  creative: "Creative",
};

// Energy level labels
export const ENERGY_LABELS: Record<string, string> = {
  high: "High Energy",
  medium: "Medium Energy",
  low: "Low Energy",
};

// Time preference labels
export const TIME_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  any: "Any Time",
};

// Get the Monday of the current week (ISO week starts on Monday)
function getCurrentWeekStart(): string {
  const now = new Date();
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}

// Helper to verify goal ownership
async function getGoalWithOwnership(
  ctx: QueryCtx | MutationCtx,
  goalId: Id<"goals">,
  userId: Id<"users">
): Promise<Doc<"goals">> {
  const goal = await ctx.db.get(goalId);
  if (!goal) {
    throw new Error("Goal not found");
  }
  if (goal.userId !== userId) {
    throw new Error("Goal not found");
  }
  return goal;
}

// Calculate weekly progress for a single goal (used for individual goal queries)
async function calculateWeeklyProgress(
  ctx: QueryCtx,
  goalId: Id<"goals">,
  userId: Id<"users">,
  weekStartDate: string
): Promise<{ completedMinutes: number; sessionsCompleted: number }> {
  // Get all completed blocks for this goal in the given week
  const blocks = await ctx.db
    .query("blocks")
    .withIndex("by_goal", (q) => q.eq("goalId", goalId))
    .filter((q) => q.eq(q.field("status"), "completed"))
    .collect();

  // Filter to blocks in this week and owned by user
  const weekEnd = new Date(weekStartDate);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  const weekBlocks = blocks.filter(
    (b) =>
      b.userId === userId &&
      b.date >= weekStartDate &&
      b.date < weekEndStr
  );

  // Calculate total minutes and sessions
  let completedMinutes = 0;
  for (const block of weekBlocks) {
    const startMinutes = timeToMinutes(block.startTime);
    const endMinutes = timeToMinutes(block.endTime);
    completedMinutes += endMinutes - startMinutes;
  }

  return {
    completedMinutes,
    sessionsCompleted: weekBlocks.length,
  };
}

// Batch calculate weekly progress for multiple goals (optimized - single query)
async function calculateWeeklyProgressBatch(
  ctx: QueryCtx,
  goals: Doc<"goals">[],
  userId: Id<"users">,
  weekStartDate: string
): Promise<Map<string, { completedMinutes: number; sessionsCompleted: number }>> {
  // Get week end date
  const weekEnd = new Date(weekStartDate);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  // Single query: Get all completed blocks for the user in this week
  const allWeekBlocks = await ctx.db
    .query("blocks")
    .withIndex("by_user_date", (q) =>
      q.eq("userId", userId).gte("date", weekStartDate).lte("date", weekEndStr)
    )
    .filter((q) => q.eq(q.field("status"), "completed"))
    .collect();

  // Group blocks by goalId
  const blocksByGoal = new Map<string, typeof allWeekBlocks>();
  for (const block of allWeekBlocks) {
    if (block.goalId) {
      const key = block.goalId.toString();
      if (!blocksByGoal.has(key)) {
        blocksByGoal.set(key, []);
      }
      blocksByGoal.get(key)!.push(block);
    }
  }

  // Calculate progress for each goal
  const progressMap = new Map<string, { completedMinutes: number; sessionsCompleted: number }>();

  for (const goal of goals) {
    const goalBlocks = blocksByGoal.get(goal._id.toString()) || [];

    let completedMinutes = 0;
    for (const block of goalBlocks) {
      const startMinutes = timeToMinutes(block.startTime);
      const endMinutes = timeToMinutes(block.endTime);
      completedMinutes += endMinutes - startMinutes;
    }

    progressMap.set(goal._id.toString(), {
      completedMinutes,
      sessionsCompleted: goalBlocks.length,
    });
  }

  return progressMap;
}

// Get all goals for the current user
export const getGoals = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get current week's progress for all goals in a single batch query
    const weekStart = getCurrentWeekStart();
    const progressMap = await calculateWeeklyProgressBatch(ctx, goals, user._id, weekStart);

    // Attach progress to each goal
    const goalsWithProgress = goals.map((goal) => ({
      ...goal,
      weeklyProgress: progressMap.get(goal._id.toString()) ?? {
        completedMinutes: 0,
        sessionsCompleted: 0,
      },
    }));

    // Sort: active first, then by priority
    return goalsWithProgress.sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      return a.priority - b.priority;
    });
  },
});

// Get only active goals
export const getActiveGoals = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .collect();

    // Get current week's progress for all goals in a single batch query
    const weekStart = getCurrentWeekStart();
    const progressMap = await calculateWeeklyProgressBatch(ctx, goals, user._id, weekStart);

    // Attach progress to each goal
    const goalsWithProgress = goals.map((goal) => ({
      ...goal,
      weeklyProgress: progressMap.get(goal._id.toString()) ?? {
        completedMinutes: 0,
        sessionsCompleted: 0,
      },
    }));

    // Sort by priority
    return goalsWithProgress.sort((a, b) => a.priority - b.priority);
  },
});

// Get a single goal by ID with progress stats
export const getGoalById = query({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, { goalId }) => {
    const user = await requireAuth(ctx);
    const goal = await getGoalWithOwnership(ctx, goalId, user._id);

    // Get current week's progress
    const weekStart = getCurrentWeekStart();
    const weeklyProgress = await calculateWeeklyProgress(
      ctx,
      goalId,
      user._id,
      weekStart
    );

    // Get all-time stats
    const allBlocks = await ctx.db
      .query("blocks")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    let totalMinutes = 0;
    for (const block of allBlocks) {
      const startMinutes = timeToMinutes(block.startTime);
      const endMinutes = timeToMinutes(block.endTime);
      totalMinutes += endMinutes - startMinutes;
    }

    // Get recent sessions (last 10)
    const recentSessions = allBlocks
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10)
      .map((block) => ({
        _id: block._id,
        date: block.date,
        title: block.title,
        startTime: block.startTime,
        endTime: block.endTime,
        duration: timeToMinutes(block.endTime) - timeToMinutes(block.startTime),
      }));

    return {
      ...goal,
      weeklyProgress,
      totalMinutes,
      totalSessions: allBlocks.length,
      recentSessions,
    };
  },
});

// Create a new goal
export const createGoal = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    weeklyTargetMinutes: v.number(),
    preferredSessionLength: v.object({
      min: v.number(),
      max: v.number(),
    }),
    preferredTime: v.union(
      v.literal("morning"),
      v.literal("afternoon"),
      v.literal("evening"),
      v.literal("any")
    ),
    energyLevel: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    priority: v.number(),
    category: v.union(
      v.literal("learning"),
      v.literal("health"),
      v.literal("career"),
      v.literal("personal"),
      v.literal("creative")
    ),
    targetDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Validate title
    if (args.title.trim().length === 0) {
      throw new Error("Title cannot be empty");
    }
    if (args.title.length > 100) {
      throw new Error("Title must be 100 characters or less");
    }

    // Validate weekly target
    if (args.weeklyTargetMinutes <= 0) {
      throw new Error("Weekly target must be greater than 0");
    }
    if (args.weeklyTargetMinutes > 10080) {
      // 7 days * 24 hours * 60 min
      throw new Error("Weekly target cannot exceed 168 hours");
    }

    // Validate session length
    if (args.preferredSessionLength.min <= 0) {
      throw new Error("Minimum session length must be greater than 0");
    }
    if (args.preferredSessionLength.max < args.preferredSessionLength.min) {
      throw new Error(
        "Maximum session length must be greater than or equal to minimum"
      );
    }
    if (args.preferredSessionLength.max > 480) {
      // 8 hours max
      throw new Error("Session length cannot exceed 8 hours");
    }

    // Validate priority (1 = highest, 5 = lowest)
    if (args.priority < 1 || args.priority > 5) {
      throw new Error("Priority must be between 1 and 5");
    }

    // Validate target date if provided
    if (args.targetDate !== undefined && args.targetDate < Date.now()) {
      throw new Error("Target date must be in the future");
    }

    const now = Date.now();

    const goalId = await ctx.db.insert("goals", {
      userId: user._id,
      title: args.title.trim(),
      description: args.description?.trim(),
      weeklyTargetMinutes: args.weeklyTargetMinutes,
      preferredSessionLength: args.preferredSessionLength,
      preferredTime: args.preferredTime,
      energyLevel: args.energyLevel,
      priority: args.priority,
      category: args.category,
      targetDate: args.targetDate,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return goalId;
  },
});

// Update an existing goal
export const updateGoal = mutation({
  args: {
    goalId: v.id("goals"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    weeklyTargetMinutes: v.optional(v.number()),
    preferredSessionLength: v.optional(
      v.object({
        min: v.number(),
        max: v.number(),
      })
    ),
    preferredTime: v.optional(
      v.union(
        v.literal("morning"),
        v.literal("afternoon"),
        v.literal("evening"),
        v.literal("any")
      )
    ),
    energyLevel: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
    ),
    priority: v.optional(v.number()),
    category: v.optional(
      v.union(
        v.literal("learning"),
        v.literal("health"),
        v.literal("career"),
        v.literal("personal"),
        v.literal("creative")
      )
    ),
    targetDate: v.optional(v.number()),
  },
  handler: async (ctx, { goalId, ...updates }) => {
    const user = await requireAuth(ctx);
    const goal = await getGoalWithOwnership(ctx, goalId, user._id);

    // Validate title if provided
    if (updates.title !== undefined) {
      if (updates.title.trim().length === 0) {
        throw new Error("Title cannot be empty");
      }
      if (updates.title.length > 100) {
        throw new Error("Title must be 100 characters or less");
      }
    }

    // Validate weekly target if provided
    if (updates.weeklyTargetMinutes !== undefined) {
      if (updates.weeklyTargetMinutes <= 0) {
        throw new Error("Weekly target must be greater than 0");
      }
      if (updates.weeklyTargetMinutes > 10080) {
        throw new Error("Weekly target cannot exceed 168 hours");
      }
    }

    // Validate session length if provided
    if (updates.preferredSessionLength !== undefined) {
      if (updates.preferredSessionLength.min <= 0) {
        throw new Error("Minimum session length must be greater than 0");
      }
      if (
        updates.preferredSessionLength.max < updates.preferredSessionLength.min
      ) {
        throw new Error(
          "Maximum session length must be greater than or equal to minimum"
        );
      }
      if (updates.preferredSessionLength.max > 480) {
        throw new Error("Session length cannot exceed 8 hours");
      }
    }

    // Validate priority if provided (1 = highest, 5 = lowest)
    if (updates.priority !== undefined) {
      if (updates.priority < 1 || updates.priority > 5) {
        throw new Error("Priority must be between 1 and 5");
      }
    }

    // Validate target date if provided
    if (updates.targetDate !== undefined && updates.targetDate < Date.now()) {
      throw new Error("Target date must be in the future");
    }

    // Build update object
    const updateData: Partial<Doc<"goals">> = { updatedAt: Date.now() };

    if (updates.title !== undefined) updateData.title = updates.title.trim();
    if (updates.description !== undefined)
      updateData.description = updates.description?.trim();
    if (updates.weeklyTargetMinutes !== undefined)
      updateData.weeklyTargetMinutes = updates.weeklyTargetMinutes;
    if (updates.preferredSessionLength !== undefined)
      updateData.preferredSessionLength = updates.preferredSessionLength;
    if (updates.preferredTime !== undefined)
      updateData.preferredTime = updates.preferredTime;
    if (updates.energyLevel !== undefined)
      updateData.energyLevel = updates.energyLevel;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.targetDate !== undefined)
      updateData.targetDate = updates.targetDate;

    await ctx.db.patch(goal._id, updateData);

    return goal._id;
  },
});

// Toggle goal active status (archive/reactivate)
export const toggleGoalActive = mutation({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, { goalId }) => {
    const user = await requireAuth(ctx);
    const goal = await getGoalWithOwnership(ctx, goalId, user._id);

    await ctx.db.patch(goal._id, {
      isActive: !goal.isActive,
      updatedAt: Date.now(),
    });

    return { isActive: !goal.isActive };
  },
});

// Delete a goal (and optionally its associated blocks)
export const deleteGoal = mutation({
  args: {
    goalId: v.id("goals"),
    deleteAssociatedBlocks: v.optional(v.boolean()),
  },
  handler: async (ctx, { goalId, deleteAssociatedBlocks }) => {
    const user = await requireAuth(ctx);
    const goal = await getGoalWithOwnership(ctx, goalId, user._id);

    // Handle associated blocks
    const associatedBlocks = await ctx.db
      .query("blocks")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();

    if (deleteAssociatedBlocks) {
      // Delete all associated blocks
      for (const block of associatedBlocks) {
        await ctx.db.delete(block._id);
      }
    } else {
      // Remove goal association from blocks
      for (const block of associatedBlocks) {
        await ctx.db.patch(block._id, {
          goalId: undefined,
          updatedAt: Date.now(),
        });
      }
    }

    // Delete the goal
    await ctx.db.delete(goal._id);

    return { deletedGoalId: goalId };
  },
});

// Get goals progress for agent tool - structured data with on-track status
export const getGoalsProgressForAgent = query({
  args: {
    goalId: v.optional(v.id("goals")),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { goalId, category }) => {
    const user = await requireAuth(ctx);

    // If a specific goalId is provided, get just that goal
    if (goalId) {
      const goal = await ctx.db.get(goalId);
      if (!goal) {
        throw new Error("Goal not found");
      }
      if (goal.userId !== user._id) {
        throw new Error("Goal not found");
      }

      // Get progress for this single goal
      const weekStart = getCurrentWeekStart();
      const progress = await calculateWeeklyProgress(ctx, goalId, user._id, weekStart);

      const percentComplete = Math.round(
        (progress.completedMinutes / goal.weeklyTargetMinutes) * 100
      );

      // Calculate on-track status based on day of week in user timezone
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        timeZone: user.preferences?.timezone || "UTC",
      });
      const dayOfWeek = formatter.format(now);
      const dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayOfWeek);

      // Expected progress: roughly (dayIndex / 7) * 100%
      // Monday = ~14%, Tuesday = ~28%, etc.
      const expectedProgress = Math.round((dayIndex / 7) * 100);
      const isOnTrack = percentComplete >= expectedProgress - 10; // 10% buffer

      return {
        goals: [{
          id: goal._id,
          title: goal.title,
          category: goal.category,
          weeklyTargetMinutes: goal.weeklyTargetMinutes,
          completedMinutes: progress.completedMinutes,
          sessionsCompleted: progress.sessionsCompleted,
          percentComplete,
          isOnTrack,
          isActive: goal.isActive,
          energyLevel: goal.energyLevel,
          preferredTime: goal.preferredTime,
        }],
        count: 1,
      };
    }

    // Get all goals (filtered by category if provided)
    let goals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Filter by category if provided
    if (category) {
      goals = goals.filter((g) => g.category === category);
    }

    // Limit to 10 goals
    goals = goals.slice(0, 10);

    if (goals.length === 0) {
      return {
        goals: [],
        count: 0,
        message: category
          ? `No goals found in the "${category}" category.`
          : "No goals found. Create some goals to track your progress!",
      };
    }

    // Get progress for all goals
    const weekStart = getCurrentWeekStart();
    const progressMap = await calculateWeeklyProgressBatch(ctx, goals, user._id, weekStart);

    // Calculate on-track status based on day of week
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: user.preferences?.timezone || "UTC",
    });
    const dayOfWeek = formatter.format(now);
    const dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayOfWeek);
    const expectedProgress = Math.round((dayIndex / 7) * 100);

    const goalsWithProgress = goals.map((goal) => {
      const progress = progressMap.get(goal._id.toString()) ?? {
        completedMinutes: 0,
        sessionsCompleted: 0,
      };

      const percentComplete = Math.round(
        (progress.completedMinutes / goal.weeklyTargetMinutes) * 100
      );
      const isOnTrack = percentComplete >= expectedProgress - 10;

      return {
        id: goal._id,
        title: goal.title,
        category: goal.category,
        weeklyTargetMinutes: goal.weeklyTargetMinutes,
        completedMinutes: progress.completedMinutes,
        sessionsCompleted: progress.sessionsCompleted,
        percentComplete,
        isOnTrack,
        isActive: goal.isActive,
        energyLevel: goal.energyLevel,
        preferredTime: goal.preferredTime,
      };
    });

    // Sort by priority (active first, then by on-track status)
    goalsWithProgress.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      if (a.isOnTrack !== b.isOnTrack) return a.isOnTrack ? 1 : -1; // Not on track first
      return 0;
    });

    return {
      goals: goalsWithProgress,
      count: goalsWithProgress.length,
    };
  },
});

// Get goals summary for agent context
export const getGoalsSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const activeGoals = await ctx.db
      .query("goals")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .collect();

    if (activeGoals.length === 0) {
      return "No active goals";
    }

    // Get current week's progress for all goals in a single batch query
    const weekStart = getCurrentWeekStart();
    const progressMap = await calculateWeeklyProgressBatch(ctx, activeGoals, user._id, weekStart);

    const summaries = activeGoals.map((goal) => {
      const progress = progressMap.get(goal._id.toString()) ?? {
        completedMinutes: 0,
        sessionsCompleted: 0,
      };

      const targetHours = Math.round(goal.weeklyTargetMinutes / 60 * 10) / 10;
      const completedHours = Math.round(progress.completedMinutes / 60 * 10) / 10;
      const percentComplete = Math.round(
        (progress.completedMinutes / goal.weeklyTargetMinutes) * 100
      );

      let status = "on track";
      if (percentComplete >= 100) {
        status = "complete";
      } else if (percentComplete < 50 && new Date().getDay() >= 4) {
        // Less than 50% done by Thursday
        status = "behind";
      }

      return `${goal.title} (${goal.category}): ${completedHours}/${targetHours}h this week (${percentComplete}%, ${status}), prefers ${goal.preferredTime}, ${goal.energyLevel} energy`;
    });

    return summaries.join("; ");
  },
});
