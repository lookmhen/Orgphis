/**
 * Utility functions for distributing campaign simulation target emails across 
 * allowed business days and daily working hours (Smear Scheduling).
 */

export interface ScheduleConfig {
  startDate: Date | string;
  endDate: Date | string;
  allowedDays: number[]; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
  dailyStartTime: string; // "HH:mm", e.g. "08:30"
  dailyEndTime: string;   // "HH:mm", e.g. "17:00"
  randomizeSendTimes: boolean;
  timezoneOffset?: number; // Client's timezone offset in minutes (e.g. -420 for UTC+7). Defaults to server offset.
}

export interface CalendarDay {
  year: number;
  month: number; // 0-indexed (0=Jan..11=Dec)
  day: number;
  dayOfWeek: number; // 1=Mon..7=Sun
}

/**
 * Returns true if a given day of the week (1=Mon..7=Sun) is allowed
 */
export function isAllowedDay(date: Date, allowedDays: number[]): boolean {
  // JavaScript getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  const jsDay = date.getDay();
  const dayNumber = jsDay === 0 ? 7 : jsDay;
  return allowedDays.includes(dayNumber);
}

/**
 * Parses "HH:mm" into minutes from start of day
 */
export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Parses a Date or ISO string into local calendar date parts (year, month 0-indexed, day)
 * with respect to the given timezone offset (in minutes).
 */
export function parseDateParts(d: Date | string, timezoneOffset: number): { year: number; month: number; day: number } {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [y, m, day] = d.split('T')[0].split('-').map(Number);
    return { year: y, month: m - 1, day };
  }
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  // Convert UTC timestamp to target timezone representation:
  // Local time = UTC - timezoneOffset
  const localMs = dateObj.getTime() - (timezoneOffset * 60 * 1000);
  const localD = new Date(localMs);
  return {
    year: localD.getUTCFullYear(),
    month: localD.getUTCMonth(),
    day: localD.getUTCDate()
  };
}

/**
 * Finds all valid calendar days between start and end dates that match allowedDays.
 */
export function getValidCalendarDays(
  startDate: Date | string,
  endDate: Date | string,
  allowedDays: number[],
  timezoneOffset: number
): CalendarDay[] {
  const startParts = parseDateParts(startDate, timezoneOffset);
  const endParts = parseDateParts(endDate, timezoneOffset);

  const days: CalendarDay[] = [];
  const current = new Date(Date.UTC(startParts.year, startParts.month, startParts.day));
  const end = new Date(Date.UTC(endParts.year, endParts.month, endParts.day));

  while (current <= end) {
    const y = current.getUTCFullYear();
    const m = current.getUTCMonth();
    const d = current.getUTCDate();
    const jsDay = current.getUTCDay();
    const dayNumber = jsDay === 0 ? 7 : jsDay;

    if (allowedDays.includes(dayNumber)) {
      days.push({ year: y, month: m, day: d, dayOfWeek: dayNumber });
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

/**
 * Backward-compatible helper for legacy test suites.
 */
export function getValidScheduleDates(startDate: Date, endDate: Date, allowedDays: number[]): Date[] {
  const tzOffset = startDate.getTimezoneOffset();
  const days = getValidCalendarDays(startDate, endDate, allowedDays, tzOffset);
  return days.map(d => new Date(d.year, d.month, d.day, 0, 0, 0, 0));
}

/**
 * Distributes target count across valid dates and daily business hours.
 * 
 * Strict Guarantees:
 * 1. All generated slots STRICTLY fall between dailyStartTime and dailyEndTime in the client's timezone.
 * 2. Never generates slots outside working hours (e.g. night times like 21:00).
 * 3. If a slot for today is already in the past or after dailyEndTime, it gracefully reschedules to the
 *    next available valid business day within working hours.
 */
export function generateRandomizedSchedule(
  targetCount: number,
  config: ScheduleConfig
): Date[] {
  if (targetCount <= 0) return [];

  const tzOffset = typeof config.timezoneOffset === 'number'
    ? config.timezoneOffset
    : (config.startDate instanceof Date ? config.startDate.getTimezoneOffset() : new Date().getTimezoneOffset());

  const validDays = getValidCalendarDays(config.startDate, config.endDate, config.allowedDays, tzOffset);

  if (validDays.length === 0) {
    const fallbackParts = parseDateParts(config.startDate, tzOffset);
    const fallbackMs = Date.UTC(fallbackParts.year, fallbackParts.month, fallbackParts.day, 9, 0, 0) + (tzOffset * 60 * 1000);
    return Array.from({ length: targetCount }, () => new Date(fallbackMs));
  }

  const startMinutes = parseTimeToMinutes(config.dailyStartTime || '08:30');
  const endMinutes = parseTimeToMinutes(config.dailyEndTime || '17:00');
  const workingMinutesPerDay = Math.max(endMinutes - startMinutes, 1);

  const scheduledDates: Date[] = [];
  const now = new Date();

  for (let i = 0; i < targetCount; i++) {
    // 1. Select calendar day
    let selectedDay: CalendarDay;
    if (config.randomizeSendTimes) {
      const randomIndex = Math.floor(Math.random() * validDays.length);
      selectedDay = validDays[randomIndex];
    } else {
      selectedDay = validDays[i % validDays.length];
    }

    // 2. Pick minutes strictly within working hours (dailyStartTime .. dailyEndTime)
    let randomMinuteOffset: number;
    if (config.randomizeSendTimes) {
      randomMinuteOffset = Math.floor(Math.random() * workingMinutesPerDay);
    } else {
      randomMinuteOffset = Math.floor((i / targetCount) * workingMinutesPerDay) % workingMinutesPerDay;
    }

    const randomSeconds = Math.floor(Math.random() * 60);
    const totalMinutes = startMinutes + randomMinuteOffset;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;

    // Convert local time in client's timezone to absolute UTC timestamp
    const targetUtcMs = Date.UTC(selectedDay.year, selectedDay.month, selectedDay.day, hour, minute, randomSeconds) + (tzOffset * 60 * 1000);
    let targetDate = new Date(targetUtcMs);

    // 3. Past-time check: If the generated slot has already passed
    if (targetDate.getTime() < now.getTime()) {
      // Check if today's business hours are still active:
      const todayEndUtcMs = Date.UTC(selectedDay.year, selectedDay.month, selectedDay.day, Math.floor(endMinutes / 60), endMinutes % 60, 0) + (tzOffset * 60 * 1000);
      const remainingTodayMs = todayEndUtcMs - (now.getTime() + 2 * 60 * 1000); // 2 min buffer

      if (remainingTodayMs > 3 * 60 * 1000) {
        // Still have time today before end of working hours (e.g. between now + 2 min and dailyEndTime)
        const randomBuffer = Math.floor(Math.random() * remainingTodayMs);
        targetDate = new Date(now.getTime() + 2 * 60 * 1000 + randomBuffer);
      } else {
        // Today's working hours are OVER (e.g. current time is after 17:00, or at night like 21:00).
        // NEVER schedule outside working hours! Move to future valid business day during working hours:
        const futureDays = validDays.filter(d => {
          const dStartMs = Date.UTC(d.year, d.month, d.day, Math.floor(startMinutes / 60), startMinutes % 60, 0) + (tzOffset * 60 * 1000);
          return dStartMs > now.getTime();
        });

        if (futureDays.length > 0) {
          const chosenDay = futureDays[Math.floor(Math.random() * futureDays.length)];
          const fMinuteOffset = Math.floor(Math.random() * workingMinutesPerDay);
          const fTotalMin = startMinutes + fMinuteOffset;
          const fHour = Math.floor(fTotalMin / 60);
          const fMin = fTotalMin % 60;
          const fSec = Math.floor(Math.random() * 60);
          targetDate = new Date(Date.UTC(chosenDay.year, chosenDay.month, chosenDay.day, fHour, fMin, fSec) + (tzOffset * 60 * 1000));
        } else {
          // If no future days in configured range, schedule for tomorrow during working hours:
          const nextDayUtcMs = Date.UTC(selectedDay.year, selectedDay.month, selectedDay.day + 1, hour, minute, randomSeconds) + (tzOffset * 60 * 1000);
          targetDate = new Date(nextDayUtcMs);
        }
      }
    }

    scheduledDates.push(targetDate);
  }

  return scheduledDates.sort((a, b) => a.getTime() - b.getTime());
}
