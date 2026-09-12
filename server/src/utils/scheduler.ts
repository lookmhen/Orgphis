/**
 * Utility functions for distributing campaign simulation target emails across 
 * allowed business days and daily working hours (Smear Scheduling).
 */

export interface ScheduleConfig {
  startDate: Date;
  endDate: Date;
  allowedDays: number[]; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
  dailyStartTime: string; // "HH:mm", e.g. "08:30"
  dailyEndTime: string;   // "HH:mm", e.g. "17:00"
  randomizeSendTimes: boolean;
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
function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Finds all valid calendar dates between start and end that match allowedDays
 */
export function getValidScheduleDates(startDate: Date, endDate: Date, allowedDays: number[]): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    if (isAllowedDay(current, allowedDays)) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Distributes target count evenly (with randomized jitter) across valid dates and business hours.
 * Returns an array of planned Date objects matching targetCount.
 */
export function generateRandomizedSchedule(
  targetCount: number,
  config: ScheduleConfig
): Date[] {
  if (targetCount <= 0) return [];

  const validDates = getValidScheduleDates(config.startDate, config.endDate, config.allowedDays);
  
  // Fallback if no valid dates found (e.g. range too narrow or no matching days)
  if (validDates.length === 0) {
    const fallbackDate = new Date(config.startDate);
    return Array.from({ length: targetCount }, () => new Date(fallbackDate));
  }

  const startMinutes = parseTimeToMinutes(config.dailyStartTime || '08:30');
  const endMinutes = parseTimeToMinutes(config.dailyEndTime || '17:00');
  const workingMinutesPerDay = Math.max(endMinutes - startMinutes, 60);

  const scheduledDates: Date[] = [];

  for (let i = 0; i < targetCount; i++) {
    let selectedDate: Date;
    if (config.randomizeSendTimes) {
      const randomIndex = Math.floor(Math.random() * validDates.length);
      selectedDate = new Date(validDates[randomIndex]);
    } else {
      selectedDate = new Date(validDates[i % validDates.length]);
    }

    let randomMinuteOffset: number;
    if (config.randomizeSendTimes) {
      randomMinuteOffset = Math.floor(Math.random() * workingMinutesPerDay);
    } else {
      randomMinuteOffset = Math.floor((i / targetCount) * workingMinutesPerDay) % workingMinutesPerDay;
    }

    const randomSeconds = Math.floor(Math.random() * 60);
    const totalMinutes = startMinutes + randomMinuteOffset;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    selectedDate.setHours(hours, minutes, randomSeconds, 0);

    const now = new Date();
    if (selectedDate < now && config.startDate <= now) {
      selectedDate = new Date(now.getTime() + (i + 1) * 30000);
    }

    scheduledDates.push(selectedDate);
  }

  return scheduledDates.sort((a, b) => a.getTime() - b.getTime());
}
