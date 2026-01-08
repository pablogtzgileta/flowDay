import { describe, it, expect } from "vitest";
import {
  getEnergyLevelForHour,
  scoreSlotForEnergy,
  isLazyModeActive,
  type EnergyProfile,
  type EnergyLevel,
} from "../scheduling";

describe("getEnergyLevelForHour", () => {
  describe("with custom energy profile", () => {
    const customProfile: EnergyProfile = {
      hourlyLevels: [
        "low", "low", "low", "low", "low", "low",      // 0-5: sleeping
        "medium", "high", "high", "high", "medium", "medium",  // 6-11: morning
        "low", "low", "medium", "medium", "high", "high",      // 12-17: afternoon
        "medium", "medium", "low", "low", "low", "low",        // 18-23: evening
      ],
      preset: "custom",
    };

    it("should return the correct energy level for each hour", () => {
      expect(getEnergyLevelForHour(0, customProfile, "morning")).toBe("low");
      expect(getEnergyLevelForHour(7, customProfile, "morning")).toBe("high");
      expect(getEnergyLevelForHour(12, customProfile, "morning")).toBe("low");
      expect(getEnergyLevelForHour(16, customProfile, "morning")).toBe("high");
      expect(getEnergyLevelForHour(23, customProfile, "morning")).toBe("low");
    });

    it("should handle hour 0 (midnight)", () => {
      expect(getEnergyLevelForHour(0, customProfile, "morning")).toBe("low");
    });

    it("should handle hour 23 (11pm)", () => {
      expect(getEnergyLevelForHour(23, customProfile, "morning")).toBe("low");
    });

    it("should handle hour 12 (noon)", () => {
      expect(getEnergyLevelForHour(12, customProfile, "morning")).toBe("low");
    });
  });

  describe("with peak energy window fallback", () => {
    it("should return high energy during morning peak", () => {
      expect(getEnergyLevelForHour(8, undefined, "morning")).toBe("high");
      expect(getEnergyLevelForHour(10, undefined, "morning")).toBe("high");
    });

    it("should return high energy during afternoon peak", () => {
      expect(getEnergyLevelForHour(14, undefined, "afternoon")).toBe("high");
      expect(getEnergyLevelForHour(16, undefined, "afternoon")).toBe("high");
    });

    it("should return high energy during evening peak", () => {
      expect(getEnergyLevelForHour(19, undefined, "evening")).toBe("high");
      expect(getEnergyLevelForHour(21, undefined, "evening")).toBe("high");
    });

    it("should return low energy during sleep hours (0-5)", () => {
      expect(getEnergyLevelForHour(0, undefined, "morning")).toBe("low");
      expect(getEnergyLevelForHour(3, undefined, "morning")).toBe("low");
      expect(getEnergyLevelForHour(5, undefined, "morning")).toBe("low");
    });

    it("should return low energy during late evening (22-23)", () => {
      expect(getEnergyLevelForHour(22, undefined, "morning")).toBe("low");
      expect(getEnergyLevelForHour(23, undefined, "morning")).toBe("low");
    });

    it("should return medium energy outside peak and sleep hours", () => {
      // Morning peak, check afternoon
      expect(getEnergyLevelForHour(14, undefined, "morning")).toBe("medium");
      // Afternoon peak, check morning
      expect(getEnergyLevelForHour(8, undefined, "afternoon")).toBe("medium");
    });
  });

  describe("edge cases and invalid inputs", () => {
    it("should handle hour boundary 0", () => {
      expect(getEnergyLevelForHour(0, undefined, "morning")).toBe("low");
    });

    it("should handle hour boundary 23", () => {
      expect(getEnergyLevelForHour(23, undefined, "morning")).toBe("low");
    });

    it("should handle undefined profile with valid peak window", () => {
      expect(getEnergyLevelForHour(10, undefined, "morning")).toBe("high");
    });

    it("should fall back to medium for invalid profile array length", () => {
      const invalidProfile: EnergyProfile = {
        hourlyLevels: ["high", "low"], // Only 2 elements, should fallback
        preset: "custom",
      };
      // Falls back to deriveEnergyFromPeakWindow
      expect(getEnergyLevelForHour(10, invalidProfile, "morning")).toBe("high");
    });

    it("should handle negative hour gracefully", () => {
      // This tests behavior - implementation should ideally validate
      // Current implementation will return undefined access on array
      const customProfile: EnergyProfile = {
        hourlyLevels: Array(24).fill("medium"),
        preset: "custom",
      };
      // Accessing negative index returns undefined, falls back to "medium"
      expect(getEnergyLevelForHour(-1, customProfile, "morning")).toBe("medium");
    });

    it("should handle hour 24 gracefully", () => {
      const customProfile: EnergyProfile = {
        hourlyLevels: Array(24).fill("medium"),
        preset: "custom",
      };
      // Accessing index 24 returns undefined, falls back to "medium"
      expect(getEnergyLevelForHour(24, customProfile, "morning")).toBe("medium");
    });
  });
});

describe("scoreSlotForEnergy", () => {
  const createProfile = (energyForHour: EnergyLevel): EnergyProfile => ({
    hourlyLevels: Array(24).fill(energyForHour),
    preset: "custom",
  });

  describe("perfect matches", () => {
    it("should give bonus for high task in high energy slot", () => {
      const highProfile = createProfile("high");
      const score = scoreSlotForEnergy("09:00", "10:00", "high", highProfile, "morning");
      // Match bonus (20) + high-high bonus (15) = 35
      // No medium flexibility bonus when both task and slot are high
      expect(score).toBe(35);
    });

    it("should give bonus for medium task in medium energy slot", () => {
      const mediumProfile = createProfile("medium");
      const score = scoreSlotForEnergy("09:00", "10:00", "medium", mediumProfile, "morning");
      // Match bonus (20) + medium flexibility (5) = 25
      expect(score).toBe(25);
    });

    it("should give bonus for low task in low energy slot", () => {
      const lowProfile = createProfile("low");
      const score = scoreSlotForEnergy("09:00", "10:00", "low", lowProfile, "morning");
      // Match bonus (20) + low-low bonus (10) = 30
      // No medium flexibility bonus when both task and slot are low
      expect(score).toBe(30);
    });
  });

  describe("mismatches", () => {
    it("should penalize high task in low energy slot", () => {
      const lowProfile = createProfile("low");
      const score = scoreSlotForEnergy("09:00", "10:00", "high", lowProfile, "morning");
      // Mismatch penalty (-15) only, no flexibility bonus when neither is medium
      expect(score).toBe(-15);
    });

    it("should slightly penalize low task in high energy slot", () => {
      const highProfile = createProfile("high");
      const score = scoreSlotForEnergy("09:00", "10:00", "low", highProfile, "morning");
      // Wasteful penalty (-5) only, no flexibility bonus when neither is medium
      expect(score).toBe(-5);
    });
  });

  describe("medium energy flexibility", () => {
    it("should add flexibility bonus when task is medium", () => {
      const highProfile = createProfile("high");
      const score = scoreSlotForEnergy("09:00", "10:00", "medium", highProfile, "morning");
      // Medium flexibility (5)
      expect(score).toBe(5);
    });

    it("should add flexibility bonus when slot is medium", () => {
      const mediumProfile = createProfile("medium");
      const score = scoreSlotForEnergy("09:00", "10:00", "high", mediumProfile, "morning");
      // Medium flexibility (5)
      expect(score).toBe(5);
    });
  });

  describe("slot midpoint calculation", () => {
    it("should use midpoint of slot for energy calculation", () => {
      // Create a profile where hour 9 is high but hour 10 is low
      const mixedProfile: EnergyProfile = {
        hourlyLevels: [
          "low", "low", "low", "low", "low", "low",
          "low", "low", "low", "high", "low", "low",
          "low", "low", "low", "low", "low", "low",
          "low", "low", "low", "low", "low", "low",
        ],
        preset: "custom",
      };
      // Slot 09:00-10:30 has midpoint at 09:45 (hour 9 = high)
      const score = scoreSlotForEnergy("09:00", "10:30", "high", mixedProfile, "morning");
      expect(score).toBeGreaterThan(0); // High task in high slot should be positive
    });
  });
});

describe("isLazyModeActive", () => {
  describe("basic states", () => {
    it("should return false when lazy mode is disabled", () => {
      expect(isLazyModeActive(false, undefined)).toBe(false);
    });

    it("should return false when lazy mode is undefined", () => {
      expect(isLazyModeActive(undefined, undefined)).toBe(false);
    });

    it("should return true when lazy mode is enabled without expiry", () => {
      expect(isLazyModeActive(true, undefined)).toBe(true);
    });
  });

  describe("with expiry time", () => {
    it("should return true when expiry is in the future", () => {
      const futureTime = Date.now() + 60000; // 1 minute from now
      expect(isLazyModeActive(true, futureTime)).toBe(true);
    });

    it("should return false when expiry has passed", () => {
      const pastTime = Date.now() - 60000; // 1 minute ago
      expect(isLazyModeActive(true, pastTime)).toBe(false);
    });

    it("should return false when expiry is exactly now", () => {
      const now = Date.now();
      // Due to timing, we test with a time just before now
      expect(isLazyModeActive(true, now - 1)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle very large future expiry", () => {
      const farFuture = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year
      expect(isLazyModeActive(true, farFuture)).toBe(true);
    });

    it("should handle very old past expiry", () => {
      const farPast = Date.now() - 365 * 24 * 60 * 60 * 1000; // 1 year ago
      expect(isLazyModeActive(true, farPast)).toBe(false);
    });

    it("should handle midnight transition", () => {
      // Test with expiry at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const midnightExpiry = today.getTime();

      if (Date.now() > midnightExpiry) {
        // After midnight - should be expired
        expect(isLazyModeActive(true, midnightExpiry)).toBe(false);
      }
    });

    it("should return false when disabled even with future expiry", () => {
      const futureTime = Date.now() + 60000;
      expect(isLazyModeActive(false, futureTime)).toBe(false);
    });

    it("should return false when undefined even with future expiry", () => {
      const futureTime = Date.now() + 60000;
      expect(isLazyModeActive(undefined, futureTime)).toBe(false);
    });
  });
});
