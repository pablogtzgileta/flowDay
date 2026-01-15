import { describe, it, expect } from "vitest"
import {
  getEnergyForHour,
  calculateZones,
  formatHour,
  arraysEqual,
  type EnergyLevel,
} from "../energy-zone-indicator"

describe("getEnergyForHour", () => {
  describe("without custom profile (using peak window)", () => {
    it("returns low energy for early morning hours (0-6)", () => {
      expect(getEnergyForHour(0, undefined, "morning")).toBe("low")
      expect(getEnergyForHour(3, undefined, "morning")).toBe("low")
      expect(getEnergyForHour(5, undefined, "morning")).toBe("low")
    })

    it("returns low energy for late night hours (22+)", () => {
      expect(getEnergyForHour(22, undefined, "morning")).toBe("low")
      expect(getEnergyForHour(23, undefined, "morning")).toBe("low")
    })

    it("returns high energy during peak morning window (6-12)", () => {
      expect(getEnergyForHour(6, undefined, "morning")).toBe("high")
      expect(getEnergyForHour(9, undefined, "morning")).toBe("high")
      expect(getEnergyForHour(11, undefined, "morning")).toBe("high")
    })

    it("returns high energy during peak afternoon window (12-18)", () => {
      expect(getEnergyForHour(12, undefined, "afternoon")).toBe("high")
      expect(getEnergyForHour(15, undefined, "afternoon")).toBe("high")
      expect(getEnergyForHour(17, undefined, "afternoon")).toBe("high")
    })

    it("returns high energy during peak evening window (18-22)", () => {
      expect(getEnergyForHour(18, undefined, "evening")).toBe("high")
      expect(getEnergyForHour(20, undefined, "evening")).toBe("high")
      expect(getEnergyForHour(21, undefined, "evening")).toBe("high")
    })

    it("returns medium energy outside peak window but during active hours", () => {
      // Morning person: afternoon should be medium
      expect(getEnergyForHour(14, undefined, "morning")).toBe("medium")
      expect(getEnergyForHour(18, undefined, "morning")).toBe("medium")

      // Afternoon person: morning should be medium
      expect(getEnergyForHour(8, undefined, "afternoon")).toBe("medium")

      // Evening person: morning should be medium
      expect(getEnergyForHour(10, undefined, "evening")).toBe("medium")
    })
  })

  describe("with custom profile", () => {
    it("uses custom profile levels when available", () => {
      const customProfile = {
        hourlyLevels: Array(24).fill("medium") as EnergyLevel[],
        preset: "custom",
      }
      // Override some hours
      customProfile.hourlyLevels[9] = "high"
      customProfile.hourlyLevels[15] = "low"

      expect(getEnergyForHour(9, customProfile, "morning")).toBe("high")
      expect(getEnergyForHour(15, customProfile, "morning")).toBe("low")
      expect(getEnergyForHour(12, customProfile, "morning")).toBe("medium")
    })

    it("falls back to peak window when profile is incomplete", () => {
      const incompleteProfile = {
        hourlyLevels: ["high", "high"] as EnergyLevel[], // Only 2 entries, not 24
        preset: "custom",
      }

      // Should use peak window logic since profile doesn't have 24 hours
      expect(getEnergyForHour(9, incompleteProfile, "morning")).toBe("high")
      expect(getEnergyForHour(3, incompleteProfile, "morning")).toBe("low")
    })
  })
})

describe("calculateZones", () => {
  it("creates zones based on energy level changes", () => {
    const zones = calculateZones(7, 22, undefined, "morning")

    // Should have multiple zones for a morning person
    expect(zones.length).toBeGreaterThan(1)

    // First zone should start at wake hour
    expect(zones[0].startHour).toBe(7)

    // Last zone should end at sleep hour
    expect(zones[zones.length - 1].endHour).toBe(22)
  })

  it("creates correct zones for morning person", () => {
    const zones = calculateZones(6, 22, undefined, "morning")

    // Morning person: should have high energy from 6-12
    const highZone = zones.find(z => z.level === "high")
    expect(highZone).toBeDefined()
    expect(highZone?.startHour).toBe(6)
  })

  it("handles single energy level throughout the day", () => {
    const allMediumProfile = {
      hourlyLevels: Array(24).fill("medium") as EnergyLevel[],
      preset: "steady",
    }

    const zones = calculateZones(7, 22, allMediumProfile, "morning")

    // Should have just one zone
    expect(zones.length).toBe(1)
    expect(zones[0].level).toBe("medium")
    expect(zones[0].startHour).toBe(7)
    expect(zones[0].endHour).toBe(22)
  })
})

describe("formatHour", () => {
  it("formats midnight correctly", () => {
    expect(formatHour(0)).toBe("12 AM")
    expect(formatHour(24)).toBe("12 AM")
  })

  it("formats noon correctly", () => {
    expect(formatHour(12)).toBe("12 PM")
  })

  it("formats morning hours correctly", () => {
    expect(formatHour(1)).toBe("1 AM")
    expect(formatHour(6)).toBe("6 AM")
    expect(formatHour(9)).toBe("9 AM")
    expect(formatHour(11)).toBe("11 AM")
  })

  it("formats afternoon/evening hours correctly", () => {
    expect(formatHour(13)).toBe("1 PM")
    expect(formatHour(15)).toBe("3 PM")
    expect(formatHour(18)).toBe("6 PM")
    expect(formatHour(21)).toBe("9 PM")
    expect(formatHour(23)).toBe("11 PM")
  })
})

describe("arraysEqual", () => {
  it("returns true for same array reference", () => {
    const arr: EnergyLevel[] = ["high", "medium", "low"]
    expect(arraysEqual(arr, arr)).toBe(true)
  })

  it("returns true for arrays with same elements", () => {
    const arr1: EnergyLevel[] = ["high", "medium", "low"]
    const arr2: EnergyLevel[] = ["high", "medium", "low"]
    expect(arraysEqual(arr1, arr2)).toBe(true)
  })

  it("returns false for arrays with different elements", () => {
    const arr1: EnergyLevel[] = ["high", "medium", "low"]
    const arr2: EnergyLevel[] = ["high", "low", "medium"]
    expect(arraysEqual(arr1, arr2)).toBe(false)
  })

  it("returns false for arrays with different lengths", () => {
    const arr1: EnergyLevel[] = ["high", "medium"]
    const arr2: EnergyLevel[] = ["high", "medium", "low"]
    expect(arraysEqual(arr1, arr2)).toBe(false)
  })

  it("returns false when one array is undefined", () => {
    const arr: EnergyLevel[] = ["high", "medium", "low"]
    expect(arraysEqual(arr, undefined)).toBe(false)
    expect(arraysEqual(undefined, arr)).toBe(false)
  })

  it("returns true when both are undefined", () => {
    expect(arraysEqual(undefined, undefined)).toBe(true)
  })

  it("handles empty arrays", () => {
    expect(arraysEqual([], [])).toBe(true)
  })
})
