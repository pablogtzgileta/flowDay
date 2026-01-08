import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { timeToMinutes } from "../utils/time";

/**
 * Tests for scheduler helper functions.
 *
 * Note: The main scheduler functions (populateDailyRoutines, processRollover, etc.)
 * are internalMutation/internalQuery and require convex-test for full integration testing.
 * These tests focus on the pure utility functions used by the scheduler.
 */

// Re-implement calculateNotifyAt logic for testing (mirrors scheduler.ts implementation)
// This is a pure function that can be tested without Convex context
function calculateNotifyAt(params: {
  date: string;
  startTime: string;
  prepBuffer: number;
  estimatedTravelTime?: number;
  sleepTime: string;
  wakeTime: string;
  timezone: string;
}): number | undefined {
  const {
    date,
    startTime,
    prepBuffer,
    estimatedTravelTime,
    sleepTime,
    wakeTime,
    timezone,
  } = params;

  // Parse start time into a UTC timestamp, respecting user's timezone
  const blockStartMs = getTimestampForTimezone(date, startTime, timezone);

  // Calculate notification time
  let notifyMinutesBefore = prepBuffer + 5; // 5 min default buffer
  if (estimatedTravelTime) {
    notifyMinutesBefore += estimatedTravelTime;
  }

  const notifyAtMs = blockStartMs - notifyMinutesBefore * 60 * 1000;

  // Check quiet hours in user's timezone
  const { hours: notifyHour, minutes: notifyMin } = getTimeInTimezone(
    notifyAtMs,
    timezone
  );
  const notifyMinutes = notifyHour * 60 + notifyMin;
  const sleepMinutes = timeToMinutes(sleepTime);
  const wakeMinutes = timeToMinutes(wakeTime);

  let isQuietHours = false;
  if (sleepMinutes > wakeMinutes) {
    // Overnight case (e.g., sleep 23:00, wake 07:00)
    isQuietHours = notifyMinutes >= sleepMinutes || notifyMinutes < wakeMinutes;
  } else {
    isQuietHours = notifyMinutes >= sleepMinutes && notifyMinutes < wakeMinutes;
  }

  if (isQuietHours || notifyAtMs <= Date.now()) {
    return undefined;
  }

  return notifyAtMs;
}

// Helper function to get timestamp for timezone (mirrors scheduler.ts)
function getTimestampForTimezone(
  dateStr: string,
  timeStr: string,
  timezone: string
): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);

  const targetDate = new Date(
    Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0, 0)
  );

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(targetDate);
  const tzHour = parseInt(
    parts.find((p) => p.type === "hour")?.value ?? "0",
    10
  );
  const tzMinute = parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10
  );

  const utcMinutes = (hours ?? 0) * 60 + (minutes ?? 0);
  const tzMinutes = tzHour * 60 + tzMinute;
  let offsetMinutes = tzMinutes - utcMinutes;

  if (offsetMinutes > 720) offsetMinutes -= 1440;
  if (offsetMinutes < -720) offsetMinutes += 1440;

  return targetDate.getTime() - offsetMinutes * 60 * 1000;
}

// Helper function to get time in timezone (mirrors scheduler.ts)
function getTimeInTimezone(
  timestampMs: number,
  timezone: string
): { hours: number; minutes: number } {
  const date = new Date(timestampMs);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hours = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minutes = parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10
  );

  return { hours, minutes };
}

describe("calculateNotifyAt", () => {
  // Mock Date.now for consistent testing
  let originalDateNow: typeof Date.now;
  const mockNow = new Date("2024-01-15T08:00:00Z").getTime();

  beforeEach(() => {
    originalDateNow = Date.now;
    vi.spyOn(Date, "now").mockImplementation(() => mockNow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("basic notification timing", () => {
    it("should calculate notification time with prep buffer", () => {
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "14:00",
        prepBuffer: 10,
        sleepTime: "22:00",
        wakeTime: "07:00",
        timezone: "UTC",
      });

      expect(result).toBeDefined();
      // 14:00 - 10 min prep - 5 min buffer = 13:45 UTC
      const resultDate = new Date(result!);
      expect(resultDate.getUTCHours()).toBe(13);
      expect(resultDate.getUTCMinutes()).toBe(45);
    });

    it("should add travel time when specified", () => {
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "14:00",
        prepBuffer: 10,
        estimatedTravelTime: 20,
        sleepTime: "22:00",
        wakeTime: "07:00",
        timezone: "UTC",
      });

      expect(result).toBeDefined();
      // 14:00 - 10 prep - 20 travel - 5 buffer = 13:25 UTC
      const resultDate = new Date(result!);
      expect(resultDate.getUTCHours()).toBe(13);
      expect(resultDate.getUTCMinutes()).toBe(25);
    });

    it("should use only 5 min buffer when prep is 0", () => {
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "14:00",
        prepBuffer: 0,
        sleepTime: "22:00",
        wakeTime: "07:00",
        timezone: "UTC",
      });

      expect(result).toBeDefined();
      // 14:00 - 0 prep - 5 buffer = 13:55 UTC
      const resultDate = new Date(result!);
      expect(resultDate.getUTCHours()).toBe(13);
      expect(resultDate.getUTCMinutes()).toBe(55);
    });
  });

  describe("blocks starting in less than 5 minutes", () => {
    it("should return undefined for blocks starting immediately", () => {
      // Mock now is 08:00 UTC
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "08:03", // 3 minutes from now
        prepBuffer: 0,
        sleepTime: "22:00",
        wakeTime: "07:00",
        timezone: "UTC",
      });

      // 08:03 - 5 buffer = 07:58, which is before 08:00 (now)
      expect(result).toBeUndefined();
    });

    it("should return undefined for blocks starting in exactly 5 minutes", () => {
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "08:05", // 5 minutes from now
        prepBuffer: 0,
        sleepTime: "22:00",
        wakeTime: "07:00",
        timezone: "UTC",
      });

      // 08:05 - 5 buffer = 08:00 (now), not > now so undefined
      expect(result).toBeUndefined();
    });

    it("should return defined for blocks starting in 6 minutes", () => {
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "08:06", // 6 minutes from now
        prepBuffer: 0,
        sleepTime: "22:00",
        wakeTime: "07:00",
        timezone: "UTC",
      });

      // 08:06 - 5 buffer = 08:01, which is > 08:00 (now)
      expect(result).toBeDefined();
    });
  });

  describe("blocks at midnight", () => {
    it("should handle blocks at midnight with overnight quiet hours", () => {
      const result = calculateNotifyAt({
        date: "2024-01-16",
        startTime: "00:00",
        prepBuffer: 10,
        sleepTime: "22:00",
        wakeTime: "07:00",
        timezone: "UTC",
      });

      // 00:00 - 10 - 5 = 23:45 of previous day, which is in quiet hours
      expect(result).toBeUndefined();
    });

    it("should allow midnight blocks when quiet hours end before midnight", () => {
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "23:30",
        prepBuffer: 10,
        sleepTime: "01:00", // Quiet hours 01:00-07:00
        wakeTime: "07:00",
        timezone: "UTC",
      });

      // 23:30 - 15 = 23:15, not in quiet hours (01:00-07:00)
      expect(result).toBeDefined();
    });
  });

  describe("past dates handling", () => {
    it("should return undefined for blocks in the past", () => {
      const result = calculateNotifyAt({
        date: "2024-01-14", // Yesterday
        startTime: "14:00",
        prepBuffer: 10,
        sleepTime: "22:00",
        wakeTime: "07:00",
        timezone: "UTC",
      });

      expect(result).toBeUndefined();
    });

    it("should return undefined for blocks earlier today", () => {
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "07:00", // Before mock now (08:00)
        prepBuffer: 10,
        sleepTime: "22:00",
        wakeTime: "06:00",
        timezone: "UTC",
      });

      expect(result).toBeUndefined();
    });
  });

  describe("quiet hours handling", () => {
    it("should return undefined when notification falls in quiet hours", () => {
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "23:30", // Late night
        prepBuffer: 10,
        sleepTime: "22:00",
        wakeTime: "07:00",
        timezone: "UTC",
      });

      // 23:30 - 15 = 23:15, which is in quiet hours (after 22:00)
      expect(result).toBeUndefined();
    });

    it("should return undefined for early morning notification in quiet hours", () => {
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "07:10",
        prepBuffer: 10,
        sleepTime: "22:00",
        wakeTime: "07:00",
        timezone: "UTC",
      });

      // 07:10 - 15 = 06:55, which is in quiet hours (before 07:00)
      expect(result).toBeUndefined();
    });

    it("should return defined just after quiet hours end", () => {
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "10:00",
        prepBuffer: 10,
        sleepTime: "22:00",
        wakeTime: "07:00",
        timezone: "UTC",
      });

      // 10:00 - 15 = 09:45, after wake time
      expect(result).toBeDefined();
    });
  });

  describe("timezone handling", () => {
    it("should handle America/New_York timezone", () => {
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "14:00", // 2 PM EST = 19:00 UTC
        prepBuffer: 10,
        sleepTime: "22:00",
        wakeTime: "07:00",
        timezone: "America/New_York",
      });

      expect(result).toBeDefined();
      const resultDate = new Date(result!);
      // 14:00 EST - 15 min = 13:45 EST = 18:45 UTC
      expect(resultDate.getUTCHours()).toBe(18);
      expect(resultDate.getUTCMinutes()).toBe(45);
    });

    it("should handle America/Los_Angeles timezone", () => {
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "14:00", // 2 PM PST = 22:00 UTC
        prepBuffer: 10,
        sleepTime: "22:00",
        wakeTime: "07:00",
        timezone: "America/Los_Angeles",
      });

      expect(result).toBeDefined();
      const resultDate = new Date(result!);
      // 14:00 PST - 15 min = 13:45 PST = 21:45 UTC
      expect(resultDate.getUTCHours()).toBe(21);
      expect(resultDate.getUTCMinutes()).toBe(45);
    });

    it("should handle quiet hours check in user timezone", () => {
      // Test that quiet hours are evaluated in the user's timezone
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "07:20", // Would notify at 07:05 in user timezone
        prepBuffer: 10,
        sleepTime: "22:00",
        wakeTime: "07:00",
        timezone: "America/New_York", // EST is UTC-5
      });

      // In EST: 07:20 - 15 = 07:05, which is after 07:00 wake time
      expect(result).toBeDefined();
    });
  });

  describe("large prep and travel times", () => {
    it("should handle very large travel time", () => {
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "18:00",
        prepBuffer: 30,
        estimatedTravelTime: 120, // 2 hours
        sleepTime: "22:00",
        wakeTime: "07:00",
        timezone: "UTC",
      });

      // 18:00 - 30 - 120 - 5 = 15:25
      expect(result).toBeDefined();
      const resultDate = new Date(result!);
      expect(resultDate.getUTCHours()).toBe(15);
      expect(resultDate.getUTCMinutes()).toBe(25);
    });

    it("should handle notification time crossing into quiet hours due to large buffer", () => {
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "09:00",
        prepBuffer: 60, // 1 hour prep
        estimatedTravelTime: 60, // 1 hour travel
        sleepTime: "22:00",
        wakeTime: "07:00",
        timezone: "UTC",
      });

      // 09:00 - 60 - 60 - 5 = 06:55, which is in quiet hours
      expect(result).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle undefined travel time", () => {
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "14:00",
        prepBuffer: 10,
        estimatedTravelTime: undefined,
        sleepTime: "22:00",
        wakeTime: "07:00",
        timezone: "UTC",
      });

      expect(result).toBeDefined();
      // 14:00 - 10 - 5 = 13:45
      const resultDate = new Date(result!);
      expect(resultDate.getUTCHours()).toBe(13);
      expect(resultDate.getUTCMinutes()).toBe(45);
    });

    it("should handle same sleep and wake time (no quiet hours)", () => {
      const result = calculateNotifyAt({
        date: "2024-01-15",
        startTime: "14:00",
        prepBuffer: 10,
        sleepTime: "22:00",
        wakeTime: "22:00", // Same as sleep
        timezone: "UTC",
      });

      // No quiet hours, should work
      expect(result).toBeDefined();
    });
  });
});

describe("getTimestampForTimezone", () => {
  it("should convert local time to correct UTC timestamp for UTC timezone", () => {
    const result = getTimestampForTimezone("2024-01-15", "14:00", "UTC");
    const date = new Date(result);
    expect(date.getUTCHours()).toBe(14);
    expect(date.getUTCMinutes()).toBe(0);
  });

  it("should convert local time to correct UTC timestamp for EST", () => {
    const result = getTimestampForTimezone("2024-01-15", "14:00", "America/New_York");
    const date = new Date(result);
    // 14:00 EST = 19:00 UTC
    expect(date.getUTCHours()).toBe(19);
    expect(date.getUTCMinutes()).toBe(0);
  });

  it("should convert local time to correct UTC timestamp for PST", () => {
    const result = getTimestampForTimezone("2024-01-15", "14:00", "America/Los_Angeles");
    const date = new Date(result);
    // 14:00 PST = 22:00 UTC
    expect(date.getUTCHours()).toBe(22);
    expect(date.getUTCMinutes()).toBe(0);
  });

  it("should handle midnight correctly", () => {
    const result = getTimestampForTimezone("2024-01-15", "00:00", "UTC");
    const date = new Date(result);
    expect(date.getUTCHours()).toBe(0);
    expect(date.getUTCMinutes()).toBe(0);
  });
});

describe("getTimeInTimezone", () => {
  it("should return correct time for UTC", () => {
    const timestamp = new Date("2024-01-15T14:30:00Z").getTime();
    const result = getTimeInTimezone(timestamp, "UTC");
    expect(result.hours).toBe(14);
    expect(result.minutes).toBe(30);
  });

  it("should return correct time for America/New_York", () => {
    const timestamp = new Date("2024-01-15T19:30:00Z").getTime();
    const result = getTimeInTimezone(timestamp, "America/New_York");
    // 19:30 UTC = 14:30 EST
    expect(result.hours).toBe(14);
    expect(result.minutes).toBe(30);
  });

  it("should handle day boundary crossings", () => {
    // 01:00 UTC on Jan 15 = 20:00 EST on Jan 14
    const timestamp = new Date("2024-01-15T01:00:00Z").getTime();
    const result = getTimeInTimezone(timestamp, "America/New_York");
    expect(result.hours).toBe(20);
    expect(result.minutes).toBe(0);
  });
});
