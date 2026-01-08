import { test, expect, describe } from "bun:test";
import {
  buildTravelTimeMap,
  getTravelTime,
  filterTravelTimesForLocations,
  DEFAULT_TRAVEL_TIME_MINUTES,
  TravelTimeEntry,
} from "./travelTime";

describe("buildTravelTimeMap", () => {
  test("returns empty Map for empty travel times array", () => {
    const result = buildTravelTimeMap([]);
    expect(result.size).toBe(0);
  });

  test("builds correct Map structure from travel time entries", () => {
    const travelTimes: TravelTimeEntry[] = [
      { fromLocationId: "loc1", toLocationId: "loc2", travelTimeMinutes: 15 },
      { fromLocationId: "loc1", toLocationId: "loc3", travelTimeMinutes: 25 },
      { fromLocationId: "loc2", toLocationId: "loc1", travelTimeMinutes: 20 },
    ];

    const result = buildTravelTimeMap(travelTimes);

    // Should have 2 outer keys (loc1, loc2)
    expect(result.size).toBe(2);

    // loc1 should have 2 destinations
    expect(result.get("loc1")?.size).toBe(2);
    expect(result.get("loc1")?.get("loc2")).toBe(15);
    expect(result.get("loc1")?.get("loc3")).toBe(25);

    // loc2 should have 1 destination
    expect(result.get("loc2")?.size).toBe(1);
    expect(result.get("loc2")?.get("loc1")).toBe(20);
  });

  test("handles duplicate from-to pairs by keeping last value", () => {
    const travelTimes: TravelTimeEntry[] = [
      { fromLocationId: "loc1", toLocationId: "loc2", travelTimeMinutes: 15 },
      { fromLocationId: "loc1", toLocationId: "loc2", travelTimeMinutes: 20 }, // Updated value
    ];

    const result = buildTravelTimeMap(travelTimes);

    expect(result.get("loc1")?.get("loc2")).toBe(20);
  });
});

describe("getTravelTime", () => {
  test("returns correct travel time for existing entry", () => {
    const travelTimeMap = new Map<string, Map<string, number>>();
    const innerMap = new Map<string, number>();
    innerMap.set("loc2", 15);
    travelTimeMap.set("loc1", innerMap);

    expect(getTravelTime(travelTimeMap, "loc1", "loc2")).toBe(15);
  });

  test("returns default value for missing from location", () => {
    const travelTimeMap = new Map<string, Map<string, number>>();

    expect(getTravelTime(travelTimeMap, "nonexistent", "loc2")).toBe(
      DEFAULT_TRAVEL_TIME_MINUTES
    );
    expect(getTravelTime(travelTimeMap, "nonexistent", "loc2")).toBe(30);
  });

  test("returns default value for missing to location", () => {
    const travelTimeMap = new Map<string, Map<string, number>>();
    const innerMap = new Map<string, number>();
    innerMap.set("loc2", 15);
    travelTimeMap.set("loc1", innerMap);

    expect(getTravelTime(travelTimeMap, "loc1", "nonexistent")).toBe(
      DEFAULT_TRAVEL_TIME_MINUTES
    );
  });

  test("returns default value (30 min) for empty Map", () => {
    const travelTimeMap = new Map<string, Map<string, number>>();

    expect(getTravelTime(travelTimeMap, "loc1", "loc2")).toBe(30);
  });
});

describe("filterTravelTimesForLocations", () => {
  test("returns empty array for empty travel times", () => {
    const locationIds = new Set(["loc1", "loc2"]);
    const result = filterTravelTimesForLocations([], locationIds);

    expect(result).toEqual([]);
  });

  test("returns empty array for empty location IDs", () => {
    const travelTimes: TravelTimeEntry[] = [
      { fromLocationId: "loc1", toLocationId: "loc2", travelTimeMinutes: 15 },
    ];
    const locationIds = new Set<string>();

    const result = filterTravelTimesForLocations(travelTimes, locationIds);

    expect(result).toEqual([]);
  });

  test("filters to only include entries where both locations are in set", () => {
    const travelTimes: TravelTimeEntry[] = [
      { fromLocationId: "loc1", toLocationId: "loc2", travelTimeMinutes: 15 },
      { fromLocationId: "loc1", toLocationId: "loc3", travelTimeMinutes: 25 },
      { fromLocationId: "loc2", toLocationId: "loc1", travelTimeMinutes: 20 },
      { fromLocationId: "loc3", toLocationId: "loc4", travelTimeMinutes: 30 },
    ];
    const locationIds = new Set(["loc1", "loc2"]);

    const result = filterTravelTimesForLocations(travelTimes, locationIds);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      fromLocationId: "loc1",
      toLocationId: "loc2",
      travelTimeMinutes: 15,
    });
    expect(result).toContainEqual({
      fromLocationId: "loc2",
      toLocationId: "loc1",
      travelTimeMinutes: 20,
    });
  });

  test("excludes entries where only from location is in set", () => {
    const travelTimes: TravelTimeEntry[] = [
      { fromLocationId: "loc1", toLocationId: "loc3", travelTimeMinutes: 25 },
    ];
    const locationIds = new Set(["loc1", "loc2"]);

    const result = filterTravelTimesForLocations(travelTimes, locationIds);

    expect(result).toHaveLength(0);
  });

  test("excludes entries where only to location is in set", () => {
    const travelTimes: TravelTimeEntry[] = [
      { fromLocationId: "loc3", toLocationId: "loc1", travelTimeMinutes: 25 },
    ];
    const locationIds = new Set(["loc1", "loc2"]);

    const result = filterTravelTimesForLocations(travelTimes, locationIds);

    expect(result).toHaveLength(0);
  });

  test("preserves traffic condition in filtered results", () => {
    const travelTimes: TravelTimeEntry[] = [
      {
        fromLocationId: "loc1",
        toLocationId: "loc2",
        travelTimeMinutes: 15,
        trafficCondition: "heavy",
      },
    ];
    const locationIds = new Set(["loc1", "loc2"]);

    const result = filterTravelTimesForLocations(travelTimes, locationIds);

    expect(result).toHaveLength(1);
    expect(result[0].trafficCondition).toBe("heavy");
  });
});

describe("DEFAULT_TRAVEL_TIME_MINUTES", () => {
  test("is 30 minutes", () => {
    expect(DEFAULT_TRAVEL_TIME_MINUTES).toBe(30);
  });
});
