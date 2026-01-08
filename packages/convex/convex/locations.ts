import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./auth";

// Internal query to get a location by ID (used by maps.ts)
export const getById = internalQuery({
  args: {
    id: v.id("locations"),
  },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Query to get a location by label (case-insensitive)
// Used by AI agent for label-based location lookup
export const getByLabel = query({
  args: {
    label: v.string(),
  },
  handler: async (ctx, { label }) => {
    const user = await requireAuth(ctx);

    // Normalize input: trim whitespace
    const normalizedLabel = label.trim();

    // Query using the by_user_label index
    // Note: Convex indexes are case-sensitive, so we need to query all user's locations
    // and filter case-insensitively
    const locations = await ctx.db
      .query("locations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Find case-insensitive match
    const matchingLocation = locations.find(
      (loc) => loc.label.toLowerCase() === normalizedLabel.toLowerCase()
    );

    return matchingLocation ?? null;
  },
});

// Internal query to get user's default (home) location
export const getDefaultLocation = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    // First try to find a location marked as default
    const defaultLocation = await ctx.db
      .query("locations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    if (defaultLocation) {
      return defaultLocation;
    }

    // Fallback: find a location labeled "Home"
    const homeLocation = await ctx.db
      .query("locations")
      .withIndex("by_user_label", (q) =>
        q.eq("userId", userId).eq("label", "Home")
      )
      .first();

    return homeLocation;
  },
});

// Add a new location for the user
export const addLocation = mutation({
  args: {
    label: v.string(),
    address: v.string(),
    coordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    keywords: v.optional(v.array(v.string())),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Default coordinates to 0,0 if not provided (can be geocoded later)
    const coordinates = args.coordinates ?? { lat: 0, lng: 0 };

    // Generate keywords from label if not provided
    const keywords = args.keywords ?? [args.label.toLowerCase()];

    const locationId = await ctx.db.insert("locations", {
      userId: user._id,
      label: args.label,
      address: args.address,
      coordinates,
      keywords,
      isDefault: args.isDefault,
      createdAt: Date.now(),
    });

    return locationId;
  },
});

// Get all locations for the current user
export const getLocations = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);

    return await ctx.db
      .query("locations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

// Update a location
export const updateLocation = mutation({
  args: {
    locationId: v.id("locations"),
    label: v.optional(v.string()),
    address: v.optional(v.string()),
    coordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    keywords: v.optional(v.array(v.string())),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Verify ownership
    const location = await ctx.db.get(args.locationId);
    if (!location || location.userId !== user._id) {
      throw new Error("Location not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.label !== undefined) updates.label = args.label;
    if (args.address !== undefined) updates.address = args.address;
    if (args.coordinates !== undefined) updates.coordinates = args.coordinates;
    if (args.keywords !== undefined) updates.keywords = args.keywords;
    if (args.isDefault !== undefined) updates.isDefault = args.isDefault;

    await ctx.db.patch(args.locationId, updates);
  },
});

// Delete a location and clear associated travel time cache
export const deleteLocation = mutation({
  args: {
    locationId: v.id("locations"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Verify ownership
    const location = await ctx.db.get(args.locationId);
    if (!location || location.userId !== user._id) {
      throw new Error("Location not found");
    }

    // Clear travel time cache entries involving this location
    const cacheEntries = await ctx.db.query("travelTimeCache").collect();
    for (const entry of cacheEntries) {
      if (
        entry.fromLocationId === args.locationId ||
        entry.toLocationId === args.locationId
      ) {
        await ctx.db.delete(entry._id);
      }
    }

    await ctx.db.delete(args.locationId);
  },
});
