import test from 'node:test';
import assert from 'node:assert/strict';
import {
  diffStaffLists,
  diffShiftDefs,
  diffScheduleMaps,
  applyScheduleDeltas,
} from './deltaDiff';
import { INITIAL_STAFF, INITIAL_SHIFTS } from '../data/initialData';

test('diffStaffLists emits only the modified field of the modified staff member', () => {
  const prev = INITIAL_STAFF.map((s) => ({ ...s }));
  const next = INITIAL_STAFF.map((s) =>
    s.id === 'staff-2' ? { ...s, defaultRoom: 'donation' as const } : { ...s }
  );

  const result = diffStaffLists(prev, next);
  assert.equal(result.deletedIds.length, 0);
  assert.equal(result.changedStaff.length, 1);
  assert.equal(result.changedStaff[0].id, 'staff-2');
  assert.equal(result.changedStaff[0].isNew, false);
  assert.deepEqual(result.changedStaff[0].changes, {
    id: 'staff-2',
    defaultRoom: 'donation',
  });
});

test('diffStaffLists detects staff reordering only for affected staff orders', () => {
  const prev = INITIAL_STAFF.map((s) => ({ ...s }));
  // Swap order of staff-1 (1) and staff-2 (2)
  const next = INITIAL_STAFF.map((s) => {
    if (s.id === 'staff-1') return { ...s, order: 2 };
    if (s.id === 'staff-2') return { ...s, order: 1 };
    return { ...s };
  });

  const result = diffStaffLists(prev, next);
  assert.equal(result.changedStaff.length, 2);
  assert.deepEqual(result.changedStaff[0].changes, { id: 'staff-1', order: 2 });
  assert.deepEqual(result.changedStaff[1].changes, { id: 'staff-2', order: 1 });
});

test('diffStaffLists detects deleted staff IDs without touching remaining unchanged staff', () => {
  const prev = INITIAL_STAFF.slice(0, 5).map((s) => ({ ...s }));
  const next = prev.filter((s) => s.id !== 'staff-5');

  const result = diffStaffLists(prev, next);
  assert.equal(result.changedStaff.length, 0);
  assert.deepEqual(result.deletedIds, ['staff-5']);
});

test('diffScheduleMaps emits only changed or deleted cells and ignores untouched cells', () => {
  const prev: Record<string, string> = {
    'staff-1_1': 'ช',
    'staff-1_2': 'บด',
    'staff-2_1': 'ด',
  };
  const next: Record<string, string> = {
    'staff-1_1': 'ช', // unchanged
    'staff-1_2': '', // cleared
    'staff-2_1': 'OT2', // updated
    'staff-3_5': 'บ', // added
  };

  const deltas = diffScheduleMaps(prev, next);
  assert.deepEqual(deltas, {
    'staff-1_2': null,
    'staff-2_1': 'OT2',
    'staff-3_5': 'บ',
  });

  const applied = applyScheduleDeltas(prev, deltas);
  assert.deepEqual(applied, {
    'staff-1_1': 'ช',
    'staff-2_1': 'OT2',
    'staff-3_5': 'บ',
  });
});

test('diffShiftDefs emits only modified shift definitions', () => {
  const prev = INITIAL_SHIFTS.map((d) => ({ ...d, rates: { ...d.rates } }));
  const next = INITIAL_SHIFTS.map((d) =>
    d.code === 'OT1'
      ? { ...d, rates: { ...d.rates, MT: 200 } }
      : { ...d, rates: { ...d.rates } }
  );

  const result = diffShiftDefs(prev, next);
  assert.equal(result.deletedCodes.length, 0);
  assert.equal(result.changedDefs.length, 1);
  assert.equal(result.changedDefs[0].code, 'OT1');
  assert.equal(result.changedDefs[0].rates.MT, 200);
});
