/**
 * Shared time utility functions for converting between time formats.
 * This is the single source of truth for time conversion across the codebase.
 */

/**
 * Converts a time string "HH:MM" to the hour (0-23).
 */
export function timeToHour(time: string): number {
  if (!/^\d{1,2}:\d{2}$/.test(time)) {
    throw new Error(`Invalid time format: ${time}. Expected HH:MM`);
  }
  const [hours, minutes] = time.split(":").map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time values: ${time}. Hours must be 0-23, minutes 0-59`);
  }
  return hours;
}

/**
 * Converts a time string "HH:MM" to minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  if (!/^\d{1,2}:\d{2}$/.test(time)) {
    throw new Error(`Invalid time format: ${time}. Expected HH:MM`);
  }
  const [hours, minutes] = time.split(":").map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time values: ${time}. Hours must be 0-23, minutes 0-59`);
  }
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to a time string "HH:MM".
 */
export function minutesToTime(minutes: number): string {
  if (typeof minutes !== 'number' || isNaN(minutes) || !isFinite(minutes)) {
    throw new Error(`Invalid minutes value: ${minutes}. Expected a finite number`);
  }
  if (minutes < 0 || minutes > 1439) {
    throw new Error(`Invalid minutes value: ${minutes}. Must be between 0 and 1439`);
  }
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}
