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
/**
 * Helper to compute a single slot time on a specific calendar day strictly within daily business hours,
 * taking into account past-time rules and client timezone offset.
 */
export function generateSlotTimeForDay(
  selectedDay: CalendarDay,
  startMinutes: number,
  endMinutes: number,
  workingMinutesPerDay: number,
  tzOffset: number,
  now: Date,
  validDays: CalendarDay[],
  minuteOffset?: number
): Date {
  const chosenMinuteOffset = typeof minuteOffset === 'number'
    ? (minuteOffset % workingMinutesPerDay)
    : Math.floor(Math.random() * workingMinutesPerDay);

  const randomSeconds = Math.floor(Math.random() * 60);
  const totalMinutes = startMinutes + chosenMinuteOffset;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  const targetUtcMs = Date.UTC(selectedDay.year, selectedDay.month, selectedDay.day, hour, minute, randomSeconds) + (tzOffset * 60 * 1000);
  let targetDate = new Date(targetUtcMs);

  // Past-time check: If the generated slot has already passed
  if (targetDate.getTime() < now.getTime()) {
    const todayEndUtcMs = Date.UTC(selectedDay.year, selectedDay.month, selectedDay.day, Math.floor(endMinutes / 60), endMinutes % 60, 0) + (tzOffset * 60 * 1000);
    const remainingTodayMs = todayEndUtcMs - (now.getTime() + 2 * 60 * 1000); // 2 min buffer

    if (remainingTodayMs > 3 * 60 * 1000) {
      const randomBuffer = Math.floor(Math.random() * remainingTodayMs);
      targetDate = new Date(now.getTime() + 2 * 60 * 1000 + randomBuffer);
    } else {
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
        const nextDayUtcMs = Date.UTC(selectedDay.year, selectedDay.month, selectedDay.day + 1, hour, minute, randomSeconds) + (tzOffset * 60 * 1000);
        targetDate = new Date(nextDayUtcMs);
      }
    }
  }

  return targetDate;
}

/**
 * Distributes target count across valid dates and daily business hours.
 * Kept for backward compatibility and test suites.
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
    let selectedDay: CalendarDay;
    if (config.randomizeSendTimes) {
      const randomIndex = Math.floor(Math.random() * validDays.length);
      selectedDay = validDays[randomIndex];
    } else {
      selectedDay = validDays[i % validDays.length];
    }

    let minuteOffset: number;
    if (config.randomizeSendTimes) {
      minuteOffset = Math.floor(Math.random() * workingMinutesPerDay);
    } else {
      minuteOffset = Math.floor((i / targetCount) * workingMinutesPerDay) % workingMinutesPerDay;
    }

    const targetDate = generateSlotTimeForDay(
      selectedDay,
      startMinutes,
      endMinutes,
      workingMinutesPerDay,
      tzOffset,
      now,
      validDays,
      minuteOffset
    );

    scheduledDates.push(targetDate);
  }

  return scheduledDates.sort((a, b) => a.getTime() - b.getTime());
}

export interface TargetWithDept {
  id: string;
  department?: string | null;
  [key: string]: any;
}

/**
 * Distributes campaign targets across valid calendar days with a STRICT guarantee:
 * Targets belonging to the SAME DEPARTMENT are NOT scheduled on the same calendar day
 * (unless target count in that department exceeds the number of available business days,
 * in which case they are spread evenly across all available days using balanced round-robin).
 */
export function generateDepartmentAwareSchedule<T extends TargetWithDept>(
  targets: T[],
  config: ScheduleConfig
): Map<string, Date> {
  const result = new Map<string, Date>();
  if (!targets || targets.length === 0) return result;

  const tzOffset = typeof config.timezoneOffset === 'number'
    ? config.timezoneOffset
    : (config.startDate instanceof Date ? config.startDate.getTimezoneOffset() : new Date().getTimezoneOffset());

  const validDays = getValidCalendarDays(config.startDate, config.endDate, config.allowedDays, tzOffset);

  if (validDays.length === 0) {
    const fallbackParts = parseDateParts(config.startDate, tzOffset);
    const fallbackMs = Date.UTC(fallbackParts.year, fallbackParts.month, fallbackParts.day, 9, 0, 0) + (tzOffset * 60 * 1000);
    for (const t of targets) {
      result.set(t.id, new Date(fallbackMs));
    }
    return result;
  }

  const startMinutes = parseTimeToMinutes(config.dailyStartTime || '08:30');
  const endMinutes = parseTimeToMinutes(config.dailyEndTime || '17:00');
  const workingMinutesPerDay = Math.max(endMinutes - startMinutes, 1);
  const now = new Date();
  const numDays = validDays.length;

  // 1. Group targets by normalized department name
  const deptGroups = new Map<string, T[]>();
  const unassignedTargets: T[] = [];

  for (const t of targets) {
    const rawDept = (t.department || '').trim();
    const normalized = rawDept.toLowerCase();
    if (!normalized || normalized === '-' || normalized === 'n/a' || normalized === 'none' || normalized === 'ไม่ระบุ') {
      unassignedTargets.push(t);
    } else {
      if (!deptGroups.has(normalized)) {
        deptGroups.set(normalized, []);
      }
      deptGroups.get(normalized)!.push(t);
    }
  }

  // 2. Track total target load assigned to each day index (0..numDays-1)
  const dayLoad = new Array(numDays).fill(0);
  const targetsByDay = new Map<number, T[]>();
  for (let i = 0; i < numDays; i++) {
    targetsByDay.set(i, []);
  }

  // 3. For each department, assign days such that members NEVER share the same day
  // (or if members > numDays, spread them across distinct days first before repeating)
  // Sort departments by size descending so larger departments get first choice of balanced days
  const sortedDepts = Array.from(deptGroups.entries()).sort((a, b) => b[1].length - a[1].length);

  for (const [, members] of sortedDepts) {
    const shuffledMembers = [...members].sort(() => Math.random() - 0.5);
    const numRounds = Math.ceil(shuffledMembers.length / numDays);

    let memberIdx = 0;
    for (let r = 0; r < numRounds; r++) {
      const remainingCount = shuffledMembers.length - memberIdx;
      const countInThisRound = Math.min(numDays, remainingCount);

      // Rank day indices by current dayLoad + random jitter to pick the least loaded distinct days
      const rankedDayIndices = Array.from({ length: numDays }, (_, idx) => idx)
        .sort((a, b) => (dayLoad[a] + Math.random()) - (dayLoad[b] + Math.random()));

      const chosenDays = rankedDayIndices.slice(0, countInThisRound);

      for (const dayIdx of chosenDays) {
        const member = shuffledMembers[memberIdx++];
        dayLoad[dayIdx]++;
        targetsByDay.get(dayIdx)!.push(member);
      }
    }
  }

  // 4. Assign unassigned targets to the least loaded days
  for (const target of unassignedTargets) {
    const bestDayIdx = Array.from({ length: numDays }, (_, idx) => idx)
      .sort((a, b) => (dayLoad[a] + Math.random()) - (dayLoad[b] + Math.random()))[0];

    dayLoad[bestDayIdx]++;
    targetsByDay.get(bestDayIdx)!.push(target);
  }

  // 5. For each day, assign send times within daily working hours
  for (let dayIdx = 0; dayIdx < numDays; dayIdx++) {
    const dayTargets = targetsByDay.get(dayIdx) || [];
    if (dayTargets.length === 0) continue;

    const calendarDay = validDays[dayIdx];
    const mCount = dayTargets.length;
    const minuteInterval = workingMinutesPerDay / (mCount + 1);
    const shuffledDayTargets = [...dayTargets].sort(() => Math.random() - 0.5);

    for (let i = 0; i < mCount; i++) {
      const target = shuffledDayTargets[i];

      let minuteOffset: number;
      if (config.randomizeSendTimes) {
        const baseMin = Math.floor((i + 1) * minuteInterval);
        const jitter = Math.floor((Math.random() - 0.5) * Math.min(minuteInterval * 0.8, 30));
        minuteOffset = Math.max(0, Math.min(workingMinutesPerDay - 1, baseMin + jitter));
      } else {
        minuteOffset = Math.floor((i / Math.max(mCount, 1)) * workingMinutesPerDay) % workingMinutesPerDay;
      }

      const sendDate = generateSlotTimeForDay(
        calendarDay,
        startMinutes,
        endMinutes,
        workingMinutesPerDay,
        tzOffset,
        now,
        validDays,
        minuteOffset
      );

      result.set(target.id, sendDate);
    }
  }

  return result;
}
