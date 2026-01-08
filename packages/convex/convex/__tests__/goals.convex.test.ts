/**
 * Goals calculations unit tests
 *
 * Note: These tests focus on the calculation logic that can be tested without
 * a full Convex database context. For full integration tests with convex-test,
 * additional setup would be needed.
 */
import { describe, it, expect } from "vitest";
import { timeToMinutes } from "../utils/time";

// Helper function that mirrors the batch progress calculation logic
function calculateProgressFromBlocks(
  blocks: Array<{ startTime: string; endTime: string; goalId?: string; status: string }>,
  goalId: string
): { completedMinutes: number; sessionsCompleted: number } {
  const goalBlocks = blocks.filter(
    (b) => b.goalId === goalId && b.status === "completed"
  );

  let completedMinutes = 0;
  for (const block of goalBlocks) {
    const startMinutes = timeToMinutes(block.startTime);
    const endMinutes = timeToMinutes(block.endTime);
    completedMinutes += endMinutes - startMinutes;
  }

  return {
    completedMinutes,
    sessionsCompleted: goalBlocks.length,
  };
}

// Helper function that mirrors percent calculation logic
function calculatePercentComplete(
  completedMinutes: number,
  weeklyTargetMinutes: number
): number {
  if (weeklyTargetMinutes <= 0) return 0;
  return Math.round((completedMinutes / weeklyTargetMinutes) * 100);
}

// Helper function that mirrors on-track calculation logic
function isOnTrack(
  percentComplete: number,
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
): boolean {
  // Expected progress: roughly (dayIndex / 7) * 100%
  const expectedProgress = Math.round((dayOfWeek / 7) * 100);
  return percentComplete >= expectedProgress - 10; // 10% buffer
}

describe("Goals Progress Calculation", () => {
  describe("calculateProgressFromBlocks", () => {
    it("should calculate progress from completed blocks", () => {
      const blocks = [
        { startTime: "09:00", endTime: "10:00", goalId: "goal1", status: "completed" },
        { startTime: "14:00", endTime: "15:30", goalId: "goal1", status: "completed" },
      ];

      const result = calculateProgressFromBlocks(blocks, "goal1");
      expect(result.completedMinutes).toBe(150); // 60 + 90 minutes
      expect(result.sessionsCompleted).toBe(2);
    });

    it("should return zero for empty goals array", () => {
      const result = calculateProgressFromBlocks([], "goal1");
      expect(result.completedMinutes).toBe(0);
      expect(result.sessionsCompleted).toBe(0);
    });

    it("should ignore blocks with wrong goalId", () => {
      const blocks = [
        { startTime: "09:00", endTime: "10:00", goalId: "goal1", status: "completed" },
        { startTime: "14:00", endTime: "15:30", goalId: "goal2", status: "completed" },
      ];

      const result = calculateProgressFromBlocks(blocks, "goal1");
      expect(result.completedMinutes).toBe(60);
      expect(result.sessionsCompleted).toBe(1);
    });

    it("should ignore non-completed blocks", () => {
      const blocks = [
        { startTime: "09:00", endTime: "10:00", goalId: "goal1", status: "completed" },
        { startTime: "14:00", endTime: "15:30", goalId: "goal1", status: "planned" },
        { startTime: "16:00", endTime: "17:00", goalId: "goal1", status: "skipped" },
      ];

      const result = calculateProgressFromBlocks(blocks, "goal1");
      expect(result.completedMinutes).toBe(60);
      expect(result.sessionsCompleted).toBe(1);
    });

    it("should handle blocks without goalId", () => {
      const blocks = [
        { startTime: "09:00", endTime: "10:00", status: "completed" },
        { startTime: "14:00", endTime: "15:30", goalId: "goal1", status: "completed" },
      ];

      const result = calculateProgressFromBlocks(blocks, "goal1");
      expect(result.completedMinutes).toBe(90);
      expect(result.sessionsCompleted).toBe(1);
    });
  });

  describe("calculatePercentComplete", () => {
    it("should calculate 100% for complete goal", () => {
      const result = calculatePercentComplete(300, 300);
      expect(result).toBe(100);
    });

    it("should calculate 50% for half complete goal", () => {
      const result = calculatePercentComplete(150, 300);
      expect(result).toBe(50);
    });

    it("should handle zero target (division by zero)", () => {
      const result = calculatePercentComplete(100, 0);
      expect(result).toBe(0);
    });

    it("should handle negative target", () => {
      const result = calculatePercentComplete(100, -300);
      expect(result).toBe(0);
    });

    it("should handle over 100% completion", () => {
      const result = calculatePercentComplete(600, 300);
      expect(result).toBe(200);
    });

    it("should round to nearest integer", () => {
      const result = calculatePercentComplete(100, 300);
      expect(result).toBe(33); // 33.33... rounds to 33
    });
  });

  describe("isOnTrack", () => {
    it("should be on track at 0% on Sunday (day 0)", () => {
      // Expected: 0%, buffer: -10%, so 0% >= -10% is true
      expect(isOnTrack(0, 0)).toBe(true);
    });

    it("should be on track at 50% on Thursday (day 4)", () => {
      // Expected: ~57%, buffer: 47%, so 50% >= 47% is true
      expect(isOnTrack(50, 4)).toBe(true);
    });

    it("should not be on track at 20% on Friday (day 5)", () => {
      // Expected: ~71%, buffer: 61%, so 20% < 61% is false
      expect(isOnTrack(20, 5)).toBe(false);
    });

    it("should be on track at 100% any day", () => {
      expect(isOnTrack(100, 0)).toBe(true);
      expect(isOnTrack(100, 3)).toBe(true);
      expect(isOnTrack(100, 6)).toBe(true);
    });

    it("should handle boundary at 10% buffer", () => {
      // On Wednesday (day 3), expected = ~43%, buffer = 33%
      expect(isOnTrack(33, 3)).toBe(true);
      expect(isOnTrack(32, 3)).toBe(false);
    });
  });

  describe("Week Boundary Calculations", () => {
    it("should correctly filter blocks within week", () => {
      const weekStartDate = "2025-01-06"; // Monday
      const weekEndDate = "2025-01-13"; // Following Monday

      const blocks = [
        { date: "2025-01-05", startTime: "09:00", endTime: "10:00", goalId: "goal1", status: "completed" }, // Before week
        { date: "2025-01-06", startTime: "09:00", endTime: "10:00", goalId: "goal1", status: "completed" }, // In week
        { date: "2025-01-10", startTime: "14:00", endTime: "15:30", goalId: "goal1", status: "completed" }, // In week
        { date: "2025-01-13", startTime: "09:00", endTime: "10:00", goalId: "goal1", status: "completed" }, // Boundary (exclusive)
      ];

      const weekBlocks = blocks.filter(
        (b) => b.date >= weekStartDate && b.date < weekEndDate && b.status === "completed"
      );

      expect(weekBlocks.length).toBe(2);
    });

    it("should handle week starting on Monday (ISO week)", () => {
      // Use explicit time to avoid timezone issues
      const weekStart = new Date("2025-01-06T12:00:00");
      const dayOfWeek = weekStart.getDay(); // Should be 1 (Monday)
      expect(dayOfWeek).toBe(1);
    });
  });

  describe("Edge Cases for Multiple Goals", () => {
    it("should separate progress for different goals", () => {
      const blocks = [
        { startTime: "09:00", endTime: "10:00", goalId: "goal1", status: "completed" },
        { startTime: "11:00", endTime: "12:00", goalId: "goal2", status: "completed" },
        { startTime: "14:00", endTime: "15:00", goalId: "goal1", status: "completed" },
      ];

      const goal1Result = calculateProgressFromBlocks(blocks, "goal1");
      const goal2Result = calculateProgressFromBlocks(blocks, "goal2");

      expect(goal1Result.completedMinutes).toBe(120);
      expect(goal1Result.sessionsCompleted).toBe(2);
      expect(goal2Result.completedMinutes).toBe(60);
      expect(goal2Result.sessionsCompleted).toBe(1);
    });

    it("should handle goal with no blocks", () => {
      const blocks = [
        { startTime: "09:00", endTime: "10:00", goalId: "goal1", status: "completed" },
      ];

      const result = calculateProgressFromBlocks(blocks, "goal2");
      expect(result.completedMinutes).toBe(0);
      expect(result.sessionsCompleted).toBe(0);
    });
  });
});
