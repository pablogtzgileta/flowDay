import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent, getAuthUser, requireAuth } from "./auth";
import { ENERGY_PRESETS } from "./scheduling";

// Ensure user document exists after authentication
// Called after successful sign-in/sign-up
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    // Use authComponent.getAuthUser which validates the session
    // (ctx.auth.getUserIdentity() does NOT validate the session)
    const authUser = await authComponent.getAuthUser(ctx);

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUser.userId))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    // Get timezone (default to UTC, client should override)
    const defaultTimezone = "UTC";

    // Create new user with defaults
    const userId = await ctx.db.insert("users", {
      authUserId: authUser.userId,
      email: authUser.email || "",
      name: authUser.name,
      onboardingCompleted: false,
      preferences: {
        wakeTime: "07:00",
        sleepTime: "23:00",
        peakEnergyWindow: "morning",
        notificationStyle: "proactive",
        timezone: defaultTimezone,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

// Get current authenticated user
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    return await getAuthUser(ctx);
  },
});

// Alias for getCurrent (used by mobile hooks)
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await getAuthUser(ctx);
  },
});

// Energy level type (imported ENERGY_PRESETS from scheduling.ts)
type EnergyLevel = "high" | "medium" | "low";

// Update user preferences
export const updatePreferences = mutation({
  args: {
    wakeTime: v.optional(v.string()),
    sleepTime: v.optional(v.string()),
    peakEnergyWindow: v.optional(
      v.union(
        v.literal("morning"),
        v.literal("afternoon"),
        v.literal("evening")
      )
    ),
    notificationStyle: v.optional(
      v.union(v.literal("minimal"), v.literal("proactive"))
    ),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, updates) => {
    const user = await requireAuth(ctx);

    const currentPrefs = user.preferences;

    // Build new preferences object
    const newPrefs = {
      ...currentPrefs,
      ...(updates.wakeTime && { wakeTime: updates.wakeTime }),
      ...(updates.sleepTime && { sleepTime: updates.sleepTime }),
      ...(updates.peakEnergyWindow && {
        peakEnergyWindow: updates.peakEnergyWindow,
      }),
      ...(updates.notificationStyle && {
        notificationStyle: updates.notificationStyle,
      }),
      ...(updates.timezone && { timezone: updates.timezone }),
    };

    await ctx.db.patch(user._id, {
      preferences: newPrefs,
      updatedAt: Date.now(),
    });
  },
});

// Update energy profile with preset or custom hourly levels
export const updateEnergyProfile = mutation({
  args: {
    preset: v.union(
      v.literal("morning_person"),
      v.literal("night_owl"),
      v.literal("steady"),
      v.literal("custom")
    ),
    // Required for custom, optional for presets (will use preset defaults)
    hourlyLevels: v.optional(
      v.array(v.union(v.literal("high"), v.literal("medium"), v.literal("low")))
    ),
  },
  handler: async (ctx, { preset, hourlyLevels }) => {
    const user = await requireAuth(ctx);

    // Determine hourly levels
    let levels: EnergyLevel[];

    if (preset === "custom") {
      if (!hourlyLevels || hourlyLevels.length !== 24) {
        throw new Error("Custom profile requires exactly 24 hourly energy levels");
      }
      levels = hourlyLevels;
    } else {
      // Use preset, but allow overrides if provided
      // Non-null assertion is safe here because preset is validated by the schema
      levels = hourlyLevels?.length === 24 ? hourlyLevels : ENERGY_PRESETS[preset]!;
    }

    const newPrefs = {
      ...user.preferences,
      energyProfile: {
        hourlyLevels: levels,
        preset,
      },
    };

    await ctx.db.patch(user._id, {
      preferences: newPrefs,
      updatedAt: Date.now(),
    });

    return { preset, hourlyLevels: levels };
  },
});

// Toggle lazy mode on/off with optional duration
export const toggleLazyMode = mutation({
  args: {
    enabled: v.boolean(),
    // Duration in hours (optional) - lazy mode auto-disables after this time
    durationHours: v.optional(v.number()),
  },
  handler: async (ctx, { enabled, durationHours }) => {
    const user = await requireAuth(ctx);

    let lazyModeUntil: number | undefined;

    if (enabled && durationHours) {
      // Set auto-disable timestamp
      lazyModeUntil = Date.now() + durationHours * 60 * 60 * 1000;
    }

    const newPrefs = {
      ...user.preferences,
      lazyModeEnabled: enabled,
      lazyModeUntil: enabled ? lazyModeUntil : undefined,
    };

    await ctx.db.patch(user._id, {
      preferences: newPrefs,
      updatedAt: Date.now(),
    });

    return {
      lazyModeEnabled: enabled,
      lazyModeUntil,
    };
  },
});

// Get energy presets (for UI selection)
export const getEnergyPresets = query({
  args: {},
  handler: async () => {
    return {
      morning_person: {
        label: "Morning Person",
        description: "Peak energy in the morning, dip after lunch",
        hourlyLevels: ENERGY_PRESETS.morning_person,
      },
      night_owl: {
        label: "Night Owl",
        description: "Slow start, peak energy in the evening",
        hourlyLevels: ENERGY_PRESETS.night_owl,
      },
      steady: {
        label: "Steady",
        description: "Consistent medium energy throughout the day",
        hourlyLevels: ENERGY_PRESETS.steady,
      },
    };
  },
});

// Complete onboarding
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    await ctx.db.patch(user._id, {
      onboardingCompleted: true,
      updatedAt: Date.now(),
    });
  },
});

// Update rollover behavior preference
export const updateRolloverBehavior = mutation({
  args: {
    rolloverBehavior: v.union(
      v.literal("auto_skip"),
      v.literal("rollover_once"),
      v.literal("prompt_agent")
    ),
  },
  handler: async (ctx, { rolloverBehavior }) => {
    const user = await requireAuth(ctx);

    const newPrefs = {
      ...user.preferences,
      rolloverBehavior,
    };

    await ctx.db.patch(user._id, {
      preferences: newPrefs,
      updatedAt: Date.now(),
    });

    return { rolloverBehavior };
  },
});

// Update Expo push token for server-side notifications
export const updateExpoPushToken = mutation({
  args: {
    expoPushToken: v.string(),
  },
  handler: async (ctx, { expoPushToken }) => {
    const user = await requireAuth(ctx);

    // Validate Expo push token format
    if (!expoPushToken.startsWith("ExponentPushToken[") && !expoPushToken.startsWith("ExpoPushToken[")) {
      throw new Error("Invalid Expo push token format");
    }

    await ctx.db.patch(user._id, {
      expoPushToken,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Remove Expo push token (e.g., on logout)
export const removeExpoPushToken = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    await ctx.db.patch(user._id, {
      expoPushToken: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
