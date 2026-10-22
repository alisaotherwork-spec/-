import test from 'node:test';
import assert from 'node:assert/strict';
import { generateAutoSchedule, getDaysInMonth } from './scheduler';
import { Staff } from '../types';

const mockMtStaff: Staff[] = Array.from({ length: 14 }, (_, i) => ({
  id: `mt-${i + 1}`,
  name: `ทนพ.คนทีี่ ${i + 1}`,
  position: 'MT',
  section: 'MT',
  order: i + 1,
  role: 'staff',
  isActive: true,
}));

test('getDaysInMonth handles standard and leap years', () => {
  assert.equal(getDaysInMonth(2024, 2), 29); // Leap year
  assert.equal(getDaysInMonth(2025, 2), 28); // Non-leap year
  assert.equal(getDaysInMonth(2026, 10), 31); // October
  assert.equal(getDaysInMonth(2026, 11), 30); // November
});

test('generateAutoSchedule allocates exactly 1 person per day cycling 1 to 14 then repeating on day 15', () => {
  const daysInOctober = 31;
  const schedule = generateAutoSchedule({
    mtStaffList: mockMtStaff,
    daysInMonth: daysInOctober,
    shiftCode: 'บด',
    startOrderIndex: 0,
  });

  // Day 1: Staff 1 gets 'บด'
  assert.equal(schedule['mt-1_1'], 'บด');
  // Day 2: Staff 2 gets 'บด'
  assert.equal(schedule['mt-2_2'], 'บด');
  // Day 14: Staff 14 gets 'บด'
  assert.equal(schedule['mt-14_14'], 'บด');
  // Day 15: Wraps back to Staff 1
  assert.equal(schedule['mt-1_15'], 'บด');
  // Day 16: Staff 2
  assert.equal(schedule['mt-2_16'], 'บด');
  // Day 28: Staff 14 (14 * 2)
  assert.equal(schedule['mt-14_28'], 'บด');
  // Day 29: Staff 1
  assert.equal(schedule['mt-1_29'], 'บด');
  // Day 30: Staff 2
  assert.equal(schedule['mt-2_30'], 'บด');
  // Day 31: Staff 3
  assert.equal(schedule['mt-3_31'], 'บด');

  // Verify non-duty slots are completely empty / undefined (100% empty blank, no OFF)
  assert.equal(schedule['mt-1_2'], undefined);
  assert.equal(schedule['mt-2_1'], undefined);
  assert.equal(schedule['mt-5_1'], undefined);

  // Exactly 31 assignments in the month
  const totalKeys = Object.keys(schedule).length;
  assert.equal(totalKeys, 31);
});

test('generateAutoSchedule allocates shift code บ identically cascading 1 to 14', () => {
  const daysInOctober = 31;
  const schedule = generateAutoSchedule({
    mtStaffList: mockMtStaff,
    daysInMonth: daysInOctober,
    shiftCode: 'บ',
    startOrderIndex: 0,
  });

  assert.equal(schedule['mt-1_1'], 'บ');
  assert.equal(schedule['mt-2_2'], 'บ');
  assert.equal(schedule['mt-14_14'], 'บ');
  assert.equal(schedule['mt-1_15'], 'บ');
  assert.equal(schedule['mt-2_16'], 'บ');
  assert.equal(schedule['mt-3_31'], 'บ');
  assert.equal(schedule['mt-1_2'], undefined);
});
