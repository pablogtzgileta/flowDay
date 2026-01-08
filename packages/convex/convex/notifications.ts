import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

// Expo Push API endpoint
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Notification interval in minutes (how far ahead to look)
const NOTIFICATION_INTERVAL_MINUTES = 15;

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  categoryId?: string;
  priority?: "default" | "normal" | "high";
  ttl?: number;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

/**
 * Format notification body based on block details.
 */
function formatNotificationBody(block: Doc<"blocks">): string {
  const { startTime, requiresTravel, estimatedTravelTime, prepBuffer } = block;

  if (requiresTravel && estimatedTravelTime) {
    const totalTime = estimatedTravelTime + prepBuffer;
    return `Starts at ${startTime}. Leave in ${totalTime} minutes (${estimatedTravelTime} min travel + ${prepBuffer} min prep).`;
  }

  if (prepBuffer > 0) {
    return `Starts at ${startTime}. ${prepBuffer} minutes to prepare.`;
  }

  return `Starts at ${startTime}.`;
}

/**
 * Send push notifications for blocks with upcoming notifyAt times.
 * This action is called by a cron job every 15 minutes.
 */
export const sendScheduledNotifications = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get blocks that need notifications
    const blocksToNotify = await ctx.runQuery(
      internal.scheduler.getBlocksNeedingNotifications,
      { intervalMinutes: NOTIFICATION_INTERVAL_MINUTES }
    );

    if (blocksToNotify.length === 0) {
      return { sent: 0, failed: 0 };
    }

    // Prepare push messages
    const messages: ExpoPushMessage[] = blocksToNotify.map((item: { block: Doc<"blocks">; user: Doc<"users"> }) => {
      const { block, user } = item;
      const categoryId = block.requiresTravel
        ? "TRAVEL_REMINDER"
        : "TASK_REMINDER";
      const channelId = block.requiresTravel ? "travel" : "default";

      return {
        to: user.expoPushToken!,
        title: block.title,
        body: formatNotificationBody(block),
        data: { blockId: block._id },
        sound: "default" as const,
        channelId,
        categoryId,
        priority: "high" as const,
        ttl: 3600, // 1 hour TTL
      };
    });

    // Send to Expo Push API in batches of 100
    const BATCH_SIZE = 100;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const batchBlocks = blocksToNotify.slice(i, i + BATCH_SIZE);

      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(batch),
        });

        if (!response.ok) {
          console.error(
            `[Notifications] Expo API error: ${response.status} ${response.statusText}`
          );
          failed += batch.length;
          continue;
        }

        const result = (await response.json()) as { data?: ExpoPushTicket[] };
        const tickets: ExpoPushTicket[] = result.data ?? [];

        // Process each ticket
        for (let j = 0; j < tickets.length; j++) {
          const ticket = tickets[j];
          const batchItem = batchBlocks[j];

          if (!ticket || !batchItem) continue;

          const { block } = batchItem;

          if (ticket.status === "ok" && ticket.id) {
            // Mark as sent
            await ctx.runMutation(internal.scheduler.markPushNotificationSent, {
              blockId: block._id,
              pushReceiptId: ticket.id,
            });
            sent++;
          } else {
            console.error(
              `[Notifications] Failed to send to block ${block._id}:`,
              ticket.message ?? ticket.details?.error
            );
            failed++;
          }
        }
      } catch (error) {
        console.error("[Notifications] Error sending batch:", error);
        failed += batch.length;
      }
    }

    console.log(`[Notifications] Sent: ${sent}, Failed: ${failed}`);
    return { sent, failed };
  },
});

/**
 * Send a single push notification (for testing or manual triggers).
 */
export const sendPushNotification = internalAction({
  args: {},
  handler: async (ctx) => {
    // This is a utility action for testing
    // In production, use sendScheduledNotifications via cron
    return { message: "Use sendScheduledNotifications via cron job" };
  },
});

/**
 * Get current hour in a specific timezone.
 */
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

/**
 * Get current day of week for a specific timezone (0 = Sunday).
 */
function getCurrentDayOfWeekForTimezone(timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    });
    const dayStr = formatter.format(new Date()).toLowerCase();
    const dayMap: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };
    return dayMap[dayStr] ?? 0;
  } catch {
    return new Date().getDay();
  }
}

/**
 * Send weekly review reminder notifications on Sunday evening.
 * Runs every hour and sends to users in their 6pm local time.
 */
export const sendWeeklyReviewReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all users with push tokens who have completed onboarding
    const usersWithTokens = await ctx.runQuery(
      internal.scheduler.getUsersWithPushTokens,
      {}
    );

    if (usersWithTokens.length === 0) {
      return { sent: 0, skipped: 0 };
    }

    // Filter to users who are currently on Sunday at 6pm (18:00) local time
    const eligibleUsers = usersWithTokens.filter((user: Doc<"users">) => {
      const timezone = user.preferences.timezone || "UTC";
      const currentDay = getCurrentDayOfWeekForTimezone(timezone);
      const currentHour = getCurrentHourForTimezone(timezone);

      // Sunday is day 0, and we want 6pm (18:00)
      return currentDay === 0 && currentHour === 18;
    });

    if (eligibleUsers.length === 0) {
      return { sent: 0, skipped: usersWithTokens.length };
    }

    // Prepare push messages
    const messages: ExpoPushMessage[] = eligibleUsers.map((user: Doc<"users">) => ({
      to: user.expoPushToken!,
      title: "Your Week in Review",
      body: "See how you did this week and get insights to improve!",
      data: { type: "weekly_review" },
      sound: "default" as const,
      channelId: "default",
      priority: "default" as const,
      ttl: 86400, // 24 hour TTL
    }));

    // Send to Expo Push API
    let sent = 0;
    let failed = 0;

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        console.error(
          `[WeeklyReview] Expo API error: ${response.status} ${response.statusText}`
        );
        failed = messages.length;
      } else {
        const result = (await response.json()) as { data?: ExpoPushTicket[] };
        const tickets: ExpoPushTicket[] = result.data ?? [];

        for (const ticket of tickets) {
          if (ticket.status === "ok") {
            sent++;
          } else {
            console.error(
              `[WeeklyReview] Failed to send:`,
              ticket.message ?? ticket.details?.error
            );
            failed++;
          }
        }
      }
    } catch (error) {
      console.error("[WeeklyReview] Error sending notifications:", error);
      failed = messages.length;
    }

    console.log(
      `[WeeklyReview] Sent: ${sent}, Failed: ${failed}, Skipped (not Sunday 6pm): ${usersWithTokens.length - eligibleUsers.length}`
    );

    return {
      sent,
      failed,
      skipped: usersWithTokens.length - eligibleUsers.length,
    };
  },
});
