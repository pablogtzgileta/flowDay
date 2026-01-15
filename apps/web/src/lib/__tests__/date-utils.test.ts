import { describe, it, expect } from "vitest"
import { calculateDuration } from "../date-utils"

describe("calculateDuration", () => {
  it("returns correct duration for same hour", () => {
    // 9:00 to 9:30 = 30 minutes
    expect(calculateDuration("09:00", "09:30")).toBe(30)
  })

  it("returns correct duration for one hour", () => {
    // 9:00 to 10:00 = 60 minutes
    expect(calculateDuration("09:00", "10:00")).toBe(60)
  })

  it("returns correct duration for multiple hours", () => {
    // 9:00 to 12:00 = 180 minutes
    expect(calculateDuration("09:00", "12:00")).toBe(180)
  })

  it("handles hours with minutes correctly", () => {
    // 9:15 to 10:45 = 90 minutes
    expect(calculateDuration("09:15", "10:45")).toBe(90)
  })

  it("handles early morning times", () => {
    // 6:00 to 7:30 = 90 minutes
    expect(calculateDuration("06:00", "07:30")).toBe(90)
  })

  it("handles late evening times", () => {
    // 20:00 to 22:30 = 150 minutes
    expect(calculateDuration("20:00", "22:30")).toBe(150)
  })

  it("handles noon correctly", () => {
    // 11:30 to 12:30 = 60 minutes
    expect(calculateDuration("11:30", "12:30")).toBe(60)
  })

  it("returns zero for same time", () => {
    expect(calculateDuration("09:00", "09:00")).toBe(0)
  })

  it("handles single digit hours with leading zero", () => {
    // 01:00 to 02:00 = 60 minutes
    expect(calculateDuration("01:00", "02:00")).toBe(60)
  })

  it("handles full day span", () => {
    // 00:00 to 23:00 = 23 hours = 1380 minutes
    expect(calculateDuration("00:00", "23:00")).toBe(1380)
  })
})
