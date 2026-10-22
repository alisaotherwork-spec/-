import { Staff, RoomType } from '../types';

export interface AutoScheduleOptions {
  mtStaffList: Staff[];
  daysInMonth: number;
  shiftCode?: string; // defaults to 'บด'
  startOrderIndex?: number; // 0-based index for day 1 (default 0 -> staff 1)
  targetRoom?: RoomType;
  existingShifts?: Record<string, string>;
  preserveExisting?: boolean;
}

/**
 * Returns number of days in a given month and year.
 * month is 1-indexed (1 = January, 12 = December)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Returns Thai day name for a specific date (1-indexed day, month)
 */
export const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
export const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export function getDayOfWeekThai(year: number, month: number, day: number): string {
  const d = new Date(year, month - 1, day);
  return THAI_DAYS_SHORT[d.getDay()];
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const d = new Date(year, month - 1, day);
  const dayOfWeek = d.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}

/**
 * Auto-Scheduler Algorithm according to hospital specification:
 * 1. Cascading down from left to right (1 person per day, repeating across the whole month):
 *    - Day 1: Staff #1 (ทนพญ.ณิชาภา) gets 'บด'
 *    - Day 2: Staff #2 gets 'บด'
 *    - ...
 *    - Day 14: Staff #14 gets 'บด'
 *    - Day 15: Wraps back to Staff #1 getting 'บด'
 *    - And repeats sequentially until the last day of the month.
 * 2. Non-duty slots are 100% empty (no 'OFF' or symbols).
 */
export function generateAutoSchedule(options: AutoScheduleOptions): Record<string, string> {
  const {
    mtStaffList,
    daysInMonth,
    shiftCode = 'บด',
    startOrderIndex = 0,
    existingShifts = {},
    preserveExisting = false,
  } = options;

  // Filter and sort MT staff by order
  const activeMts = [...mtStaffList]
    .filter((s) => s.isActive && s.section === 'MT')
    .sort((a, b) => a.order - b.order);

  if (activeMts.length === 0) {
    return { ...existingShifts };
  }

  const result: Record<string, string> = preserveExisting ? { ...existingShifts } : {};

  // If not preserving existing, copy shifts of non-MT staff
  if (!preserveExisting) {
    Object.entries(existingShifts).forEach(([key, val]) => {
      const [staffId] = key.split('_');
      const isMt = activeMts.some((s) => s.id === staffId);
      if (!isMt) {
        result[key] = val;
      }
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cycleIndex = (startOrderIndex + (day - 1)) % activeMts.length;
    const assignedStaff = activeMts[cycleIndex];
    const key = `${assignedStaff.id}_${day}`;
    result[key] = shiftCode;
  }

  return result;
}
