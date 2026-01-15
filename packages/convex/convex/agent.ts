import { action, query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./auth";
import { api, internal } from "./_generated/api";
import { format, addDays, startOfWeek } from "date-fns";
import {
  formatEnergySchedule,
  getCurrentEnergyLevel,
  isLazyModeActive,
  getEnergyLevelForHour,
} from "./scheduling";
import { timeToMinutes } from "./utils/time";
import { z } from "zod";

// ElevenLabs API response schemas for runtime validation
const ElevenLabsSignedUrlResponse = z.object({
  signed_url: z.string().url(),
});

const ElevenLabsTokenResponse = z.object({
  token: z.string().min(1),
});

// Rate limit: max 10 token requests per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

// Get a signed URL for ElevenLabs conversation (text-only mode - WebSocket API)
export const getSignedUrl = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    // Get authenticated user
    const user = await ctx.runQuery(api.agent.getCurrentUser);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Check rate limit
    const now = Date.now();
    const rateLimit = user.tokenRateLimit;

    if (rateLimit) {
      const windowExpired = now - rateLimit.windowStart > RATE_LIMIT_WINDOW_MS;

      if (!windowExpired && rateLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
        throw new Error("Rate limit exceeded. Please wait a moment.");
      }
    }

    // Update rate limit counter (internal mutation - not callable by clients)
    await ctx.runMutation(internal.agent.updateRateLimit, {
      userId: user._id,
      now,
    });

    // Get signed URL from ElevenLabs
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!agentId || !apiKey) {
      throw new Error("ElevenLabs credentials not configured");
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("ElevenLabs API error:", error);
      throw new Error("Failed to get conversation URL");
    }

    const data = await response.json();

    // Validate response schema
    const parsed = ElevenLabsSignedUrlResponse.safeParse(data);
    if (!parsed.success) {
      console.error("Invalid ElevenLabs response:", parsed.error.message);
      throw new Error("Invalid response from ElevenLabs API");
    }

    return parsed.data.signed_url;
  },
});

// Get a conversation token for ElevenLabs SDK (voice mode - LiveKit/WebRTC)
export const getConversationToken = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    // Get authenticated user
    const user = await ctx.runQuery(api.agent.getCurrentUser);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Check rate limit
    const now = Date.now();
    const rateLimit = user.tokenRateLimit;

    if (rateLimit) {
      const windowExpired = now - rateLimit.windowStart > RATE_LIMIT_WINDOW_MS;

      if (!windowExpired && rateLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
        throw new Error("Rate limit exceeded. Please wait a moment.");
      }
    }

    // Update rate limit counter
    await ctx.runMutation(internal.agent.updateRateLimit, {
      userId: user._id,
      now,
    });

    // Get conversation token from ElevenLabs
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!agentId || !apiKey) {
      throw new Error("ElevenLabs credentials not configured");
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("ElevenLabs API error:", error);
      throw new Error("Failed to get conversation token");
    }

    const data = await response.json();

    // Validate response schema
    const parsed = ElevenLabsTokenResponse.safeParse(data);
    if (!parsed.success) {
      console.error("Invalid ElevenLabs response:", parsed.error.message);
      throw new Error("Invalid response from ElevenLabs API");
    }

    return parsed.data.token;
  },
});

// Internal query to get current user (used by action)
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await requireAuth(ctx);
  },
});

// Internal mutation to update rate limit (not exposed to clients)
export const updateRateLimit = internalMutation({
  args: {
    userId: v.id("users"),
    now: v.number(),
  },
  handler: async (ctx, { userId, now }) => {
    const user = await ctx.db.get(userId);
    if (!user) return;

    const rateLimit = user.tokenRateLimit;
    const windowExpired =
      !rateLimit || now - rateLimit.windowStart > RATE_LIMIT_WINDOW_MS;

    await ctx.db.patch(userId, {
      tokenRateLimit: {
        count: windowExpired ? 1 : (rateLimit?.count ?? 0) + 1,
        windowStart: windowExpired ? now : rateLimit?.windowStart ?? now,
      },
    });
  },
});

// Get context for dynamic variables passed to ElevenLabs agent
export const getAgentContext = query({
  args: {
    // Client passes their local date to avoid timezone mismatches
    clientDate: v.optional(v.string()),
  },
  handler: async (ctx, { clientDate }) => {
    const user = await requireAuth(ctx);

    // Use client-provided date if available, otherwise fall back to server time
    const today = clientDate ? new Date(clientDate + "T12:00:00") : new Date();
    const tomorrow = addDays(today, 1);
    const todayStr = format(today, "yyyy-MM-dd");
    const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

    // Get today's and tomorrow's blocks
    const todayBlocks = await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", todayStr)
      )
      .collect();

    const tomorrowBlocks = await ctx.db
      .query("blocks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", tomorrowStr)
      )
      .collect();

    // Get user's locations
    const locations = await ctx.db
      .query("locations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get cached travel times for this user (efficient indexed query using by_user index)
    const now = Date.now();
    const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
    const userTravelTimes = locations.length >= 2
      ? (await ctx.db
          .query("travelTimeCache")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect()
        ).filter((entry) => now - entry.calculatedAt <= CACHE_TTL_MS)
      : [];

    // Format schedules for the agent
    const formatSchedule = (blocks: typeof todayBlocks): string => {
      if (blocks.length === 0) return "No scheduled blocks";

      return blocks
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map((b) => {
          let entry = `${b.startTime}-${b.endTime}: ${b.title} (${b.status})`;
          if (b.requiresTravel && b.estimatedTravelTime) {
            entry += ` [travel: ${b.estimatedTravelTime}min]`;
          }
          return entry;
        })
        .join("; ");
    };

    const formatLocations = (locs: typeof locations): string => {
      if (locs.length === 0) return "No saved locations";
      return locs.map((l) => `${l.label} (${l._id})`).join(", ");
    };

    // Format travel times for the agent
    const formatTravelTimes = (
      locs: typeof locations,
      travelTimes: typeof userTravelTimes
    ): string => {
      if (locs.length < 2 || travelTimes.length === 0) {
        return "No travel times calculated";
      }

      // Create a map of location IDs to labels
      const locationLabels = new Map(locs.map((l) => [l._id, l.label]));

      // Format each travel time entry
      const formattedTimes = travelTimes
        .map((tt) => {
          const fromLabel = locationLabels.get(tt.fromLocationId) || "Unknown";
          const toLabel = locationLabels.get(tt.toLocationId) || "Unknown";
          let entry = `${fromLabel} to ${toLabel}: ~${tt.travelTimeMinutes}min`;
          if (tt.trafficCondition) {
            entry += ` (${tt.trafficCondition} traffic)`;
          }
          return entry;
        })
        .join("; ");

      return formattedTimes || "No travel times calculated";
    };

    // Get active goals with progress
    const activeGoals = await ctx.db
      .query("goals")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .collect();

    // Format goals summary for agent - optimized to avoid N+1 queries
    const formatGoalsSummary = async (): Promise<string> => {
      if (activeGoals.length === 0) {
        return "No active goals";
      }

      // Get current week start (Monday)
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEndStr = format(weekEnd, "yyyy-MM-dd");

      // Batch fetch: Get all completed blocks for this week for this user
      // This replaces N separate queries (one per goal) with a single query
      const weekBlocks = await ctx.db
        .query("blocks")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", user._id).gte("date", weekStartStr).lte("date", weekEndStr)
        )
        .filter((q) => q.eq(q.field("status"), "completed"))
        .collect();

      // Group blocks by goalId for O(1) lookup
      const blocksByGoal = new Map<string, typeof weekBlocks>();
      for (const block of weekBlocks) {
        if (block.goalId) {
          const goalIdStr = block.goalId.toString();
          if (!blocksByGoal.has(goalIdStr)) {
            blocksByGoal.set(goalIdStr, []);
          }
          blocksByGoal.get(goalIdStr)!.push(block);
        }
      }

      const summaries = activeGoals.map((goal) => {
        // Get blocks for this goal from pre-fetched data
        const goalBlocks = blocksByGoal.get(goal._id.toString()) || [];

        let completedMinutes = 0;
        for (const block of goalBlocks) {
          completedMinutes +=
            timeToMinutes(block.endTime) - timeToMinutes(block.startTime);
        }

        const targetHours =
          Math.round((goal.weeklyTargetMinutes / 60) * 10) / 10;
        const completedHours = Math.round((completedMinutes / 60) * 10) / 10;
        const remainingMinutes = goal.weeklyTargetMinutes - completedMinutes;
        const percentComplete = Math.round(
          (completedMinutes / goal.weeklyTargetMinutes) * 100
        );

        let status = "on track";
        if (percentComplete >= 100) {
          status = "complete";
        } else if (percentComplete < 50 && today.getDay() >= 4) {
          status = "behind";
        }

        // Calculate sessions needed to hit target
        const avgSessionMinutes =
          (goal.preferredSessionLength.min + goal.preferredSessionLength.max) /
          2;
        const sessionsNeeded =
          remainingMinutes > 0
            ? Math.ceil(remainingMinutes / avgSessionMinutes)
            : 0;

        return `${goal.title} [${goal._id}] (${goal.category}, priority ${goal.priority}): ${completedHours}/${targetHours}h this week (${percentComplete}%, ${status}), needs ${sessionsNeeded} more ${avgSessionMinutes}min sessions, prefers ${goal.preferredTime}, ${goal.energyLevel} energy`;
      });

      return summaries.join("; ");
    };

    const goalsSummary = await formatGoalsSummary();

    // Get energy context
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

    // Format lazy mode status
    let lazyModeStatus = "disabled";
    if (lazyModeActive) {
      if (preferences.lazyModeUntil) {
        const until = new Date(preferences.lazyModeUntil);
        lazyModeStatus = `enabled until ${format(until, "h:mm a")}`;
      } else {
        lazyModeStatus = "enabled";
      }
    }

    // Generate energy tips based on current state
    const generateEnergyTips = (): string => {
      const tips: string[] = [];

      if (currentEnergy === "high") {
        tips.push("User has high energy now - ideal time for challenging tasks");
      } else if (currentEnergy === "low") {
        tips.push("User has low energy now - suggest lighter tasks or breaks");
      }

      if (lazyModeActive) {
        tips.push("LAZY MODE ACTIVE: Suggest alternatives to high-energy tasks, offer to reschedule demanding work");
      }

      // Add peak window info
      const peakTimes = {
        morning: "before noon",
        afternoon: "early-to-mid afternoon",
        evening: "evening hours",
      };
      tips.push(`User's peak energy is ${peakTimes[preferences.peakEnergyWindow]}`);

      return tips.join(". ");
    };

    // Get weekly review summary for agent context
    const weeklyReviewSummary = await ctx.runQuery(
      internal.weeklyReview.getWeeklyReviewSummary,
      { userId: user._id }
    );

    // Return context as flat object of strings (ElevenLabs dynamic variables)
    return {
      user_name: user.name || "there",
      wake_time: user.preferences.wakeTime,
      sleep_time: user.preferences.sleepTime,
      peak_energy: user.preferences.peakEnergyWindow,
      today_date: todayStr,
      tomorrow_date: tomorrowStr,
      today_schedule: formatSchedule(todayBlocks),
      tomorrow_schedule: formatSchedule(tomorrowBlocks),
      goals_summary: goalsSummary,
      locations: formatLocations(locations),
      travel_times: formatTravelTimes(locations, userTravelTimes),

      // Energy context (new fields)
      current_energy: currentEnergy,
      energy_schedule: energySchedule,
      lazy_mode: lazyModeStatus,
      energy_tips: generateEnergyTips(),

      // Weekly review context
      weekly_review: weeklyReviewSummary,
    };
  },
});

// Track voice usage (for ElevenLabs quota management)
export const trackVoiceUsage = mutation({
  args: {
    minutes: v.number(),
  },
  handler: async (ctx, { minutes }) => {
    const user = await requireAuth(ctx);

    const currentMonth = new Date().toISOString().slice(0, 7); // "2025-01"
    const currentUsage = user.voiceUsage;

    // Check if we need to reset for new month
    const isNewMonth = !currentUsage || currentUsage.monthStart !== currentMonth;

    await ctx.db.patch(user._id, {
      voiceUsage: {
        monthlyMinutesUsed: isNewMonth
          ? minutes
          : (currentUsage?.monthlyMinutesUsed ?? 0) + minutes,
        monthStart: currentMonth,
        conversationCount: isNewMonth
          ? 1
          : (currentUsage?.conversationCount ?? 0) + 1,
      },
      updatedAt: Date.now(),
    });
  },
});

// Get voice usage stats
export const getVoiceUsage = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const usage = user.voiceUsage;

    // Check if usage is for current month
    if (!usage || usage.monthStart !== currentMonth) {
      return {
        monthlyMinutesUsed: 0,
        monthStart: currentMonth,
        conversationCount: 0,
        remainingMinutes: 15, // ElevenLabs free tier
      };
    }

    return {
      ...usage,
      remainingMinutes: Math.max(0, 15 - usage.monthlyMinutesUsed),
    };
  },
});

// Simple text chat action for web interface
export const chat = action({
  args: {
    message: v.string(),
  },
  handler: async (ctx, { message }): Promise<{ text: string }> => {
    // Get authenticated user
    const user = await ctx.runQuery(api.agent.getCurrentUser);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get context for personalized responses
    const context = await ctx.runQuery(api.agent.getAgentContext, {
      clientDate: format(new Date(), "yyyy-MM-dd"),
    });

    const lowerMessage = message.toLowerCase();

    // Simple intent detection and context-aware responses
    if (lowerMessage.includes("schedule") || lowerMessage.includes("today")) {
      if (context.today_schedule === "No scheduled blocks") {
        return {
          text: `Hi ${context.user_name}! You don't have any blocks scheduled for today. Would you like me to help you plan your day based on your goals?`,
        };
      }
      return {
        text: `Here's your schedule for today:\n\n${context.today_schedule}\n\nYour current energy level is ${context.current_energy}. ${context.energy_tips}`,
      };
    }

    if (lowerMessage.includes("tomorrow")) {
      if (context.tomorrow_schedule === "No scheduled blocks") {
        return {
          text: `You don't have anything scheduled for tomorrow yet. Based on your goals, would you like suggestions for what to work on?`,
        };
      }
      return {
        text: `Here's your schedule for tomorrow:\n\n${context.tomorrow_schedule}`,
      };
    }

    if (lowerMessage.includes("goal") || lowerMessage.includes("progress")) {
      if (context.goals_summary === "No active goals") {
        return {
          text: `You don't have any active goals yet. Would you like to create one? Goals help me better plan your schedule and ensure you're making progress on what matters most to you.`,
        };
      }
      return {
        text: `Here's your goals summary:\n\n${context.goals_summary}\n\n${context.energy_tips}`,
      };
    }

    if (lowerMessage.includes("energy") || lowerMessage.includes("tired") || lowerMessage.includes("lazy")) {
      return {
        text: `Your current energy level is ${context.current_energy}.\n\n${context.energy_schedule}\n\nLazy mode is currently ${context.lazy_mode}. ${context.energy_tips}`,
      };
    }

    if (lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
      return {
        text: `Hi ${context.user_name}! I'm your Flow Day assistant. I can help you with:\n\n• Checking your schedule (today/tomorrow)\n• Reviewing your goals and progress\n• Understanding your energy levels\n\nWhat would you like to know?`,
      };
    }

    // Default response with context
    return {
      text: `I understand you're asking about "${message}". I can help you with:\n\n• Your schedule for today or tomorrow\n• Your goals and progress tracking\n• Energy levels and productivity tips\n\nYour current energy is ${context.current_energy}, and ${context.lazy_mode === "disabled" ? "lazy mode is off" : `lazy mode is ${context.lazy_mode}`}. What would you like to focus on?`,
    };
  },
});
