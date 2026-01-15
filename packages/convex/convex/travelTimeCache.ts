import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Cache expiration time: 24 hours in milliseconds
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Get all cached travel times for a user (efficient per-user query)
export const getByUser = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const now = Date.now();
    const entries = await ctx.db
      .query("travelTimeCache")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter out expired entries
    return entries.filter((entry) => now - entry.calculatedAt <= CACHE_TTL_MS);
  },
});

// Get cached travel time between two locations
export const get = internalQuery({
  args: {
    fromLocationId: v.id("locations"),
    toLocationId: v.id("locations"),
  },
  handler: async (ctx, { fromLocationId, toLocationId }) => {
    const cached = await ctx.db
      .query("travelTimeCache")
      .withIndex("by_locations", (q) =>
        q.eq("fromLocationId", fromLocationId).eq("toLocationId", toLocationId)
      )
      .first();

    if (!cached) {
      return null;
    }

    // Check if cache is still fresh
    const now = Date.now();
    if (now - cached.calculatedAt > CACHE_TTL_MS) {
      return null; // Cache expired
    }

    return cached;
  },
});

// Upsert (create or update) a travel time cache entry
export const upsert = internalMutation({
  args: {
    userId: v.id("users"),
    fromLocationId: v.id("locations"),
    toLocationId: v.id("locations"),
    travelTimeMinutes: v.number(),
    trafficCondition: v.optional(
      v.union(v.literal("light"), v.literal("moderate"), v.literal("heavy"))
    ),
  },
  handler: async (
    ctx,
    { userId, fromLocationId, toLocationId, travelTimeMinutes, trafficCondition }
  ) => {
    // Check if entry already exists
    const existing = await ctx.db
      .query("travelTimeCache")
      .withIndex("by_locations", (q) =>
        q.eq("fromLocationId", fromLocationId).eq("toLocationId", toLocationId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing entry (also update userId in case it was missing)
      await ctx.db.patch(existing._id, {
        userId,
        travelTimeMinutes,
        trafficCondition,
        calculatedAt: now,
      });
      return existing._id;
    }

    // Create new entry
    return await ctx.db.insert("travelTimeCache", {
      userId,
      fromLocationId,
      toLocationId,
      travelTimeMinutes,
      trafficCondition,
      calculatedAt: now,
    });
  },
});

// Clear expired cache entries (can be called by a scheduled job)
export const clearExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - CACHE_TTL_MS;

    // Get all expired entries
    const allEntries = await ctx.db.query("travelTimeCache").collect();
    const expiredEntries = allEntries.filter(
      (entry) => entry.calculatedAt < cutoff
    );

    // Delete expired entries
    for (const entry of expiredEntries) {
      await ctx.db.delete(entry._id);
    }

    return { deletedCount: expiredEntries.length };
  },
});

// Clear cache for a specific location (when location is deleted)
export const clearForLocation = internalMutation({
  args: {
    locationId: v.id("locations"),
  },
  handler: async (ctx, { locationId }) => {
    // Find all cache entries involving this location
    const allEntries = await ctx.db.query("travelTimeCache").collect();
    const relatedEntries = allEntries.filter(
      (entry) =>
        entry.fromLocationId === locationId ||
        entry.toLocationId === locationId
    );

    // Delete related entries
    for (const entry of relatedEntries) {
      await ctx.db.delete(entry._id);
    }

    return { deletedCount: relatedEntries.length };
  },
});
