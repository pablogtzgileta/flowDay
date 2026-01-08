import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ============================================================
// CACHE CLEANUP
// ============================================================

// Clear expired travel time cache entries daily at 4:00 AM UTC
crons.daily(
  "clear expired travel time cache",
  { hourUTC: 4, minuteUTC: 0 },
  internal.travelTimeCache.clearExpired
);

// ============================================================
// ROUTINE POPULATION
// ============================================================

// Populate daily routines every 2 hours
// This runs globally but handles each user's timezone internally
// (between 5am-7am local time for each user)
crons.interval(
  "populate daily routines",
  { hours: 2 },
  internal.scheduler.populateDailyRoutines
);

// ============================================================
// ROLLOVER HANDLING
// ============================================================

// Process rollover for incomplete tasks every 2 hours
// Handles planned blocks from past dates based on user preferences
// Each user is processed only during their early morning window (2-4 AM local time)
crons.interval(
  "process rollover",
  { hours: 2 },
  internal.scheduler.processRollover
);

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================

// Send scheduled push notifications every 15 minutes
// Checks for blocks with notifyAt in the next 15 minutes
crons.interval(
  "send scheduled notifications",
  { minutes: 15 },
  internal.notifications.sendScheduledNotifications
);

// ============================================================
// WEEKLY REVIEW REMINDERS
// ============================================================

// Send weekly review reminders every hour
// Sends to users whose local time is Sunday 6pm
crons.interval(
  "send weekly review reminders",
  { hours: 1 },
  internal.notifications.sendWeeklyReviewReminders
);

export default crons;
