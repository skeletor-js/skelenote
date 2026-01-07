/**
 * Date utility functions for task filtering and display
 * All timestamps are in milliseconds (Unix epoch)
 */

/**
 * Get the start of day (midnight) for a given date
 */
export function startOfDay(date: Date = new Date()): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of day (23:59:59.999) for a given date
 */
export function endOfDay(date: Date = new Date()): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get the start of the week (Monday midnight) for a given date
 */
export function startOfWeek(date: Date = new Date()): Date {
  const result = new Date(date);
  const day = result.getDay();
  // Convert Sunday (0) to 7 for Monday-based week
  const dayFromMonday = day === 0 ? 7 : day;
  result.setDate(result.getDate() - (dayFromMonday - 1));
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of the week (Sunday 23:59:59.999) for a given date
 */
export function endOfWeek(date: Date = new Date()): Date {
  const result = new Date(date);
  const day = result.getDay();
  // Convert Sunday (0) to 7 for Monday-based week
  const dayFromMonday = day === 0 ? 7 : day;
  result.setDate(result.getDate() + (7 - dayFromMonday));
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Check if a timestamp is today
 */
export function isToday(timestamp: number): boolean {
  const date = new Date(timestamp);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Check if a timestamp is before today (overdue)
 */
export function isOverdue(timestamp: number): boolean {
  const start = startOfDay();
  return timestamp < start.getTime();
}

/**
 * Check if a timestamp is within this week (including today)
 */
export function isThisWeek(timestamp: number): boolean {
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek();
  return timestamp >= weekStart.getTime() && timestamp <= weekEnd.getTime();
}

/**
 * Check if a timestamp is within this week but after today
 */
export function isThisWeekAfterToday(timestamp: number): boolean {
  const todayEnd = endOfDay();
  const weekEnd = endOfWeek();
  return timestamp > todayEnd.getTime() && timestamp <= weekEnd.getTime();
}

/**
 * Check if a timestamp is beyond this week
 */
export function isBeyondThisWeek(timestamp: number): boolean {
  const weekEnd = endOfWeek();
  return timestamp > weekEnd.getTime();
}

/**
 * Add days to a timestamp
 */
export function addDays(timestamp: number, days: number): number {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

/**
 * Add months to a timestamp
 * Preserves the day of month when possible
 */
export function addMonths(timestamp: number, months: number): number {
  const date = new Date(timestamp);
  const dayOfMonth = date.getDate();
  date.setMonth(date.getMonth() + months);
  // Handle edge case where day doesn't exist in target month (e.g., Jan 31 -> Feb 28)
  if (date.getDate() !== dayOfMonth) {
    date.setDate(0); // Go to last day of previous month
  }
  return date.getTime();
}

/**
 * Add years to a timestamp
 */
export function addYears(timestamp: number, years: number): number {
  const date = new Date(timestamp);
  date.setFullYear(date.getFullYear() + years);
  return date.getTime();
}

/**
 * Format a timestamp as a relative date string
 */
export function formatRelativeDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = startOfDay();
  const tomorrow = addDays(today.getTime(), 1);
  const dayAfterTomorrow = addDays(today.getTime(), 2);
  const yesterday = addDays(today.getTime(), -1);

  if (timestamp >= today.getTime() && timestamp < tomorrow) {
    return 'Today';
  }
  if (timestamp >= tomorrow && timestamp < dayAfterTomorrow) {
    return 'Tomorrow';
  }
  if (timestamp >= yesterday && timestamp < today.getTime()) {
    return 'Yesterday';
  }

  // Check if overdue
  if (timestamp < today.getTime()) {
    const daysAgo = Math.ceil(
      (today.getTime() - timestamp) / (1000 * 60 * 60 * 24)
    );
    return `${daysAgo}d overdue`;
  }

  // Check if within this week
  const weekEnd = endOfWeek();
  if (timestamp <= weekEnd.getTime()) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayNames[date.getDay()];
  }

  // Format as short date
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();

  // Include year if different from current
  if (date.getFullYear() !== new Date().getFullYear()) {
    return `${month} ${day}, ${date.getFullYear()}`;
  }

  return `${month} ${day}`;
}

/**
 * Format a timestamp as ISO date string (YYYY-MM-DD)
 */
export function formatISODate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

/**
 * Parse an ISO date string to timestamp
 */
export function parseISODate(isoDate: string): number {
  return new Date(isoDate).getTime();
}
