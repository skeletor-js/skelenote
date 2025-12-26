/**
 * Date utilities for daily notes
 */

/**
 * Format a date as a human-readable title
 * @example "December 25, 2024"
 */
export function formatDateTitle(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date as an ISO date string (for IDs and queries)
 * @example "2024-12-25"
 */
export function formatDateId(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse an ISO date string back to a Date object
 * @example parseDate("2024-12-25") → Date
 */
export function parseDate(dateId: string): Date {
  const [year, month, day] = dateId.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get an adjacent date by offset (positive = future, negative = past)
 * @example getAdjacentDate(date, 1) → next day
 * @example getAdjacentDate(date, -1) → previous day
 */
export function getAdjacentDate(date: Date, offset: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + offset);
  return result;
}

/**
 * Get the number of days in a given month
 */
export function getDaysInMonth(year: number, month: number): number {
  // Month is 0-indexed, so we get the 0th day of the next month (= last day of current month)
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the first day of a given month
 */
export function getFirstDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

/**
 * Get the day of week (0 = Sunday, 6 = Saturday) for the first day of the month
 */
export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/**
 * Check if two dates are the same calendar day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Check if a date is in the past (before today)
 */
export function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate < today;
}

/**
 * Check if a date is in the future (after today)
 */
export function isFuture(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate > today;
}

/**
 * Get the month name for a given date
 * @example "December"
 */
export function getMonthName(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long' });
}

/**
 * Get the short month name for a given date
 * @example "Dec"
 */
export function getShortMonthName(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

/**
 * Format a month and year for display
 * @example "December 2024"
 */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
