/**
 * Date and time utility functions
 */

/**
 * Calculate duration in minutes from startTime and endTime strings
 * @param startTime - Start time in "HH:MM" format (e.g., "09:00")
 * @param endTime - End time in "HH:MM" format (e.g., "10:30")
 * @returns Duration in minutes
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(":").map(Number)
  const [endHours, endMinutes] = endTime.split(":").map(Number)
  const startTotal = (startHours ?? 0) * 60 + (startMinutes ?? 0)
  const endTotal = (endHours ?? 0) * 60 + (endMinutes ?? 0)
  return endTotal - startTotal
}
