import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Get the current date in YYYY-MM-DD format for a given timezone
 */
export const getTodayDateString = (timezone: string = DEFAULT_TIMEZONE): string => {
  try {
    return formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
  } catch (err) {
    return formatInTimeZone(new Date(), DEFAULT_TIMEZONE, 'yyyy-MM-dd');
  }
};

/**
 * Convert any timestamp/Date to YYYY-MM-DD in the given timezone
 */
export const getDateStringInTimezone = (date: Date | string, timezone: string = DEFAULT_TIMEZONE): string => {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatInTimeZone(d, timezone, 'yyyy-MM-dd');
  } catch (err) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatInTimeZone(d, DEFAULT_TIMEZONE, 'yyyy-MM-dd');
  }
};

/**
 * Check if a given date/timestamp is today in the business timezone
 */
export const isTodayInTimezone = (date: Date | string, timezone: string = DEFAULT_TIMEZONE): boolean => {
  const targetDate = getDateStringInTimezone(date, timezone);
  const today = getTodayDateString(timezone);
  return targetDate === today;
};

/**
 * Get start and end dates for a month in YYYY-MM-DD format
 */
export const getMonthRange = (year: number, month: number): { startDate: string; endDate: string } => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // last day of month
  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    startDate: `${year}-${pad(month)}-01`,
    endDate: `${year}-${pad(month)}-${pad(end.getDate())}`,
  };
};
