import { describe, it, expect } from 'vitest';
import {
  isAllowedDay,
  isWithinBusinessHours,
  getValidScheduleDates,
  generateRandomizedSchedule,
  generateDepartmentAwareSchedule,
  parseDateParts,
  ScheduleConfig
} from '../utils/scheduler.js';

describe('Randomized Smear Scheduler Utility', () => {
  it('should correctly identify allowed business days', () => {
    // 2026-09-14 is a Monday (dayNumber = 1)
    const monday = new Date(2026, 8, 14, 10, 0, 0);
    // 2026-09-20 is a Sunday (dayNumber = 7)
    const sunday = new Date(2026, 8, 20, 10, 0, 0);

    const weekdays = [1, 2, 3, 4, 5]; // Mon - Fri

    expect(isAllowedDay(monday, weekdays)).toBe(true);
    expect(isAllowedDay(sunday, weekdays)).toBe(false);
  });

  it('should generate valid dates excluding weekends', () => {
    // Monday 2026-09-14 to Sunday 2026-09-20 (7 days total, 5 weekdays)
    const start = new Date(2026, 8, 14, 0, 0, 0);
    const end = new Date(2026, 8, 20, 23, 59, 59);
    const weekdays = [1, 2, 3, 4, 5];

    const validDates = getValidScheduleDates(start, end, weekdays);
    expect(validDates.length).toBe(5);

    // Verify all generated dates are weekdays
    for (const d of validDates) {
      expect(isAllowedDay(d, weekdays)).toBe(true);
    }
  });

  it('should distribute targets within daily working hours', () => {
    const config: ScheduleConfig = {
      startDate: new Date('2026-10-01T00:00:00'),
      endDate: new Date('2026-10-07T23:59:59'),
      allowedDays: [1, 2, 3, 4, 5],
      dailyStartTime: '09:00',
      dailyEndTime: '17:00',
      randomizeSendTimes: true
    };

    const targetCount = 20;
    const schedule = generateRandomizedSchedule(targetCount, config);

    expect(schedule.length).toBe(targetCount);

    // Verify all targets fall within working hours (09:00 - 17:00)
    for (const sendDate of schedule) {
      const hours = sendDate.getHours();
      expect(hours).toBeGreaterThanOrEqual(9);
      expect(hours).toBeLessThanOrEqual(17);
    }
  });

  it('should return chronological order of scheduled dates', () => {
    const config: ScheduleConfig = {
      startDate: new Date('2026-11-01T00:00:00'),
      endDate: new Date('2026-11-05T23:59:59'),
      allowedDays: [1, 2, 3, 4, 5],
      dailyStartTime: '08:30',
      dailyEndTime: '16:30',
      randomizeSendTimes: true
    };

    const schedule = generateRandomizedSchedule(15, config);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].getTime()).toBeGreaterThanOrEqual(schedule[i - 1].getTime());
    }
  });

  it('should strictly respect client timezone offset (e.g. UTC+7 Thailand -420) and never exceed dailyEndTime', () => {
    const config: ScheduleConfig = {
      startDate: '2026-10-12',
      endDate: '2026-10-16',
      allowedDays: [1, 2, 3, 4, 5],
      dailyStartTime: '08:30',
      dailyEndTime: '17:00',
      randomizeSendTimes: true,
      timezoneOffset: -420 // Thailand UTC+7
    };

    const schedule = generateRandomizedSchedule(30, config);
    expect(schedule.length).toBe(30);

    for (const d of schedule) {
      // Convert to local time in Thailand (UTC+7)
      const thaiMs = d.getTime() + (7 * 60 * 60 * 1000);
      const thaiDate = new Date(thaiMs);
      const hour = thaiDate.getUTCHours();
      const minute = thaiDate.getUTCMinutes();
      const totalMinutes = hour * 60 + minute;

      // 08:30 is 510 minutes, 17:00 is 1020 minutes
      expect(totalMinutes).toBeGreaterThanOrEqual(510);
      expect(totalMinutes).toBeLessThanOrEqual(1020);

      // Verify it is NEVER evening/night like 21:00 (1260 min)
      expect(totalMinutes).toBeLessThan(17 * 60);
    }
  });

  it('should guarantee members of the same department are NEVER scheduled on the same calendar day (when dept size <= valid days)', () => {
    const config: ScheduleConfig = {
      startDate: '2026-10-12', // Monday
      endDate: '2026-10-16',   // Friday (5 business days)
      allowedDays: [1, 2, 3, 4, 5],
      dailyStartTime: '08:30',
      dailyEndTime: '17:00',
      randomizeSendTimes: true,
      timezoneOffset: -420 // Thailand UTC+7
    };

    const targets = [
      { id: 'it-1', department: 'IT', email: 'it1@org.com' },
      { id: 'it-2', department: 'IT', email: 'it2@org.com' },
      { id: 'it-3', department: 'IT', email: 'it3@org.com' },
      { id: 'hr-1', department: 'HR', email: 'hr1@org.com' },
      { id: 'hr-2', department: 'HR', email: 'hr2@org.com' },
      { id: 'fin-1', department: 'Finance', email: 'fin1@org.com' },
      { id: 'fin-2', department: 'Finance', email: 'fin2@org.com' },
      { id: 'fin-3', department: 'Finance', email: 'fin3@org.com' },
      { id: 'mkt-1', department: 'Marketing', email: 'mkt1@org.com' },
      { id: 'nodept-1', department: null, email: 'nodept1@org.com' }
    ];

    const scheduleMap = generateDepartmentAwareSchedule(targets, config);

    expect(scheduleMap.size).toBe(targets.length);

    // Helper to get calendar day key (YYYY-MM-DD) in target timezone
    const getDayKey = (d: Date) => {
      const parts = parseDateParts(d, -420);
      return `${parts.year}-${parts.month + 1}-${parts.day}`;
    };

    // 1. Check IT department: all 3 must have DIFFERENT calendar days
    const itDays = ['it-1', 'it-2', 'it-3'].map(id => getDayKey(scheduleMap.get(id)!));
    const uniqueItDays = new Set(itDays);
    expect(uniqueItDays.size).toBe(3); // 3 distinct days!

    // 2. Check HR department: all 2 must have DIFFERENT calendar days
    const hrDays = ['hr-1', 'hr-2'].map(id => getDayKey(scheduleMap.get(id)!));
    const uniqueHrDays = new Set(hrDays);
    expect(uniqueHrDays.size).toBe(2); // 2 distinct days!

    // 3. Check Finance department: all 3 must have DIFFERENT calendar days
    const finDays = ['fin-1', 'fin-2', 'fin-3'].map(id => getDayKey(scheduleMap.get(id)!));
    const uniqueFinDays = new Set(finDays);
    expect(uniqueFinDays.size).toBe(3); // 3 distinct days!

    // 4. Verify all generated times are strictly between 08:30 and 17:00
    for (const [id, date] of scheduleMap.entries()) {
      const thaiMs = date.getTime() + (7 * 60 * 60 * 1000);
      const thaiDate = new Date(thaiMs);
      const totalMin = thaiDate.getUTCHours() * 60 + thaiDate.getUTCMinutes();
      expect(totalMin).toBeGreaterThanOrEqual(510);
      expect(totalMin).toBeLessThanOrEqual(1020);
    }
  });

  it('should handle case-insensitive department matching (e.g. IT, it, IT with spaces) and separate them', () => {
    const config: ScheduleConfig = {
      startDate: '2026-10-12',
      endDate: '2026-10-16',
      allowedDays: [1, 2, 3, 4, 5],
      dailyStartTime: '09:00',
      dailyEndTime: '17:00',
      randomizeSendTimes: true,
      timezoneOffset: -420
    };

    const targets = [
      { id: '1', department: 'IT' },
      { id: '2', department: 'it' },
      { id: '3', department: ' IT ' }
    ];

    const scheduleMap = generateDepartmentAwareSchedule(targets, config);
    const getDayKey = (d: Date) => {
      const parts = parseDateParts(d, -420);
      return `${parts.year}-${parts.month + 1}-${parts.day}`;
    };

    const days = targets.map(t => getDayKey(scheduleMap.get(t.id)!));
    const uniqueDays = new Set(days);
    expect(uniqueDays.size).toBe(3); // All 3 recognized as the same department and assigned distinct days!
  });

  it('should evenly balance distribution across days when department target count exceeds valid days', () => {
    const config: ScheduleConfig = {
      startDate: '2026-10-12',
      endDate: '2026-10-16', // 5 business days
      allowedDays: [1, 2, 3, 4, 5],
      dailyStartTime: '08:30',
      dailyEndTime: '17:00',
      randomizeSendTimes: true,
      timezoneOffset: -420
    };

    // 8 members in Engineering, only 5 days
    const targets = Array.from({ length: 8 }, (_, i) => ({
      id: `eng-${i + 1}`,
      department: 'Engineering'
    }));

    const scheduleMap = generateDepartmentAwareSchedule(targets, config);
    const getDayKey = (d: Date) => {
      const parts = parseDateParts(d, -420);
      return `${parts.year}-${parts.month + 1}-${parts.day}`;
    };

    const dayCounts = new Map<string, number>();
    for (const t of targets) {
      const day = getDayKey(scheduleMap.get(t.id)!);
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    }

    // All 5 days must be utilized
    expect(dayCounts.size).toBe(5);
    // Max count per day must not exceed ceil(8 / 5) = 2
    for (const count of dayCounts.values()) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  describe('isWithinBusinessHours Guard', () => {
    it('should return true during business hours on weekdays', () => {
      // Wednesday 2026-10-14 at 10:30 Bangkok time (UTC+7, UTC 03:30)
      const wednesday1030Utc = new Date(Date.UTC(2026, 9, 14, 3, 30, 0));
      expect(isWithinBusinessHours(wednesday1030Utc, [1, 2, 3, 4, 5], '08:30', '17:00', -420)).toBe(true);
    });

    it('should return false at night outside working hours (e.g. 21:00)', () => {
      // Wednesday 2026-10-14 at 21:00 Bangkok time (UTC+7, UTC 14:00)
      const wednesday2100Utc = new Date(Date.UTC(2026, 9, 14, 14, 0, 0));
      expect(isWithinBusinessHours(wednesday2100Utc, [1, 2, 3, 4, 5], '08:30', '17:00', -420)).toBe(false);
    });

    it('should return false on weekends even during day time', () => {
      // Saturday 2026-10-17 at 11:00 Bangkok time (UTC+7, UTC 04:00)
      const saturday1100Utc = new Date(Date.UTC(2026, 9, 17, 4, 0, 0));
      expect(isWithinBusinessHours(saturday1100Utc, [1, 2, 3, 4, 5], '08:30', '17:00', -420)).toBe(false);
    });
  });
});
