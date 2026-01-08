import {
  internalMutation,
  internalQuery,
  internalAction,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { timeToMinutes } from "./utils/time";

// Day of week type
type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

// Convert Date to day of week string
function getDayOfWeek(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return days[date.getDay()] ?? "mon";
}

// Get date string in YYYY-MM-DD format
function getDateString(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

// Get date string for a specific timezone
function getDateStringForTimezone(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  } catch {
    // Fallback to UTC
    return getDateString(new Date());
  }
}

// Get current hour in a specific timezone
function getCurrentHourForTimezone(timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    return parseInt(formatter.format(new Date()), 10);
  } catch {
    return new Date().getUTCHours();
  }
}

// Get day of week for a specific timezone
function getDayOfWeekForTimezone(timezone: string): DayOfWeek {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    });
    const dayStr = formatter.format(new Date()).toLowerCase().slice(0, 3);
    const dayMap: Record<string, DayOfWeek> = {
      sun: "sun",
      mon: "mon",
      tue: "tue",
      wed: "wed",
      thu: "thu",
      fri: "fri",
      sat: "sat",
    };
    return dayMap[dayStr] || "mon";
  } catch {
    return getDayOfWeek(new Date());
  }
}

/**
 * Get the UTC timestamp for a given date/time in a specific timezone.
 * This correctly handles timezone offsets including DST.
 */
function getTimestampForTimezone(
  dateStr: string,
  timeStr: string,
  timezone: string
): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);

  // Create a date object in UTC with the target time
  // We'll adjust for timezone offset
  const targetDate = new Date(
    Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0, 0)
  );

  // Get what time it would be in the target timezone at this UTC time
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Parse the formatted date to get the offset
  const parts = formatter.formatToParts(targetDate);
  const tzHour = parseInt(
    parts.find((p) => p.type === "hour")?.value ?? "0",
    10
  );
  const tzMinute = parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10
  );

  // Calculate the offset in minutes
  const utcMinutes = (hours ?? 0) * 60 + (minutes ?? 0);
  const tzMinutes = tzHour * 60 + tzMinute;
  let offsetMinutes = tzMinutes - utcMinutes;

  // Handle day boundary crossings
  if (offsetMinutes > 720) offsetMinutes -= 1440; // Crossed into next day
  if (offsetMinutes < -720) offsetMinutes += 1440; // Crossed into prev day

  // Adjust the timestamp by the offset to get correct UTC time
  // When timezone is ahead of UTC (positive offset), we need to subtract
  // When timezone is behind UTC (negative offset), we need to add
  return targetDate.getTime() - offsetMinutes * 60 * 1000;
}

/**
 * Get the hour and minute in a specific timezone for a given UTC timestamp.
 */
function getTimeInTimezone(
  timestampMs: number,
  timezone: string
): { hours: number; minutes: number } {
  const date = new Date(timestampMs);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hours = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minutes = parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10
  );

  return { hours, minutes };
}

// Calculate notifyAt timestamp for a block
function calculateNotifyAt(params: {
  date: string;
  startTime: string;
  prepBuffer: number;
  estimatedTravelTime?: number;
  sleepTime: string;
  wakeTime: string;
  timezone: string;
}): number | undefined {
  const {
    date,
    startTime,
    prepBuffer,
    estimatedTravelTime,
    sleepTime,
    wakeTime,
    timezone,
  } = params;

  // Parse start time into a UTC timestamp, respecting user's timezone
  const blockStartMs = getTimestampForTimezone(date, startTime, timezone);

  // Calculate notification time
  let notifyMinutesBefore = prepBuffer + 5; // 5 min default buffer
  if (estimatedTravelTime) {
    notifyMinutesBefore += estimatedTravelTime;
  }

  const notifyAtMs = blockStartMs - notifyMinutesBefore * 60 * 1000;

  // Check quiet hours in user's timezone
  const { hours: notifyHour, minutes: notifyMin } = getTimeInTimezone(
    notifyAtMs,
    timezone
  );
  const notifyMinutes = notifyHour * 60 + notifyMin;
  const sleepMinutes = timeToMinutes(sleepTime);
  const wakeMinutes = timeToMinutes(wakeTime);

  let isQuietHours = false;
  if (sleepMinutes > wakeMinutes) {
    // Overnight case (e.g., sleep 23:00, wake 07:00)
    isQuietHours = notifyMinutes >= sleepMinutes || notifyMinutes < wakeMinutes;
  } else {
    isQuietHours = notifyMinutes >= sleepMinutes && notifyMinutes < wakeMinutes;
  }

  if (isQuietHours || notifyAtMs <= Date.now()) {
    return undefined;
  }

  return notifyAtMs;
}

// ============================================================
// DAILY ROUTINE POPULATION
// ============================================================

/**
 * Populate blocks from routines for users.
 * Runs every 2 hours and checks which users need their routines populated
 * based on their timezone (between 5am-7am local time).
 */
export const populateDailyRoutines = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all users who have completed onboarding
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("onboardingCompleted"), true))
      .collect();

    let blocksCreated = 0;

    for (const user of users) {
      const timezone = user.preferences.timezone || "UTC";
      const currentHour = getCurrentHourForTimezone(timezone);

      // Only process users during their morning window (5am-7am local time)
      if (currentHour < 5 || currentHour > 7) {
        continue;
      }

      // Get today's date and day of week for this user's timezone
      const todayStr = getDateStringForTimezone(timezone);
      const todayDayOfWeek = getDayOfWeekForTimezone(timezone);

      // Get user's routines for today
      const routines = await ctx.db
        .query("routines")
        .withIndex("by_user_day", (q) =>
          q.eq("userId", user._id).eq("dayOfWeek", todayDayOfWeek)
        )
        .collect();

      if (routines.length === 0) continue;

      // Get existing blocks for today
      const existingBlocks = await ctx.db
        .query("blocks")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", user._id).eq("date", todayStr)
        )
        .collect();

      // Create a set of existing routineIds for today
      const existingRoutineIds = new Set(
        existingBlocks
          .filter((b) => b.routineId)
          .map((b) => b.routineId!.toString())
      );

      // Create blocks for routines that don't exist yet
      for (const routine of routines) {
        // Skip if block already exists for this routine today
        if (existingRoutineIds.has(routine._id.toString())) {
          continue;
        }

        // Calculate prepBuffer based on travel
        let prepBuffer = 0;
        let estimatedTravelTime: number | undefined;

        if (routine.locationId) {
          // Get user's home/default location for travel time
          const homeLocation = await ctx.db
            .query("locations")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .filter((q) => q.eq(q.field("isDefault"), true))
            .first();

          if (homeLocation && homeLocation._id !== routine.locationId) {
            // Check travel time cache
            const cachedTravelTime = await ctx.db
              .query("travelTimeCache")
              .withIndex("by_locations", (q) =>
                q
                  .eq("fromLocationId", homeLocation._id)
                  .eq("toLocationId", routine.locationId!)
              )
              .first();

            if (cachedTravelTime) {
              const cacheAge = Date.now() - cachedTravelTime.calculatedAt;
              const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

              if (cacheAge < CACHE_TTL_MS) {
                estimatedTravelTime = cachedTravelTime.travelTimeMinutes;
                prepBuffer =
                  cachedTravelTime.trafficCondition === "heavy"
                    ? 15
                    : cachedTravelTime.trafficCondition === "moderate"
                      ? 10
                      : 5;
              }
            }
          }

          // Default prep buffer for travel if no cache
          if (estimatedTravelTime === undefined) {
            prepBuffer = 10;
          }
        }

        // Calculate notifyAt
        const notifyAt = calculateNotifyAt({
          date: todayStr,
          startTime: routine.startTime,
          prepBuffer,
          estimatedTravelTime,
          sleepTime: user.preferences.sleepTime,
          wakeTime: user.preferences.wakeTime,
          timezone,
        });

        const now = Date.now();

        await ctx.db.insert("blocks", {
          userId: user._id,
          date: todayStr,
          startTime: routine.startTime,
          endTime: routine.endTime,
          title: routine.label,
          source: "routine",
          status: "planned",
          requiresTravel: !!routine.locationId,
          locationId: routine.locationId,
          estimatedTravelTime,
          prepBuffer,
          routineId: routine._id,
          energyLevel: routine.energyLevel,
          notifyAt,
          timesPostponed: 0,
          createdAt: now,
          updatedAt: now,
        });

        blocksCreated++;
      }
    }

    return { blocksCreated };
  },
});

// ============================================================
// ROLLOVER HANDLING
// ============================================================

/**
 * Process rollover for incomplete tasks from previous days.
 * Runs every 2 hours and checks each user's local time to ensure
 * processing happens during their early morning (2-4 AM local time).
 */
export const processRollover = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("onboardingCompleted"), true))
      .collect();

    let skipped = 0;
    let rolledOver = 0;
    let markedForAgent = 0;

    for (const user of users) {
      const timezone = user.preferences.timezone || "UTC";
      const currentHour = getCurrentHourForTimezone(timezone);

      // Only process users during their early morning window (2-4 AM local time)
      if (currentHour < 2 || currentHour >= 4) {
        continue;
      }

      const todayStr = getDateStringForTimezone(timezone);

      // Get rollover behavior (default to rollover_once)
      const rolloverBehavior =
        user.preferences.rolloverBehavior || "rollover_once";

      // Find all planned blocks from past dates
      const staleBlocks = await ctx.db
        .query("blocks")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) =>
          q.and(
            q.lt(q.field("date"), todayStr),
            q.eq(q.field("status"), "planned")
          )
        )
        .collect();

      for (const block of staleBlocks) {
        const now = Date.now();

        switch (rolloverBehavior) {
          case "auto_skip":
            // Simply mark as skipped
            await ctx.db.patch(block._id, {
              status: "skipped",
              updatedAt: now,
            });
            skipped++;
            break;

          case "rollover_once":
            // Rollover to today if not already postponed
            if (block.timesPostponed < 1) {
              // Calculate new notifyAt for today
              const notifyAt = calculateNotifyAt({
                date: todayStr,
                startTime: block.startTime,
                prepBuffer: block.prepBuffer,
                estimatedTravelTime: block.estimatedTravelTime,
                sleepTime: user.preferences.sleepTime,
                wakeTime: user.preferences.wakeTime,
                timezone,
              });

              await ctx.db.patch(block._id, {
                date: todayStr,
                originalDate: block.originalDate || block.date,
                timesPostponed: block.timesPostponed + 1,
                notifyAt,
                notificationId: undefined, // Clear for re-scheduling
                updatedAt: now,
              });
              rolledOver++;
            } else {
              // Already postponed once, mark as skipped
              await ctx.db.patch(block._id, {
                status: "skipped",
                updatedAt: now,
              });
              skipped++;
            }
            break;

          case "prompt_agent":
            // Mark for agent review by adding a description note
            // The agent context will pick up stale blocks and suggest actions
            if (!block.description?.includes("[NEEDS_REVIEW]")) {
              await ctx.db.patch(block._id, {
                description: `${block.description || ""} [NEEDS_REVIEW]`.trim(),
                updatedAt: now,
              });
              markedForAgent++;
            }
            break;
        }
      }
    }

    return { skipped, rolledOver, markedForAgent };
  },
});

// ============================================================
// NOTIFICATION SCHEDULING
// ============================================================

/**
 * Get blocks that need push notifications within the next interval.
 * Called by sendScheduledNotifications action.
 */
export const getBlocksNeedingNotifications = internalQuery({
  args: {
    intervalMinutes: v.number(), // How far ahead to look (e.g., 15 minutes)
  },
  handler: async (ctx, { intervalMinutes }) => {
    const now = Date.now();
    const windowEnd = now + intervalMinutes * 60 * 1000;

    // Get all blocks with notifyAt in the window using index bounds for efficiency
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_notify_time", (q) =>
        q.gte("notifyAt", now).lt("notifyAt", windowEnd)
      )
      .filter((q) => q.eq(q.field("status"), "planned"))
      .collect();

    // Filter out blocks that already have a push notification ID (starts with "push-")
    const blocksToNotify = blocks.filter(
      (b) => !b.notificationId?.startsWith("push-")
    );

    // Get user info for each block
    const result: Array<{
      block: Doc<"blocks">;
      user: Doc<"users">;
    }> = [];

    for (const block of blocksToNotify) {
      const user = await ctx.db.get(block.userId);
      if (user && user.expoPushToken) {
        result.push({ block, user });
      }
    }

    return result;
  },
});

/**
 * Mark a block as having been sent a push notification.
 */
export const markPushNotificationSent = internalMutation({
  args: {
    blockId: v.id("blocks"),
    pushReceiptId: v.string(),
  },
  handler: async (ctx, { blockId, pushReceiptId }) => {
    await ctx.db.patch(blockId, {
      notificationId: `push-${pushReceiptId}`,
      updatedAt: Date.now(),
    });
  },
});

// ============================================================
// HELPER QUERIES
// ============================================================

/**
 * Get stale blocks (planned blocks from past dates) for agent context.
 */
export const getStaleBlocksForUser = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return [];

    const timezone = user.preferences.timezone || "UTC";
    const todayStr = getDateStringForTimezone(timezone);

    return ctx.db
      .query("blocks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.lt(q.field("date"), todayStr),
          q.eq(q.field("status"), "planned")
        )
      )
      .collect();
  },
});

/**
 * Get users with push tokens for a specific notification window.
 */
export const getUsersWithPushTokens = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("onboardingCompleted"), true),
          q.neq(q.field("expoPushToken"), undefined)
        )
      )
      .collect();

    return users.filter((u) => u.expoPushToken);
  },
});

// ============================================================
// PATTERN DETECTION
// ============================================================

interface PostponementPattern {
  routineId: string;
  title: string;
  totalPostponements: number;
  occurrences: number; // How many blocks were postponed
  averagePostponementsPerBlock: number;
}

/**
 * Detect patterns in postponed tasks for a user.
 * Returns routines that have been frequently postponed in the last 30 days.
 * Optimized with limit to prevent scanning too many blocks.
 */
export const getPostponementPatterns = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()), // Default 200, max blocks to scan
  },
  handler: async (ctx, { userId, limit = 200 }): Promise<PostponementPattern[]> => {
    // Get date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split("T")[0] ?? "";

    // Get blocks with postponements from the last 30 days
    // Use index bounds for date range and limit results
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", cutoffDate)
      )
      .filter((q) => q.gt(q.field("timesPostponed"), 0))
      .take(limit);

    // Aggregate by routineId
    const patternMap = new Map<
      string,
      { routineId: string; title: string; totalPostponements: number; occurrences: number }
    >();

    for (const block of blocks) {
      if (!block.routineId) continue;

      const key = block.routineId.toString();
      const existing = patternMap.get(key);

      if (existing) {
        existing.totalPostponements += block.timesPostponed;
        existing.occurrences += 1;
      } else {
        patternMap.set(key, {
          routineId: key,
          title: block.title,
          totalPostponements: block.timesPostponed,
          occurrences: 1,
        });
      }
    }

    // Convert to array and calculate averages
    const patterns: PostponementPattern[] = Array.from(patternMap.values())
      .map((p) => ({
        ...p,
        averagePostponementsPerBlock: p.totalPostponements / p.occurrences,
      }))
      .filter((p) => p.totalPostponements >= 3) // Only significant patterns
      .sort((a, b) => b.totalPostponements - a.totalPostponements);

    return patterns;
  },
});

/**
 * Get postponement insights for the agent context.
 * Returns human-readable insights about frequently postponed tasks.
 */
export const getPostponementInsights = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }): Promise<string[]> => {
    const patterns = await ctx.runQuery(
      internal.scheduler.getPostponementPatterns,
      { userId }
    );

    const insights: string[] = [];

    for (const pattern of patterns) {
      if (pattern.totalPostponements >= 5) {
        insights.push(
          `"${pattern.title}" has been postponed ${pattern.totalPostponements} times across ${pattern.occurrences} scheduled sessions. Consider rescheduling to a more suitable time or breaking it into smaller tasks.`
        );
      } else if (pattern.averagePostponementsPerBlock >= 2) {
        insights.push(
          `"${pattern.title}" is frequently postponed multiple times per session (avg ${pattern.averagePostponementsPerBlock.toFixed(1)}x). This routine might need adjustment.`
        );
      } else {
        insights.push(
          `"${pattern.title}" was postponed ${pattern.totalPostponements} times recently.`
        );
      }
    }

    return insights;
  },
});

/**
 * Get weekly postponement summary for a user.
 * Useful for weekly review feature.
 * Optimized with index bounds for date range.
 */
export const getWeeklyPostponementSummary = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    // Get date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString().split("T")[0] ?? "";

    // Get all blocks from the last 7 days using index bounds
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", cutoffDate)
      )
      .collect();

    const totalBlocks = blocks.length;
    const postponedBlocks = blocks.filter((b) => b.timesPostponed > 0).length;
    const skippedBlocks = blocks.filter((b) => b.status === "skipped").length;
    const completedBlocks = blocks.filter((b) => b.status === "completed").length;
    const totalPostponements = blocks.reduce(
      (sum, b) => sum + b.timesPostponed,
      0
    );

    // Group postponements by day of week
    const postponementsByDay: Record<DayOfWeek, number> = {
      mon: 0,
      tue: 0,
      wed: 0,
      thu: 0,
      fri: 0,
      sat: 0,
      sun: 0,
    };

    for (const block of blocks) {
      if (block.timesPostponed > 0) {
        const blockDate = new Date(block.date);
        const dayOfWeek = getDayOfWeek(blockDate);
        postponementsByDay[dayOfWeek] += block.timesPostponed;
      }
    }

    // Find the day with most postponements
    let worstDay: DayOfWeek | null = null;
    let worstDayCount = 0;
    for (const [day, count] of Object.entries(postponementsByDay)) {
      if (count > worstDayCount) {
        worstDay = day as DayOfWeek;
        worstDayCount = count;
      }
    }

    return {
      totalBlocks,
      completedBlocks,
      skippedBlocks,
      postponedBlocks,
      totalPostponements,
      completionRate:
        totalBlocks > 0
          ? Math.round((completedBlocks / totalBlocks) * 100)
          : 0,
      postponementsByDay,
      worstDay,
      worstDayCount,
    };
  },
});
