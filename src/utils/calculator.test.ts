import test from 'node:test';
import assert from 'node:assert/strict';
import { getRateForShiftAndPosition, calculateStaffMonthlySummary } from './calculator';
import { INITIAL_SHIFTS } from '../data/initialData';
import { Staff } from '../types';

test('getRateForShiftAndPosition returns correct rates for MT', () => {
  // MT rates check
  const sh = getRateForShiftAndPosition('ช', 'MT', INITIAL_SHIFTS);
  assert.equal(sh.rate, 900);
  assert.equal(sh.isOt, false);

  const b = getRateForShiftAndPosition('บ', 'MT', INITIAL_SHIFTS);
  assert.equal(b.rate, 1250);

  const d = getRateForShiftAndPosition('ด', 'MT', INITIAL_SHIFTS);
  assert.equal(d.rate, 1270);

  const bd = getRateForShiftAndPosition('บด', 'MT', INITIAL_SHIFTS);
  assert.equal(bd.rate, 2520);

  const ot1 = getRateForShiftAndPosition('OT1', 'MT', INITIAL_SHIFTS);
  assert.equal(ot1.rate, 175);
  assert.equal(ot1.isOt, true);
  assert.equal(ot1.otHours, 1);

  const ot4 = getRateForShiftAndPosition('OT4', 'MT', INITIAL_SHIFTS);
  assert.equal(ot4.rate, 700);
  assert.equal(ot4.isOt, true);
  assert.equal(ot4.otHours, 4);
});

test('getRateForShiftAndPosition returns correct rates for AMT/Office and Service', () => {
  // AMT: ช = 550, บด = 1380, OT1 = 80
  const amtSh = getRateForShiftAndPosition('ช', 'AMT', INITIAL_SHIFTS);
  assert.equal(amtSh.rate, 550);

  const amtBd = getRateForShiftAndPosition('บด', 'AMT', INITIAL_SHIFTS);
  assert.equal(amtBd.rate, 1380);

  const amtOt1 = getRateForShiftAndPosition('OT1', 'AMT', INITIAL_SHIFTS);
  assert.equal(amtOt1.rate, 80);

  // Service: ช = 460, บ = 540, ด = 560, OT1 = 55
  const srvSh = getRateForShiftAndPosition('ช', 'Service', INITIAL_SHIFTS);
  assert.equal(srvSh.rate, 460);

  const srvD = getRateForShiftAndPosition('ด', 'Service', INITIAL_SHIFTS);
  assert.equal(srvD.rate, 560);

  const srvOt4 = getRateForShiftAndPosition('OT4', 'Service', INITIAL_SHIFTS);
  assert.equal(srvOt4.rate, 220);
});

test('calculateStaffMonthlySummary accumulates regular shifts and OT separately', () => {
  const staff: Staff = {
    id: 's-test',
    name: 'ทดสอบ ผู้ปฏิบัติงาน',
    position: 'MT',
    section: 'MT',
    order: 1,
    role: 'staff',
    isActive: true,
  };

  const shiftsMap: Record<string, string> = {
    's-test_1': 'บด', // 2,520
    's-test_5': 'บด', // 2,520
    's-test_10': 'OT2', // 350 (2 hrs)
    's-test_15': 'OT4', // 700 (4 hrs)
  };

  const summary = calculateStaffMonthlySummary(staff, 31, shiftsMap, INITIAL_SHIFTS);

  assert.equal(summary.regularShiftCount, 2);
  assert.equal(summary.regularShiftIncome, 5040); // 2520 * 2
  assert.equal(summary.otCount, 2);
  assert.equal(summary.otHours, 6); // 2 + 4
  assert.equal(summary.otIncome, 1050); // 350 + 700
  assert.equal(summary.totalIncome, 6090);
});
