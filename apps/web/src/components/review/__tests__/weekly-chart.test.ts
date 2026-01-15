import { describe, it, expect } from "vitest"
import { getBarColor, type DayOfWeek } from "../weekly-chart"

describe("getBarColor", () => {
  const GREEN = "hsl(142 76% 36%)"
  const AMBER = "hsl(38 92% 50%)"
  const PRIMARY = "hsl(var(--primary))"
  const MUTED = "hsl(var(--muted-foreground))"

  describe("best/worst day highlighting", () => {
    it("returns green for best day regardless of rate", () => {
      const result = getBarColor("mon", 50, "mon", null)
      expect(result).toBe(GREEN)
    })

    it("returns amber for worst day regardless of rate", () => {
      const result = getBarColor("tue", 90, null, "tue")
      expect(result).toBe(AMBER)
    })

    it("prioritizes best day over worst day when same", () => {
      // If a day is both best and worst (edge case), best takes priority
      const result = getBarColor("wed", 75, "wed", "wed")
      expect(result).toBe(GREEN)
    })
  })

  describe("rate-based colors (no best/worst)", () => {
    it("returns green for 80% or higher completion", () => {
      expect(getBarColor("mon", 80, null, null)).toBe(GREEN)
      expect(getBarColor("mon", 90, null, null)).toBe(GREEN)
      expect(getBarColor("mon", 100, null, null)).toBe(GREEN)
    })

    it("returns primary for 60-79% completion", () => {
      expect(getBarColor("mon", 60, null, null)).toBe(PRIMARY)
      expect(getBarColor("mon", 70, null, null)).toBe(PRIMARY)
      expect(getBarColor("mon", 79, null, null)).toBe(PRIMARY)
    })

    it("returns amber for 40-59% completion", () => {
      expect(getBarColor("mon", 40, null, null)).toBe(AMBER)
      expect(getBarColor("mon", 50, null, null)).toBe(AMBER)
      expect(getBarColor("mon", 59, null, null)).toBe(AMBER)
    })

    it("returns muted for below 40% completion", () => {
      expect(getBarColor("mon", 0, null, null)).toBe(MUTED)
      expect(getBarColor("mon", 20, null, null)).toBe(MUTED)
      expect(getBarColor("mon", 39, null, null)).toBe(MUTED)
    })
  })

  describe("edge cases", () => {
    it("handles 0% completion rate", () => {
      expect(getBarColor("mon", 0, null, null)).toBe(MUTED)
    })

    it("handles 100% completion rate", () => {
      expect(getBarColor("mon", 100, null, null)).toBe(GREEN)
    })

    it("handles undefined best/worst days", () => {
      expect(getBarColor("mon", 75, undefined, undefined)).toBe(PRIMARY)
    })

    it("works with all days of the week", () => {
      const days: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
      days.forEach((day) => {
        expect(getBarColor(day, 50, null, null)).toBe(AMBER)
      })
    })
  })
})
