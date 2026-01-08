import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { timeToMinutes, minutesToTime, timeToHour } from "../time";
import { timesOverlap } from "../validation";

// Configure fast-check to run 1000 iterations per property
const fcOptions = { numRuns: 1000 };

describe("Time Utilities - Property-Based Tests", () => {
  describe("Roundtrip Properties", () => {
    it("minutesToTime(timeToMinutes(x)) should preserve valid times", () => {
      // Generate valid minutes (0-1439)
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 1439 }), (minutes) => {
          const time = minutesToTime(minutes);
          const result = timeToMinutes(time);
          expect(result).toBe(minutes);
        }),
        fcOptions
      );
    });

    it("timeToMinutes(minutesToTime(x)) should be identity for valid minutes", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 1439 }), (minutes) => {
          const time = minutesToTime(minutes);
          const roundtrip = timeToMinutes(time);
          expect(roundtrip).toBe(minutes);
        }),
        fcOptions
      );
    });
  });

  describe("Range Properties", () => {
    it("timeToMinutes should always return values in [0, 1439]", () => {
      // Generate valid time strings
      const validTimeArb = fc
        .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
        .map(([h, m]) => `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);

      fc.assert(
        fc.property(validTimeArb, (time) => {
          const minutes = timeToMinutes(time);
          expect(minutes).toBeGreaterThanOrEqual(0);
          expect(minutes).toBeLessThanOrEqual(1439);
        }),
        fcOptions
      );
    });

    it("timeToHour should always return values in [0, 23]", () => {
      const validTimeArb = fc
        .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
        .map(([h, m]) => `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);

      fc.assert(
        fc.property(validTimeArb, (time) => {
          const hour = timeToHour(time);
          expect(hour).toBeGreaterThanOrEqual(0);
          expect(hour).toBeLessThanOrEqual(23);
        }),
        fcOptions
      );
    });

    it("minutesToTime should always return valid HH:MM format", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 1439 }), (minutes) => {
          const time = minutesToTime(minutes);
          expect(time).toMatch(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/);
        }),
        fcOptions
      );
    });
  });

  describe("Consistency Properties", () => {
    it("timeToHour should equal floor(timeToMinutes / 60)", () => {
      const validTimeArb = fc
        .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
        .map(([h, m]) => `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);

      fc.assert(
        fc.property(validTimeArb, (time) => {
          const hour = timeToHour(time);
          const minutes = timeToMinutes(time);
          expect(hour).toBe(Math.floor(minutes / 60));
        }),
        fcOptions
      );
    });

    it("consecutive minutes should produce adjacent times", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 1438 }), (minutes) => {
          const time1 = minutesToTime(minutes);
          const time2 = minutesToTime(minutes + 1);

          const m1 = timeToMinutes(time1);
          const m2 = timeToMinutes(time2);

          expect(m2 - m1).toBe(1);
        }),
        fcOptions
      );
    });
  });

  describe("timesOverlap Symmetry Properties", () => {
    it("timesOverlap(a, b) should equal timesOverlap(b, a)", () => {
      // Generate valid time ranges (start < end)
      const timeRangeArb = fc
        .tuple(
          fc.integer({ min: 0, max: 1438 }),
          fc.integer({ min: 1, max: 1439 })
        )
        .filter(([start, end]) => start < end);

      fc.assert(
        fc.property(timeRangeArb, timeRangeArb, ([aStart, aEnd], [bStart, bEnd]) => {
          const result1 = timesOverlap(aStart, aEnd, bStart, bEnd);
          const result2 = timesOverlap(bStart, bEnd, aStart, aEnd);
          expect(result1).toBe(result2);
        }),
        fcOptions
      );
    });

    it("a range should always overlap with itself", () => {
      const timeRangeArb = fc
        .tuple(
          fc.integer({ min: 0, max: 1438 }),
          fc.integer({ min: 1, max: 1439 })
        )
        .filter(([start, end]) => start < end);

      fc.assert(
        fc.property(timeRangeArb, ([start, end]) => {
          expect(timesOverlap(start, end, start, end)).toBe(true);
        }),
        fcOptions
      );
    });

    it("non-overlapping ranges should be correctly detected", () => {
      // Generate two non-overlapping ranges: [a, b) and [c, d) where b <= c
      const nonOverlappingArb = fc
        .tuple(
          fc.integer({ min: 0, max: 700 }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 0, max: 100 })
        )
        .map(([aStart, duration1, gap]) => {
          const aEnd = aStart + duration1;
          const bStart = aEnd + gap;
          const bEnd = bStart + duration1;
          return { aStart, aEnd, bStart, bEnd };
        })
        .filter(({ bEnd }) => bEnd <= 1439);

      fc.assert(
        fc.property(nonOverlappingArb, ({ aStart, aEnd, bStart, bEnd }) => {
          if (aEnd <= bStart) {
            expect(timesOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
          }
        }),
        fcOptions
      );
    });

    it("overlapping ranges should be correctly detected", () => {
      // Generate two overlapping ranges where overlap is guaranteed
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 800 }),
          fc.integer({ min: 100, max: 300 }),
          fc.integer({ min: 1, max: 99 }),
          (start, duration, overlapAmount) => {
            // Ensure overlapAmount is less than duration to guarantee overlap
            const actualOverlap = Math.min(overlapAmount, duration - 1);
            const aStart = start;
            const aEnd = start + duration;
            // bStart is positioned so it overlaps with range a
            const bStart = aEnd - actualOverlap;
            const bEnd = bStart + duration;

            // Only test if both ranges are within valid bounds
            if (bEnd <= 1439 && bStart >= 0 && bStart < aEnd) {
              expect(timesOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
            }
          }
        ),
        fcOptions
      );
    });
  });

  describe("Edge Case Properties", () => {
    it("midnight (00:00) should convert to 0 minutes", () => {
      expect(timeToMinutes("00:00")).toBe(0);
      expect(minutesToTime(0)).toBe("00:00");
    });

    it("end of day (23:59) should convert to 1439 minutes", () => {
      expect(timeToMinutes("23:59")).toBe(1439);
      expect(minutesToTime(1439)).toBe("23:59");
    });

    it("single-digit hours should be handled", () => {
      // With leading zero
      expect(timeToMinutes("09:30")).toBe(9 * 60 + 30);
      // Without leading zero (allowed by regex)
      expect(timeToMinutes("9:30")).toBe(9 * 60 + 30);
    });
  });
});
