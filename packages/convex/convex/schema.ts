import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User profile and preferences
  users: defineTable({
    // Auth reference (from better-auth)
    authUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),

    // Onboarding state
    onboardingCompleted: v.boolean(),
    onboardingStep: v.optional(v.string()),

    // Preferences (learned during onboarding)
    preferences: v.object({
      wakeTime: v.string(), // "06:30"
      sleepTime: v.string(), // "23:00"
      peakEnergyWindow: v.union(
        v.literal("morning"),
        v.literal("afternoon"),
        v.literal("evening")
      ),
      notificationStyle: v.union(
        v.literal("minimal"),
        v.literal("proactive")
      ),
      timezone: v.string(), // "America/New_York"

      // Energy profile - granular hourly energy levels
      energyProfile: v.optional(
        v.object({
          // 24 values representing energy level for each hour (0-23)
          hourlyLevels: v.array(
            v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
          ),
          // Preset identifier for quick selection
          preset: v.union(
            v.literal("morning_person"),
            v.literal("night_owl"),
            v.literal("steady"),
            v.literal("custom")
          ),
        })
      ),

      // Lazy mode - reduces scheduling of high-energy tasks
      lazyModeEnabled: v.optional(v.boolean()),
      lazyModeUntil: v.optional(v.number()), // Auto-disable timestamp

      // Rollover behavior for incomplete tasks
      rolloverBehavior: v.optional(
        v.union(
          v.literal("auto_skip"), // Auto-skip past-due tasks
          v.literal("rollover_once"), // Move to next day once, then skip
          v.literal("prompt_agent") // Let agent suggest what to do
        )
      ),
    }),

    // Expo push token for server-side notifications
    expoPushToken: v.optional(v.string()),

    // Voice usage tracking (for ElevenLabs quota)
    voiceUsage: v.optional(
      v.object({
        monthlyMinutesUsed: v.number(),
        monthStart: v.string(), // "2025-01" format
        conversationCount: v.number(),
      })
    ),

    // Rate limiting for token generation
    tokenRateLimit: v.optional(
      v.object({
        count: v.number(), // Requests in current window
        windowStart: v.number(), // Start of current window (timestamp)
      })
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_user", ["authUserId"])
    .index("by_email", ["email"]),

  // Actual scheduled blocks for specific dates
  blocks: defineTable({
    userId: v.id("users"),
    date: v.string(), // "2025-01-15"
    startTime: v.string(), // "06:30"
    endTime: v.string(), // "07:30"
    title: v.string(),
    description: v.optional(v.string()),

    // Source and status
    source: v.union(
      v.literal("routine"), // Auto-generated from routine
      v.literal("user_request"), // User explicitly asked
      v.literal("ai_suggestion"), // AI proactively suggested
      v.literal("goal_session") // Scheduled for goal progress
    ),
    status: v.union(
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("skipped"),
      v.literal("moved")
    ),

    // Location and travel
    requiresTravel: v.boolean(),
    locationId: v.optional(v.id("locations")),
    estimatedTravelTime: v.optional(v.number()), // minutes
    prepBuffer: v.number(), // minutes before leaving

    // Notification tracking
    notifyAt: v.optional(v.number()), // timestamp
    notificationId: v.optional(v.string()), // expo notification ID

    // Goal association
    goalId: v.optional(v.id("goals")),

    // Rescheduling tracking
    routineId: v.optional(v.id("routines")),
    originalDate: v.optional(v.string()),
    timesPostponed: v.number(),

    // Energy and preferences
    energyLevel: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_user_status", ["userId", "status"])
    .index("by_goal", ["goalId"])
    .index("by_notify_time", ["notifyAt"])
    // Optimized index for date range queries - allows efficient filtering
    // Used by getByDateRange and weekly review queries
    .index("by_user_date_status", ["userId", "date", "status"]),

  // Saved locations for travel time calculations (Phase 2)
  locations: defineTable({
    userId: v.id("users"),
    label: v.string(), // "Home", "Office", "Gym"
    address: v.string(),
    coordinates: v.object({
      lat: v.number(),
      lng: v.number(),
    }),
    keywords: v.array(v.string()), // ["work", "office"] for AI recognition
    isDefault: v.optional(v.boolean()), // Mark home/primary location
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_label", ["userId", "label"]),

  // Weekly routine template (Phase 2)
  routines: defineTable({
    userId: v.id("users"),
    dayOfWeek: v.union(
      v.literal("mon"),
      v.literal("tue"),
      v.literal("wed"),
      v.literal("thu"),
      v.literal("fri"),
      v.literal("sat"),
      v.literal("sun")
    ),
    startTime: v.string(), // "08:00"
    endTime: v.string(), // "17:00"
    label: v.string(), // "Work", "Commute", "Gym"
    locationId: v.optional(v.id("locations")),
    flexibility: v.union(
      v.literal("fixed"), // Cannot be moved (work, meetings)
      v.literal("semi-flexible"), // Prefer this time but can adjust
      v.literal("free") // Available slot marker
    ),
    isRecurring: v.boolean(),
    color: v.optional(v.string()), // For UI display
    // Energy level for generated blocks
    energyLevel: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_day", ["userId", "dayOfWeek"]),

  // Goals and habits with time targets (Phase 3)
  goals: defineTable({
    userId: v.id("users"),
    title: v.string(), // "Learn React Native"
    description: v.optional(v.string()),

    // Time targets
    weeklyTargetMinutes: v.number(), // 300 = 5 hours
    preferredSessionLength: v.object({
      min: v.number(), // 30 minutes
      max: v.number(), // 45 minutes
    }),

    // Scheduling preferences
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

    // Priority and categorization
    priority: v.number(), // 1 = highest
    category: v.union(
      v.literal("learning"),
      v.literal("health"),
      v.literal("career"),
      v.literal("personal"),
      v.literal("creative")
    ),

    // Status
    isActive: v.boolean(),
    targetDate: v.optional(v.number()), // Optional deadline

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_user_priority", ["userId", "priority"]),

  // Travel time cache to reduce API calls (Phase 2)
  travelTimeCache: defineTable({
    userId: v.id("users"), // Added for efficient per-user queries
    fromLocationId: v.id("locations"),
    toLocationId: v.id("locations"),
    travelTimeMinutes: v.number(),
    calculatedAt: v.number(),
    trafficCondition: v.optional(
      v.union(v.literal("light"), v.literal("moderate"), v.literal("heavy"))
    ),
  })
    .index("by_locations", ["fromLocationId", "toLocationId"])
    .index("by_user", ["userId"]), // New index for efficient per-user queries
});
