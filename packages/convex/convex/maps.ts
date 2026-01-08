import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Google Routes API endpoint
const ROUTES_API_URL =
  "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";

// Google Geocoding API endpoint
const GEOCODING_API_URL = "https://maps.googleapis.com/maps/api/geocode/json";

// Traffic condition mapping based on duration ratio
function getTrafficCondition(
  durationSeconds: number,
  staticDurationSeconds?: number
): "light" | "moderate" | "heavy" | undefined {
  if (!staticDurationSeconds || staticDurationSeconds === 0) {
    return undefined;
  }

  const ratio = durationSeconds / staticDurationSeconds;

  if (ratio <= 1.1) return "light";
  if (ratio <= 1.4) return "moderate";
  return "heavy";
}

// Calculate travel time between two locations using Google Routes API
// Internal action - not callable from client to prevent API abuse
export const calculateTravelTime = internalAction({
  args: {
    fromLocationId: v.id("locations"),
    toLocationId: v.id("locations"),
  },
  handler: async (ctx, { fromLocationId, toLocationId }) => {
    // Get locations from database
    const [fromLocation, toLocation] = await Promise.all([
      ctx.runQuery(internal.locations.getById, { id: fromLocationId }),
      ctx.runQuery(internal.locations.getById, { id: toLocationId }),
    ]);

    if (!fromLocation || !toLocation) {
      throw new Error("Location not found");
    }

    // Check if coordinates are valid (not placeholder 0,0)
    if (
      (fromLocation.coordinates.lat === 0 &&
        fromLocation.coordinates.lng === 0) ||
      (toLocation.coordinates.lat === 0 && toLocation.coordinates.lng === 0)
    ) {
      throw new Error(
        "Cannot calculate travel time: location coordinates not set"
      );
    }

    const apiKey = process.env.GOOGLE_ROUTES_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_ROUTES_API_KEY not configured");
    }

    // Call Google Routes API
    const response = await fetch(ROUTES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "originIndex,destinationIndex,duration,staticDuration,distanceMeters,condition",
      },
      body: JSON.stringify({
        origins: [
          {
            waypoint: {
              location: {
                latLng: {
                  latitude: fromLocation.coordinates.lat,
                  longitude: fromLocation.coordinates.lng,
                },
              },
            },
          },
        ],
        destinations: [
          {
            waypoint: {
              location: {
                latLng: {
                  latitude: toLocation.coordinates.lat,
                  longitude: toLocation.coordinates.lng,
                },
              },
            },
          },
        ],
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Routes API error:", response.status, errorText);
      throw new Error(`Routes API error: ${response.status}`);
    }

    const data = await response.json();

    // Handle empty response
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No route data returned from API");
    }

    const result = data[0];

    // Check route condition
    if (result.condition && result.condition !== "ROUTE_EXISTS") {
      throw new Error(`Route not available: ${result.condition}`);
    }

    // Parse duration (format: "1234s")
    const durationStr = result.duration || "0s";
    const durationSeconds = parseInt(durationStr.replace("s", ""), 10);
    const travelTimeMinutes = Math.ceil(durationSeconds / 60);

    // Parse static duration for traffic comparison
    const staticDurationStr = result.staticDuration || "0s";
    const staticDurationSeconds = parseInt(
      staticDurationStr.replace("s", ""),
      10
    );

    // Determine traffic condition
    const trafficCondition = getTrafficCondition(
      durationSeconds,
      staticDurationSeconds
    );

    // Cache the result
    await ctx.runMutation(internal.travelTimeCache.upsert, {
      fromLocationId,
      toLocationId,
      travelTimeMinutes,
      trafficCondition,
    });

    return {
      travelTimeMinutes,
      trafficCondition,
      distanceMeters: result.distanceMeters,
    };
  },
});

// Geocode an address to get coordinates using Google Geocoding API
export const geocodeAddress = action({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const apiKey = process.env.GOOGLE_ROUTES_API_KEY; // Same key works for Geocoding
    if (!apiKey) {
      throw new Error("GOOGLE_ROUTES_API_KEY not configured");
    }

    const url = new URL(GEOCODING_API_URL);
    url.searchParams.set("address", address);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      throw new Error(`Geocoding failed: ${data.status}`);
    }

    const location = data.results[0].geometry.location;
    const formattedAddress = data.results[0].formatted_address;

    return {
      lat: location.lat,
      lng: location.lng,
      formattedAddress,
    };
  },
});

// Calculate travel times for a newly added location (to/from home)
// This pre-warms the cache so travel times are available immediately
export const calculateTravelTimesForNewLocation = action({
  args: {
    locationId: v.id("locations"),
  },
  handler: async (ctx, { locationId }) => {
    // Get the new location
    const newLocation = await ctx.runQuery(internal.locations.getById, {
      id: locationId,
    });

    if (!newLocation) {
      console.error("New location not found:", locationId);
      return { success: false, error: "Location not found" };
    }

    // Get userId from the location
    const userId = newLocation.userId;

    // Skip if coordinates are placeholder
    if (
      newLocation.coordinates.lat === 0 &&
      newLocation.coordinates.lng === 0
    ) {
      console.log("Skipping travel time calculation: no coordinates");
      return { success: false, error: "No coordinates" };
    }

    // Get user's home location
    const homeLocation = await ctx.runQuery(
      internal.locations.getDefaultLocation,
      { userId }
    );

    // If no home location or this IS the home location, nothing to calculate
    if (!homeLocation || homeLocation._id === locationId) {
      return { success: true, message: "No travel time calculation needed" };
    }

    // Skip if home has placeholder coordinates
    if (
      homeLocation.coordinates.lat === 0 &&
      homeLocation.coordinates.lng === 0
    ) {
      console.log("Skipping travel time calculation: home has no coordinates");
      return { success: false, error: "Home has no coordinates" };
    }

    const results: {
      homeToNew?: { travelTimeMinutes: number };
      newToHome?: { travelTimeMinutes: number };
      errors: string[];
    } = { errors: [] };

    // Calculate home -> new location
    try {
      const homeToNew = await ctx.runAction(internal.maps.calculateTravelTime, {
        fromLocationId: homeLocation._id,
        toLocationId: locationId,
      });
      results.homeToNew = homeToNew;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to calculate home -> new:", message);
      results.errors.push(`home->new: ${message}`);
    }

    // Calculate new location -> home
    try {
      const newToHome = await ctx.runAction(internal.maps.calculateTravelTime, {
        fromLocationId: locationId,
        toLocationId: homeLocation._id,
      });
      results.newToHome = newToHome;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to calculate new -> home:", message);
      results.errors.push(`new->home: ${message}`);
    }

    return {
      success: results.errors.length === 0,
      ...results,
    };
  },
});

// Get cached travel time or calculate it (convenience function)
export const getTravelTime = action({
  args: {
    fromLocationId: v.id("locations"),
    toLocationId: v.id("locations"),
  },
  handler: async (ctx, { fromLocationId, toLocationId }) => {
    // Check cache first
    const cached = await ctx.runQuery(internal.travelTimeCache.get, {
      fromLocationId,
      toLocationId,
    });

    if (cached) {
      return {
        travelTimeMinutes: cached.travelTimeMinutes,
        trafficCondition: cached.trafficCondition,
        fromCache: true,
      };
    }

    // Calculate if not cached
    try {
      const result = await ctx.runAction(internal.maps.calculateTravelTime, {
        fromLocationId,
        toLocationId,
      });
      return {
        ...result,
        fromCache: false,
      };
    } catch (error) {
      // Return null on error - caller should use fallback
      console.error("Failed to calculate travel time:", error);
      return null;
    }
  },
});
