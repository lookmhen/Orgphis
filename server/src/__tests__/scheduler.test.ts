import { describe, it, expect } from 'vitest';
import {
  isAllowedDay,
  getValidScheduleDates,
  generateRandomizedSchedule,
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
});
