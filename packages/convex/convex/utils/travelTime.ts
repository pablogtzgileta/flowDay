/**
 * Travel time utility functions for building and querying travel time maps.
 * Extracted for testability and reuse across the codebase.
 */

/**
 * Default travel time in minutes when no cached value is available.
 */
export const DEFAULT_TRAVEL_TIME_MINUTES = 30;

/**
 * A travel time entry from the cache.
 */
export interface TravelTimeEntry {
  fromLocationId: string;
  toLocationId: string;
  travelTimeMinutes: number;
  trafficCondition?: "light" | "moderate" | "heavy";
}

/**
 * Builds a nested Map for O(1) travel time lookups.
 * The outer Map is keyed by fromLocationId, the inner Map is keyed by toLocationId.
 *
 * @param travelTimes - Array of travel time entries
 * @returns Nested Map structure for fast lookups
 */
export function buildTravelTimeMap(
  travelTimes: TravelTimeEntry[]
): Map<string, Map<string, number>> {
  const travelTimeMap = new Map<string, Map<string, number>>();

  for (const tt of travelTimes) {
    if (!travelTimeMap.has(tt.fromLocationId)) {
      travelTimeMap.set(tt.fromLocationId, new Map());
    }
    travelTimeMap.get(tt.fromLocationId)!.set(tt.toLocationId, tt.travelTimeMinutes);
  }

  return travelTimeMap;
}

/**
 * Gets travel time between two locations from a pre-built Map.
 * Falls back to default value if no cached entry exists.
 *
 * @param travelTimeMap - Nested Map structure from buildTravelTimeMap
 * @param fromId - Source location ID
 * @param toId - Destination location ID
 * @returns Travel time in minutes
 */
export function getTravelTime(
  travelTimeMap: Map<string, Map<string, number>>,
  fromId: string,
  toId: string
): number {
  return travelTimeMap.get(fromId)?.get(toId) ?? DEFAULT_TRAVEL_TIME_MINUTES;
}

/**
 * Filters travel time entries to only include those for a given set of location IDs.
 *
 * @param allTravelTimes - All travel time entries from the cache
 * @param locationIds - Set of location IDs to filter for
 * @returns Filtered array of travel time entries
 */
export function filterTravelTimesForLocations(
  allTravelTimes: TravelTimeEntry[],
  locationIds: Set<string>
): TravelTimeEntry[] {
  return allTravelTimes.filter(
    tt => locationIds.has(tt.fromLocationId) && locationIds.has(tt.toLocationId)
  );
}
