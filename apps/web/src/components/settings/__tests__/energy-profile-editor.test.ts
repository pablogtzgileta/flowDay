import { describe, it, expect } from "vitest"
import { cycleEnergyLevel } from "../energy-profile-editor"

describe("cycleEnergyLevel", () => {
  it("cycles low to medium", () => {
    expect(cycleEnergyLevel("low")).toBe("medium")
  })

  it("cycles medium to high", () => {
    expect(cycleEnergyLevel("medium")).toBe("high")
  })

  it("cycles high back to low", () => {
    expect(cycleEnergyLevel("high")).toBe("low")
  })

  it("completes a full cycle correctly", () => {
    let level = "low" as const
    level = cycleEnergyLevel(level)
    expect(level).toBe("medium")

    level = cycleEnergyLevel(level)
    expect(level).toBe("high")

    level = cycleEnergyLevel(level)
    expect(level).toBe("low")
  })
})
