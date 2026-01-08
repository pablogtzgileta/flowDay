import { test, expect, describe } from "bun:test";
import { timeToMinutes, timeToHour, minutesToTime } from "./time";

describe("timeToMinutes", () => {
  test("converts valid time strings to minutes since midnight", () => {
    expect(timeToMinutes("0:00")).toBe(0);
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("9:30")).toBe(570);
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("12:00")).toBe(720);
    expect(timeToMinutes("23:59")).toBe(1439);
  });

  test("throws on invalid time format", () => {
    expect(() => timeToMinutes("invalid")).toThrow("Invalid time format");
    expect(() => timeToMinutes("")).toThrow("Invalid time format");
    expect(() => timeToMinutes("9")).toThrow("Invalid time format");
    expect(() => timeToMinutes("9:5")).toThrow("Invalid time format");
    expect(() => timeToMinutes("09:5")).toThrow("Invalid time format");
    expect(() => timeToMinutes("9:005")).toThrow("Invalid time format");
  });

  test("throws on out of range values", () => {
    expect(() => timeToMinutes("24:00")).toThrow("Invalid time values");
    expect(() => timeToMinutes("25:00")).toThrow("Invalid time values");
    expect(() => timeToMinutes("00:60")).toThrow("Invalid time values");
    expect(() => timeToMinutes("99:99")).toThrow("Invalid time values");
  });
});

describe("timeToHour", () => {
  test("converts valid time strings to hour", () => {
    expect(timeToHour("0:00")).toBe(0);
    expect(timeToHour("00:00")).toBe(0);
    expect(timeToHour("9:30")).toBe(9);
    expect(timeToHour("09:30")).toBe(9);
    expect(timeToHour("12:00")).toBe(12);
    expect(timeToHour("23:59")).toBe(23);
  });

  test("throws on invalid time format", () => {
    expect(() => timeToHour("invalid")).toThrow("Invalid time format");
    expect(() => timeToHour("")).toThrow("Invalid time format");
    expect(() => timeToHour("9")).toThrow("Invalid time format");
    expect(() => timeToHour("9:5")).toThrow("Invalid time format");
  });

  test("throws on out of range values", () => {
    expect(() => timeToHour("24:00")).toThrow("Invalid time values");
    expect(() => timeToHour("25:00")).toThrow("Invalid time values");
    expect(() => timeToHour("00:60")).toThrow("Invalid time values");
  });
});

describe("minutesToTime", () => {
  test("converts minutes to time strings", () => {
    expect(minutesToTime(0)).toBe("00:00");
    expect(minutesToTime(570)).toBe("09:30");
    expect(minutesToTime(720)).toBe("12:00");
    expect(minutesToTime(1439)).toBe("23:59");
  });

  test("throws on out of range values", () => {
    expect(() => minutesToTime(-1)).toThrow("Invalid minutes value");
    expect(() => minutesToTime(1440)).toThrow("Invalid minutes value");
    expect(() => minutesToTime(9999)).toThrow("Invalid minutes value");
  });

  test("throws on invalid type values", () => {
    // @ts-expect-error - testing runtime behavior
    expect(() => minutesToTime("570")).toThrow("Invalid minutes value");
    // @ts-expect-error - testing runtime behavior
    expect(() => minutesToTime(null)).toThrow("Invalid minutes value");
    // @ts-expect-error - testing runtime behavior
    expect(() => minutesToTime(undefined)).toThrow("Invalid minutes value");
    expect(() => minutesToTime(NaN)).toThrow("Invalid minutes value");
    expect(() => minutesToTime(Infinity)).toThrow("Invalid minutes value");
  });
});
