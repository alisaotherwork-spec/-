import test from 'node:test';
import assert from 'node:assert/strict';
import { getOtTimePeriod } from '../components/OtClaimModal';
import { THAI_MONTHS, getDayOfWeekThai } from '../utils/scheduler';

test('getOtTimePeriod returns correct time periods according to requirements', () => {
  assert.equal(getOtTimePeriod('OT1'), '16.00 - 17.00 น.');
  assert.equal(getOtTimePeriod('OT2'), '16.00 - 18.00 น.');
  assert.equal(getOtTimePeriod('OT3'), '16.00 - 19.00 น.');
  assert.equal(getOtTimePeriod('OT4'), '16.00 - 20.00 น.');
  assert.equal(getOtTimePeriod('ot1'), '16.00 - 17.00 น.');
  assert.equal(getOtTimePeriod('ot4'), '16.00 - 20.00 น.');
});

test('OT date row string format matches reference image e0d8fa80.png', () => {
  // Oct 2026 (พ.ศ. 2569)
  const year = 2026;
  const month = 10;
  const day = 1;
  const thaiYear = year + 543;
  const monthName = THAI_MONTHS[month - 1];
  const dayOfWeek = getDayOfWeekThai(year, month, day);
  const timePeriod = getOtTimePeriod('OT4');

  const formattedRow = `วันที่ ${day} ${monthName} ${thaiYear} (${dayOfWeek}) เวลา ${timePeriod}`;
  assert.equal(formattedRow, 'วันที่ 1 ตุลาคม 2569 (พฤ.) เวลา 16.00 - 20.00 น.');

  // Day 2 OT2
  const day2 = 2;
  const dayOfWeek2 = getDayOfWeekThai(year, month, day2);
  const timePeriod2 = getOtTimePeriod('OT2');
  const formattedRow2 = `วันที่ ${day2} ${monthName} ${thaiYear} (${dayOfWeek2}) เวลา ${timePeriod2}`;
  assert.equal(formattedRow2, 'วันที่ 2 ตุลาคม 2569 (ศ.) เวลา 16.00 - 18.00 น.');
});
