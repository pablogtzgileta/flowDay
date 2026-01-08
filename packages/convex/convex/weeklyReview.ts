import { query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./auth";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { startOfWeek, format, subWeeks, addDays } from "date-fns";
import { timeToMinutes } from "./utils/time";

// ============================================================
// TYPES
// ============================================================

type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type InsightSeverity = "info" | "warning" | "success" | "error";

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

interface WeeklyInsight {
  id: string;
  type: "postponement" | "goal" | "energy" | "pattern" | "achievement";
  severity: InsightSeverity;
  title: string;
  description: string;
  icon: string;
  relatedId?: string;
}

interface WeeklySuggestion {
  id: string;
  type: "move_routine" | "shorten_session" | "change_time" | "adjust_target";
  title: string;
  description: string;
  reasoning: string;
  action: {
    type: string;
    routineId?: string;
    goalId?: string;
    newDayOfWeek?: DayOfWeek;
    newStartTime?: string;
    newDuration?: number;
  };
}

interface GoalWeeklyProgress {
  goalId: string;
  title: string;
  category: string;
  targetMinutes: number;
  completedMinutes: number;
  sessionsCompleted: number;
  percentComplete: number;
  status: "ahead" | "on_track" | "behind" | "complete";
  averageSessionLength: number;
}

interface DayStats {
  day: DayOfWeek;
  label: string;
  totalBlocks: number;
  completedBlocks: number;
  completionRate: number;
  totalMinutes: number;
  completedMinutes: number;
}

interface WeeklyReviewData {
  weekStart: string;
  weekEnd: string;
  stats: {
    totalBlocks: number;
    completedBlocks: number;
    skippedBlocks: number;
    inProgressBlocks: number;
    plannedBlocks: number;
    completionRate: number;
    totalPlannedMinutes: number;
    totalCompletedMinutes: number;
    totalPlannedHours: number;
    totalCompletedHours: number;
    postponedBlocks: number;
    totalPostponements: number;
  };
  dayStats: DayStats[];
  bestDay: { day: DayOfWeek; label: string; completionRate: number } | null;
  worstDay: { day: DayOfWeek; label: string; completionRate: number } | null;
  goalProgress: GoalWeeklyProgress[];
  energyAlignmentScore: number;
}

// ============================================================
// HELPER FUNCTIONS - Extracted for reuse
// ============================================================

function getDayOfWeek(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return days[date.getDay()] ?? "mon";
}

function getWeekStartDate(date: Date): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}

function getWeekEndDate(weekStartDate: string): string {
  const start = new Date(weekStartDate + "T12:00:00");
  const end = addDays(start, 6);
  return format(end, "yyyy-MM-dd");
}

// Initialize empty day stats map
function createEmptyDayStatsMap(): Record<DayOfWeek, DayStats> {
  const days: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const map: Record<DayOfWeek, DayStats> = {} as Record<DayOfWeek, DayStats>;
  for (const day of days) {
    map[day] = {
      day,
      label: day.charAt(0).toUpperCase() + day.slice(1),
      totalBlocks: 0,
      completedBlocks: 0,
      completionRate: 0,
      totalMinutes: 0,
      completedMinutes: 0,
    };
  }
  return map;
}

// Calculate weekly review data from blocks and goals
// This is the core calculation logic used by both public and internal queries
function calculateWeeklyReviewData(
  blocks: Doc<"blocks">[],
  goals: Doc<"goals">[],
  energyProfile: { hourlyLevels: ("high" | "medium" | "low")[] } | undefined,
  weekStart: string,
  weekEnd: string
): WeeklyReviewData {
  // Overall stats
  const totalBlocks = blocks.length;
  const completedBlocks = blocks.filter((b) => b.status === "completed").length;
  const skippedBlocks = blocks.filter((b) => b.status === "skipped").length;
  const inProgressBlocks = blocks.filter((b) => b.status === "in_progress").length;
  const plannedBlocks = blocks.filter((b) => b.status === "planned").length;
  const completionRate = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;

  // Time stats
  let totalPlannedMinutes = 0;
  let totalCompletedMinutes = 0;

  for (const block of blocks) {
    const duration = timeToMinutes(block.endTime) - timeToMinutes(block.startTime);
    totalPlannedMinutes += duration;
    if (block.status === "completed") {
      totalCompletedMinutes += duration;
    }
  }

  // Postponement stats
  const postponedBlocks = blocks.filter((b) => b.timesPostponed > 0);
  const totalPostponements = blocks.reduce((sum, b) => sum + b.timesPostponed, 0);

  // Day stats
  const dayStatsMap = createEmptyDayStatsMap();

  for (const block of blocks) {
    const blockDate = new Date(block.date + "T12:00:00");
    const dayOfWeek = getDayOfWeek(blockDate);
    const duration = timeToMinutes(block.endTime) - timeToMinutes(block.startTime);

    dayStatsMap[dayOfWeek].totalBlocks += 1;
    dayStatsMap[dayOfWeek].totalMinutes += duration;

    if (block.status === "completed") {
      dayStatsMap[dayOfWeek].completedBlocks += 1;
      dayStatsMap[dayOfWeek].completedMinutes += duration;
    }
  }

  // Calculate completion rates
  const dayOrder: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const dayStats: DayStats[] = dayOrder.map((day) => {
    const stats = dayStatsMap[day];
    return {
      ...stats,
      completionRate: stats.totalBlocks > 0
        ? Math.round((stats.completedBlocks / stats.totalBlocks) * 100)
        : 0,
    };
  });

  // Find best and worst days
  const daysWithBlocks = dayStats.filter((d) => d.totalBlocks > 0);
  const bestDay = daysWithBlocks.length > 0
    ? daysWithBlocks.reduce((best, d) => d.completionRate > best.completionRate ? d : best)
    : null;
  const worstDay = daysWithBlocks.length > 0
    ? daysWithBlocks.reduce((worst, d) => d.completionRate < worst.completionRate ? d : worst)
    : null;

  // Goal progress
  const goalProgress: GoalWeeklyProgress[] = goals.map((goal) => {
    const goalBlocks = blocks.filter((b) => b.goalId === goal._id && b.status === "completed");

    let completedMinutes = 0;
    for (const block of goalBlocks) {
      completedMinutes += timeToMinutes(block.endTime) - timeToMinutes(block.startTime);
    }

    const percentComplete = Math.round((completedMinutes / goal.weeklyTargetMinutes) * 100);
    const averageSessionLength = goalBlocks.length > 0
      ? Math.round(completedMinutes / goalBlocks.length)
      : 0;

    // Determine status
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekProgress = dayOfWeek === 0 ? 1 : dayOfWeek / 7;
    const expectedProgress = weekProgress * 100;

    let status: GoalWeeklyProgress["status"] = "on_track";
    if (percentComplete >= 100) {
      status = "complete";
    } else if (percentComplete >= expectedProgress + 10) {
      status = "ahead";
    } else if (percentComplete < expectedProgress - 20) {
      status = "behind";
    }

    return {
      goalId: goal._id,
      title: goal.title,
      category: goal.category,
      targetMinutes: goal.weeklyTargetMinutes,
      completedMinutes,
      sessionsCompleted: goalBlocks.length,
      percentComplete,
      status,
      averageSessionLength,
    };
  });

  // Energy alignment score
  let energyAlignedBlocks = 0;
  let totalHighEnergyBlocks = 0;

  if (energyProfile?.hourlyLevels) {
    for (const block of blocks) {
      if (block.energyLevel === "high") {
        totalHighEnergyBlocks += 1;
        const startHour = parseInt(block.startTime.split(":")[0] ?? "0", 10);
        const userEnergyAtTime = energyProfile.hourlyLevels[startHour];
        if (userEnergyAtTime === "high") {
          energyAlignedBlocks += 1;
        }
      }
    }
  }

  const energyAlignmentScore = totalHighEnergyBlocks > 0
    ? Math.round((energyAlignedBlocks / totalHighEnergyBlocks) * 100)
    : 100;

  return {
    weekStart,
    weekEnd,
    stats: {
      totalBlocks,
      completedBlocks,
      skippedBlocks,
      inProgressBlocks,
      plannedBlocks,
      completionRate,
      totalPlannedMinutes,
      totalCompletedMinutes,
      totalPlannedHours: Math.round((totalPlannedMinutes / 60) * 10) / 10,
      totalCompletedHours: Math.round((totalCompletedMinutes / 60) * 10) / 10,
      postponedBlocks: postponedBlocks.length,
      totalPostponements,
    },
    dayStats,
    bestDay: bestDay ? { day: bestDay.day, label: DAY_LABELS[bestDay.day], completionRate: bestDay.completionRate } : null,
    worstDay: worstDay ? { day: worstDay.day, label: DAY_LABELS[worstDay.day], completionRate: worstDay.completionRate } : null,
    goalProgress,
    energyAlignmentScore,
  };
}

// ============================================================
// QUERIES
// ============================================================

/**
 * Get comprehensive weekly review data for a user.
 */
export const getWeeklyReview = query({
  args: {
    weekStartDate: v.optional(v.string()),
  },
  handler: async (ctx, { weekStartDate }) => {
    const user = await requireAuth(ctx);

    const weekStart = weekStartDate || getWeekStartDate(new Date());
    const weekEnd = getWeekEndDate(weekStart);

    // Optimized: Use index bounds for date range
    const allBlocks = await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).gte("date", weekStart).lte("date", weekEnd)
      )
      .collect();

    const activeGoals = await ctx.db
      .query("goals")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .collect();

    return calculateWeeklyReviewData(
      allBlocks,
      activeGoals,
      user.preferences.energyProfile,
      weekStart,
      weekEnd
    );
  },
});

/**
 * Internal version - used by other queries without auth check.
 */
export const getWeeklyReviewInternal = internalQuery({
  args: {
    userId: v.id("users"),
    weekStartDate: v.optional(v.string()),
  },
  handler: async (ctx, { userId, weekStartDate }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const weekStart = weekStartDate || getWeekStartDate(new Date());
    const weekEnd = getWeekEndDate(weekStart);

    // Optimized: Use index bounds for date range
    const allBlocks = await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", weekStart).lte("date", weekEnd)
      )
      .collect();

    const activeGoals = await ctx.db
      .query("goals")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", userId).eq("isActive", true)
      )
      .collect();

    return calculateWeeklyReviewData(
      allBlocks,
      activeGoals,
      user.preferences.energyProfile,
      weekStart,
      weekEnd
    );
  },
});

/**
 * Get actionable insights based on the week's data.
 */
export const getWeeklyInsights = query({
  args: {
    weekStartDate: v.optional(v.string()),
  },
  handler: async (ctx, { weekStartDate }): Promise<WeeklyInsight[]> => {
    const user = await requireAuth(ctx);
    const insights: WeeklyInsight[] = [];

    const review = await ctx.runQuery(internal.weeklyReview.getWeeklyReviewInternal, {
      userId: user._id,
      weekStartDate,
    });

    if (!review || review.stats.totalBlocks === 0) {
      return [{
        id: "no-data",
        type: "pattern",
        severity: "info",
        title: "No data yet",
        description: "Start scheduling blocks to see insights about your week!",
        icon: "📊",
      }];
    }

    // Achievement: High completion rate
    if (review.stats.completionRate >= 80) {
      insights.push({
        id: "high-completion",
        type: "achievement",
        severity: "success",
        title: "Great week!",
        description: `You completed ${review.stats.completionRate}% of your scheduled blocks. Keep it up!`,
        icon: "🎉",
      });
    }

    // Warning: Low completion rate
    if (review.stats.completionRate < 50 && review.stats.totalBlocks >= 5) {
      insights.push({
        id: "low-completion",
        type: "pattern",
        severity: "warning",
        title: "Completion rate dropped",
        description: `Only ${review.stats.completionRate}% of blocks were completed. Consider scheduling fewer blocks or shorter sessions.`,
        icon: "📉",
      });
    }

    // Worst day pattern
    if (review.worstDay && review.worstDay.completionRate < 50 && review.stats.totalBlocks >= 7) {
      insights.push({
        id: "worst-day",
        type: "pattern",
        severity: "warning",
        title: `${review.worstDay.label}s are tough`,
        description: `Your completion rate on ${review.worstDay.label}s is only ${review.worstDay.completionRate}%. Consider scheduling lighter tasks.`,
        icon: "📅",
      });
    }

    // Best day achievement
    if (review.bestDay && review.bestDay.completionRate >= 90 && review.stats.totalBlocks >= 7) {
      insights.push({
        id: "best-day",
        type: "achievement",
        severity: "success",
        title: `${review.bestDay.label}s are your best`,
        description: `You have a ${review.bestDay.completionRate}% completion rate on ${review.bestDay.label}s. Great for important tasks!`,
        icon: "⭐",
      });
    }

    // High postponement rate
    if (review.stats.totalPostponements >= 5) {
      insights.push({
        id: "high-postponements",
        type: "postponement",
        severity: "warning",
        title: "Frequent rescheduling",
        description: `You postponed tasks ${review.stats.totalPostponements} times this week. Consider more realistic scheduling.`,
        icon: "🔄",
      });
    }

    // Goal-specific insights
    for (const goal of review.goalProgress) {
      if (goal.status === "complete") {
        insights.push({
          id: `goal-complete-${goal.goalId}`,
          type: "goal",
          severity: "success",
          title: `${goal.title} - Goal reached!`,
          description: `You hit your weekly target of ${Math.round(goal.targetMinutes / 60 * 10) / 10}h with ${goal.sessionsCompleted} sessions.`,
          icon: "🎯",
          relatedId: goal.goalId,
        });
      } else if (goal.status === "behind" && goal.percentComplete < 30) {
        insights.push({
          id: `goal-behind-${goal.goalId}`,
          type: "goal",
          severity: "error",
          title: `${goal.title} - Falling behind`,
          description: `Only ${goal.percentComplete}% of your ${Math.round(goal.targetMinutes / 60 * 10) / 10}h target completed. Try scheduling sessions now.`,
          icon: "⚠️",
          relatedId: goal.goalId,
        });
      }

      // Session length insight
      if (goal.sessionsCompleted >= 3 && goal.averageSessionLength > 0) {
        const preferredAvg = goal.targetMinutes / 5;
        if (goal.averageSessionLength < preferredAvg * 0.6) {
          insights.push({
            id: `goal-short-sessions-${goal.goalId}`,
            type: "goal",
            severity: "info",
            title: `${goal.title} - Short sessions`,
            description: `Your average session is ${goal.averageSessionLength} min. Consider longer focused sessions.`,
            icon: "⏱️",
            relatedId: goal.goalId,
          });
        }
      }
    }

    // Energy alignment insight
    if (review.energyAlignmentScore < 50) {
      insights.push({
        id: "energy-misalignment",
        type: "energy",
        severity: "warning",
        title: "Energy timing mismatch",
        description: `Only ${review.energyAlignmentScore}% of high-energy tasks were scheduled at your peak times.`,
        icon: "⚡",
      });
    } else if (review.energyAlignmentScore >= 80) {
      insights.push({
        id: "energy-aligned",
        type: "energy",
        severity: "success",
        title: "Great energy alignment",
        description: `${review.energyAlignmentScore}% of demanding tasks matched your peak energy times!`,
        icon: "💪",
      });
    }

    // Sort by severity
    const severityOrder: Record<InsightSeverity, number> = {
      error: 0,
      warning: 1,
      success: 2,
      info: 3,
    };

    return insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  },
});

/**
 * Get actionable suggestions based on patterns.
 */
export const getSuggestions = query({
  args: {
    weekStartDate: v.optional(v.string()),
  },
  handler: async (ctx, { weekStartDate }): Promise<WeeklySuggestion[]> => {
    const user = await requireAuth(ctx);
    const suggestions: WeeklySuggestion[] = [];

    const patterns = await ctx.runQuery(internal.scheduler.getPostponementPatterns, {
      userId: user._id,
    });

    const routines = await ctx.db
      .query("routines")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const review = await ctx.runQuery(internal.weeklyReview.getWeeklyReviewInternal, {
      userId: user._id,
      weekStartDate,
    });

    if (!review) return suggestions;

    const routineMap = new Map(routines.map((r) => [r._id.toString(), r]));

    // Suggestion: Move frequently postponed routines
    for (const pattern of patterns) {
      if (pattern.totalPostponements < 3) continue;

      const routine = routineMap.get(pattern.routineId);
      if (!routine) continue;

      const currentDay = routine.dayOfWeek;
      const currentDayStats = review.dayStats.find((d) => d.day === currentDay);

      const betterDays = review.dayStats
        .filter((d) => d.day !== currentDay && d.completionRate > (currentDayStats?.completionRate ?? 0) + 10)
        .sort((a, b) => b.completionRate - a.completionRate);

      if (betterDays.length > 0) {
        const suggestedDay = betterDays[0]!;
        suggestions.push({
          id: `move-${pattern.routineId}`,
          type: "move_routine",
          title: `Move "${pattern.title}" to ${DAY_LABELS[suggestedDay.day]}`,
          description: `This routine has been postponed ${pattern.totalPostponements} times from ${DAY_LABELS[currentDay]}s.`,
          reasoning: `Your ${DAY_LABELS[suggestedDay.day]} completion rate is ${suggestedDay.completionRate}% vs ${currentDayStats?.completionRate ?? 0}% on ${DAY_LABELS[currentDay]}s.`,
          action: {
            type: "move_routine",
            routineId: pattern.routineId,
            newDayOfWeek: suggestedDay.day,
          },
        });
      }
    }

    // Suggestion: Adjust goal targets
    for (const goal of review.goalProgress) {
      if (goal.sessionsCompleted >= 3 && goal.percentComplete < 50) {
        const suggestedTarget = Math.ceil(goal.completedMinutes * 1.2);
        if (suggestedTarget < goal.targetMinutes * 0.8) {
          suggestions.push({
            id: `adjust-goal-${goal.goalId}`,
            type: "adjust_target",
            title: `Adjust "${goal.title}" weekly target`,
            description: `You're completing about ${Math.round(goal.completedMinutes / 60 * 10) / 10}h instead of ${Math.round(goal.targetMinutes / 60 * 10) / 10}h weekly.`,
            reasoning: `A more achievable target can build momentum and consistency.`,
            action: {
              type: "adjust_target",
              goalId: goal.goalId,
              newDuration: suggestedTarget,
            },
          });
        }
      }
    }

    // Suggestion: Optimize energy scheduling
    const energyProfile = user.preferences.energyProfile;
    if (review.energyAlignmentScore < 60 && energyProfile?.hourlyLevels) {
      const peakHours = energyProfile.hourlyLevels
        .map((level, hour) => ({ hour, level }))
        .filter((h) => h.level === "high")
        .map((h) => h.hour);

      if (peakHours.length > 0) {
        const peakStart = Math.min(...peakHours);
        const peakEnd = Math.max(...peakHours) + 1;
        suggestions.push({
          id: "energy-scheduling",
          type: "change_time",
          title: "Optimize task timing",
          description: `Schedule demanding tasks between ${peakStart}:00-${peakEnd}:00.`,
          reasoning: `Your peak energy hours are underutilized.`,
          action: {
            type: "change_time",
            newStartTime: `${String(peakStart).padStart(2, "0")}:00`,
          },
        });
      }
    }

    return suggestions.slice(0, 5);
  },
});

/**
 * Get available weeks for the week picker (last 8 weeks).
 */
export const getAvailableWeeks = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const weeks: Array<{ weekStart: string; weekEnd: string; label: string }> = [];

    const now = new Date();

    for (let i = 0; i < 8; i++) {
      const weekDate = subWeeks(now, i);
      const weekStart = getWeekStartDate(weekDate);
      const weekEnd = getWeekEndDate(weekStart);

      let label = "This Week";
      if (i === 1) label = "Last Week";
      else if (i > 1) label = `${i} Weeks Ago`;

      weeks.push({ weekStart, weekEnd, label });
    }

    return weeks;
  },
});

/**
 * Apply a suggestion (returns mutation info for frontend).
 */
export const applySuggestion = query({
  args: {
    suggestionType: v.string(),
    routineId: v.optional(v.id("routines")),
    goalId: v.optional(v.id("goals")),
    newDayOfWeek: v.optional(v.union(
      v.literal("mon"),
      v.literal("tue"),
      v.literal("wed"),
      v.literal("thu"),
      v.literal("fri"),
      v.literal("sat"),
      v.literal("sun")
    )),
    newDuration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return {
      mutationType: args.suggestionType,
      args,
    };
  },
});

/**
 * Get a compact weekly review summary for agent context.
 */
export const getWeeklyReviewSummary = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }): Promise<string> => {
    const review = await ctx.runQuery(internal.weeklyReview.getWeeklyReviewInternal, {
      userId,
    });

    if (!review || review.stats.totalBlocks === 0) {
      return "No weekly review data available yet.";
    }

    const parts: string[] = [];

    parts.push(
      `Week summary: ${review.stats.completionRate}% completion rate (${review.stats.completedBlocks}/${review.stats.totalBlocks} blocks)`
    );
    parts.push(
      `Time: ${review.stats.totalCompletedHours}h completed of ${review.stats.totalPlannedHours}h planned`
    );

    if (review.bestDay) {
      parts.push(`Best day: ${review.bestDay.label} (${review.bestDay.completionRate}%)`);
    }
    if (review.worstDay && review.worstDay.completionRate < 70) {
      parts.push(`Challenging day: ${review.worstDay.label} (${review.worstDay.completionRate}%)`);
    }

    const goalSummaries = review.goalProgress
      .map((g) => `${g.title}: ${g.percentComplete}% (${g.status})`)
      .join(", ");
    if (goalSummaries) {
      parts.push(`Goals: ${goalSummaries}`);
    }

    if (review.energyAlignmentScore < 60) {
      parts.push(`Energy alignment: ${review.energyAlignmentScore}% (needs improvement)`);
    }

    if (review.stats.totalPostponements > 3) {
      parts.push(`Postponed ${review.stats.totalPostponements} times this week`);
    }

    return parts.join(". ");
  },
});
