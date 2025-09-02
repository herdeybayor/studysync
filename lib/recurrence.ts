import { addDays, addWeeks, addMonths, addYears, isSameDay, startOfDay, endOfDay } from 'date-fns';

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type RecurrenceByWeekday = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number; // Every X days/weeks/months/years (default: 1)
  count?: number; // Total number of occurrences
  until?: Date; // End date for recurrence
  byWeekday?: RecurrenceByWeekday[]; // Days of week for weekly recurrence
  byMonthDay?: number[]; // Day of month for monthly recurrence (1-31)
  byMonth?: number[]; // Month for yearly recurrence (1-12)
}

export interface RecurrenceInstance {
  date: Date;
  isException?: boolean;
  originalEventId?: number;
}

/**
 * Parse a simple recurrence rule string into a RecurrenceRule object
 * Format: "FREQ=DAILY;INTERVAL=1;COUNT=10" or "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20241231"
 */
export function parseRecurrenceRule(rrule: string): RecurrenceRule | null {
  if (!rrule) return null;

  const parts = rrule.split(';');
  const rule: Partial<RecurrenceRule> = {};

  for (const part of parts) {
    const [key, value] = part.split('=');

    switch (key) {
      case 'FREQ':
        rule.frequency = value as RecurrenceFrequency;
        break;
      case 'INTERVAL':
        rule.interval = parseInt(value, 10);
        break;
      case 'COUNT':
        rule.count = parseInt(value, 10);
        break;
      case 'UNTIL':
        // Parse date in YYYYMMDD format
        const year = parseInt(value.substring(0, 4), 10);
        const month = parseInt(value.substring(4, 6), 10) - 1; // Month is 0-indexed
        const day = parseInt(value.substring(6, 8), 10);
        rule.until = new Date(year, month, day);
        break;
      case 'BYDAY':
        rule.byWeekday = value.split(',') as RecurrenceByWeekday[];
        break;
      case 'BYMONTHDAY':
        rule.byMonthDay = value.split(',').map((d) => parseInt(d, 10));
        break;
      case 'BYMONTH':
        rule.byMonth = value.split(',').map((m) => parseInt(m, 10));
        break;
    }
  }

  return rule.frequency ? (rule as RecurrenceRule) : null;
}

/**
 * Generate a recurrence rule string from a RecurrenceRule object
 */
export function stringifyRecurrenceRule(rule: RecurrenceRule): string {
  const parts: string[] = [`FREQ=${rule.frequency}`];

  if (rule.interval && rule.interval > 1) {
    parts.push(`INTERVAL=${rule.interval}`);
  }

  if (rule.count) {
    parts.push(`COUNT=${rule.count}`);
  }

  if (rule.until) {
    const year = rule.until.getFullYear();
    const month = String(rule.until.getMonth() + 1).padStart(2, '0');
    const day = String(rule.until.getDate()).padStart(2, '0');
    parts.push(`UNTIL=${year}${month}${day}`);
  }

  if (rule.byWeekday && rule.byWeekday.length > 0) {
    parts.push(`BYDAY=${rule.byWeekday.join(',')}`);
  }

  if (rule.byMonthDay && rule.byMonthDay.length > 0) {
    parts.push(`BYMONTHDAY=${rule.byMonthDay.join(',')}`);
  }

  if (rule.byMonth && rule.byMonth.length > 0) {
    parts.push(`BYMONTH=${rule.byMonth.join(',')}`);
  }

  return parts.join(';');
}

/**
 * Convert weekday abbreviation to JavaScript day number (0 = Sunday)
 */
function weekdayToNumber(weekday: RecurrenceByWeekday): number {
  const map: Record<RecurrenceByWeekday, number> = {
    SU: 0,
    MO: 1,
    TU: 2,
    WE: 3,
    TH: 4,
    FR: 5,
    SA: 6,
  };
  return map[weekday];
}

/**
 * Generate recurring event instances based on a recurrence rule
 */
export function expandRecurrence(
  startDate: Date,
  endDate: Date,
  rule: RecurrenceRule,
  rangeStart: Date,
  rangeEnd: Date,
  maxInstances: number = 100
): RecurrenceInstance[] {
  const instances: RecurrenceInstance[] = [];
  const interval = rule.interval || 1;
  let currentDate = new Date(startDate);
  let count = 0;

  // Always include the original event if it falls within range
  if (currentDate >= rangeStart && currentDate <= rangeEnd) {
    instances.push({ date: new Date(currentDate) });
  }
  count++;

  while (count < maxInstances) {
    // Check count limit
    if (rule.count && count >= rule.count) {
      break;
    }

    // Generate next occurrence based on frequency
    switch (rule.frequency) {
      case 'DAILY':
        currentDate = addDays(currentDate, interval);
        break;
      case 'WEEKLY':
        if (rule.byWeekday && rule.byWeekday.length > 0) {
          // Find next weekday occurrence
          currentDate = getNextWeekdayOccurrence(currentDate, rule.byWeekday, interval);
        } else {
          currentDate = addWeeks(currentDate, interval);
        }
        break;
      case 'MONTHLY':
        if (rule.byMonthDay && rule.byMonthDay.length > 0) {
          currentDate = getNextMonthDayOccurrence(currentDate, rule.byMonthDay, interval);
        } else {
          currentDate = addMonths(currentDate, interval);
        }
        break;
      case 'YEARLY':
        currentDate = addYears(currentDate, interval);
        break;
    }

    // Check until date
    if (rule.until && currentDate > rule.until) {
      break;
    }

    // Check if we've gone beyond our search range
    if (currentDate > rangeEnd) {
      break;
    }

    // Add instance if within range
    if (currentDate >= rangeStart && currentDate <= rangeEnd) {
      instances.push({ date: new Date(currentDate) });
    }

    count++;
  }

  return instances;
}

/**
 * Get the next weekday occurrence for weekly recurrence
 */
function getNextWeekdayOccurrence(
  currentDate: Date,
  weekdays: RecurrenceByWeekday[],
  interval: number
): Date {
  const weekdayNumbers = weekdays.map(weekdayToNumber).sort((a, b) => a - b);
  const currentWeekday = currentDate.getDay();

  // Find next weekday in current week
  const nextWeekday = weekdayNumbers.find((day) => day > currentWeekday);

  if (nextWeekday !== undefined) {
    // Next occurrence is in the same week
    return addDays(currentDate, nextWeekday - currentWeekday);
  } else {
    // Next occurrence is in the next interval week
    const weeksToAdd = interval;
    const daysToFirstWeekday = 7 * weeksToAdd - currentWeekday + weekdayNumbers[0];
    return addDays(currentDate, daysToFirstWeekday);
  }
}

/**
 * Get the next month day occurrence for monthly recurrence
 */
function getNextMonthDayOccurrence(currentDate: Date, monthDays: number[], interval: number): Date {
  const currentDay = currentDate.getDate();
  const sortedDays = monthDays.sort((a, b) => a - b);

  // Find next day in current month
  const nextDay = sortedDays.find((day) => day > currentDay);

  if (nextDay !== undefined) {
    // Next occurrence is in the same month
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDay);
    return nextDate;
  } else {
    // Next occurrence is in the next interval month
    const nextMonth = addMonths(currentDate, interval);
    nextMonth.setDate(sortedDays[0]);
    return nextMonth;
  }
}

/**
 * Helper function to create common recurrence patterns
 */
export const RecurrencePatterns = {
  daily: (interval: number = 1, count?: number): RecurrenceRule => ({
    frequency: 'DAILY',
    interval,
    count,
  }),

  weekly: (
    weekdays: RecurrenceByWeekday[] = [],
    interval: number = 1,
    count?: number
  ): RecurrenceRule => ({
    frequency: 'WEEKLY',
    interval,
    byWeekday: weekdays.length > 0 ? weekdays : undefined,
    count,
  }),

  monthly: (monthDay?: number, interval: number = 1, count?: number): RecurrenceRule => ({
    frequency: 'MONTHLY',
    interval,
    byMonthDay: monthDay ? [monthDay] : undefined,
    count,
  }),

  yearly: (interval: number = 1, count?: number): RecurrenceRule => ({
    frequency: 'YEARLY',
    interval,
    count,
  }),

  weekdays: (count?: number): RecurrenceRule => ({
    frequency: 'WEEKLY',
    byWeekday: ['MO', 'TU', 'WE', 'TH', 'FR'],
    count,
  }),

  weekends: (count?: number): RecurrenceRule => ({
    frequency: 'WEEKLY',
    byWeekday: ['SA', 'SU'],
    count,
  }),
};

/**
 * Get a human-readable description of a recurrence rule
 */
export function getRecurrenceDescription(rule: RecurrenceRule): string {
  const interval = rule.interval || 1;
  const intervalText = interval === 1 ? '' : `every ${interval} `;

  switch (rule.frequency) {
    case 'DAILY':
      if (
        rule.byWeekday &&
        rule.byWeekday.length === 5 &&
        rule.byWeekday.every((day) => ['MO', 'TU', 'WE', 'TH', 'FR'].includes(day))
      ) {
        return 'Every weekday';
      }
      return interval === 1 ? 'Daily' : `Every ${interval} days`;

    case 'WEEKLY':
      if (rule.byWeekday && rule.byWeekday.length > 0) {
        const days = rule.byWeekday
          .map((day) => {
            const dayNames = {
              SU: 'Sun',
              MO: 'Mon',
              TU: 'Tue',
              WE: 'Wed',
              TH: 'Thu',
              FR: 'Fri',
              SA: 'Sat',
            };
            return dayNames[day];
          })
          .join(', ');
        return `${intervalText}week on ${days}`;
      }
      return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;

    case 'MONTHLY':
      if (rule.byMonthDay && rule.byMonthDay.length > 0) {
        const days = rule.byMonthDay.join(', ');
        return `${intervalText}month on day ${days}`;
      }
      return interval === 1 ? 'Monthly' : `Every ${interval} months`;

    case 'YEARLY':
      return interval === 1 ? 'Yearly' : `Every ${interval} years`;

    default:
      return 'Custom recurrence';
  }
}
