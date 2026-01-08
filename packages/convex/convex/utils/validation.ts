/**
 * Validation utility functions for time and date formats.
 * This is the single source of truth for validation across the codebase.
 */

/**
 * Validates if a time string matches the HH:MM format (24-hour).
 * Valid range: 00:00 to 23:59
 */
export function validateTimeFormat(time: string): boolean {
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
}

/**
 * Validates if a date string matches the YYYY-MM-DD format
 * and represents a valid date.
 */
export function validateDateFormat(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

/**
 * Checks if two time ranges overlap.
 * All parameters are in minutes since midnight.
 */
export function timesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && aEnd > bStart;
}
