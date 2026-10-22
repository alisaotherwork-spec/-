import * as XLSX from 'xlsx';
import { Staff, ShiftDefinition, MonthlyStaffSummary, RoomType } from '../types';
import { THAI_MONTHS, getDayOfWeekThai } from './scheduler';

/**
 * Exports the OT Compensation claim sheet as Excel file (.xlsx)
 */
export function exportOtClaimToExcel(
  year: number,
  month: number,
  room: RoomType | 'all',
  summaries: MonthlyStaffSummary[],
  shiftsMap: Record<string, string>,
  daysInMonth: number,
  shiftDefs: ShiftDefinition[]
) {
  const thaiYear = year + 543;
  const monthName = THAI_MONTHS[month - 1];
  const roomName = room === 'lab' ? 'ห้องปฏิบัติการ' : room === 'donation' ? 'ห้องบริจาคโลหิต' : 'ทุกห้องการทำงาน';

  // Build rows for OT Claim
  const rows: Array<Record<string, any>> = [];

  let grandTotalHours = 0;
  let grandTotalAmount = 0;
  let runningIndex = 1;

  // Filter only staff with OT or list all staff
  const staffWithOt = summaries.filter((s) => s.otCount > 0);
  const displayList = staffWithOt.length > 0 ? staffWithOt : summaries;

  displayList.forEach((item) => {
    // Find all OT dates for this staff
    const otDates: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const code = shiftsMap[`${item.staffId}_${d}`];
      if (code) {
        const def = shiftDefs.find((s) => s.code.toLowerCase() === code.trim().toLowerCase());
        if (def?.isOt || /^OT/i.test(code)) {
          otDates.push(`${d}`);
        }
      }
    }

    grandTotalHours += item.otHours;
    grandTotalAmount += item.otIncome;

    rows.push({
      'ลำดับ': runningIndex++,
      'ชื่อ - สกุล': item.staff.name,
      'ตำแหน่ง': item.staff.position,
      'ประเภท': item.staff.section === 'MT' ? 'นักเทคนิคการแพทย์' : item.staff.section === 'SUPPORT' ? 'สายสนับสนุน' : 'Part-time',
      'วันที่ปฏิบัติงาน OT': otDates.join(', ') || '-',
      'จำนวนครั้ง': item.otCount,
      'จำนวนชั่วโมง OT (ชม.)': item.otHours,
      'รวมเป็นเงิน (บาท)': item.otIncome,
      'หมายเหตุ / ลายมือชื่อ': '',
    });
  });

  // Summary Row
  rows.push({
    'ลำดับ': '',
    'ชื่อ - สกุล': 'รวมทั้งสิ้น',
    'ตำแหน่ง': '',
    'ประเภท': '',
    'วันที่ปฏิบัติงาน OT': '',
    'จำนวนครั้ง': '',
    'จำนวนชั่วโมง OT (ชม.)': grandTotalHours,
    'รวมเป็นเงิน (บาท)': grandTotalAmount,
    'หมายเหตุ / ลายมือชื่อ': '',
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 8 },  // ลำดับ
    { wch: 32 }, // ชื่อ - สกุล
    { wch: 12 }, // ตำแหน่ง
    { wch: 20 }, // ประเภท
    { wch: 30 }, // วันที่ปฏิบัติงาน OT
    { wch: 12 }, // จำนวนครั้ง
    { wch: 22 }, // จำนวนชั่วโมง OT
    { wch: 20 }, // รวมเงิน
    { wch: 25 }, // ลายมือชื่อ
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `OT_${monthName}_${thaiYear}`);

  const fileName = `ใบเบิกค่าตอบแทน_OT_${roomName}_${monthName}_${thaiYear}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports Full Monthly Duty Schedule matrix to Excel (.xlsx)
 */
export function exportDutyScheduleToExcel(
  year: number,
  month: number,
  room: RoomType | 'all',
  staffList: Staff[],
  daysInMonth: number,
  shiftsMap: Record<string, string>,
  summaries: MonthlyStaffSummary[]
) {
  const thaiYear = year + 543;
  const monthName = THAI_MONTHS[month - 1];
  const roomName = room === 'lab' ? 'ห้องปฏิบัติการ' : room === 'donation' ? 'ห้องบริจาคโลหิต' : 'รวมทุกห้อง';

  const rows: any[] = [];

  // Group by sections
  const sections: { title: string; filter: (s: Staff) => boolean }[] = [
    { title: '1. นักเทคนิคการแพทย์ (MT)', filter: (s) => s.section === 'MT' },
    { title: '2. ผู้ช่วยนักเทคนิคการแพทย์ / ธุรการ / พนักงานช่วยงานบริการ', filter: (s) => s.section === 'SUPPORT' },
    { title: '3. เจ้าหน้าที่ Part-time', filter: (s) => s.section === 'PART_TIME' },
  ];

  sections.forEach((sec) => {
    rows.push({ 'ลำดับ': `=== ${sec.title} ===` });
    const members = staffList.filter(sec.filter).sort((a, b) => a.order - b.order);

    members.forEach((staff, idx) => {
      const summary = summaries.find((s) => s.staffId === staff.id);
      const rowObj: Record<string, any> = {
        'ลำดับ': idx + 1,
        'ชื่อ - นามสกุล': staff.name,
        'ตำแหน่ง': staff.position,
      };

      for (let d = 1; d <= daysInMonth; d++) {
        const dayOfWeek = getDayOfWeekThai(year, month, d);
        const colHeader = `${d} (${dayOfWeek})`;
        rowObj[colHeader] = shiftsMap[`${staff.id}_${d}`] || '';
      }

      rowObj['เวรปกติ (ครั้ง)'] = summary?.regularShiftCount || 0;
      rowObj['OT (ชม.)'] = summary?.otHours || 0;
      rowObj['ค่าเวรปกติ (บาท)'] = summary?.regularShiftIncome || 0;
      rowObj['ค่า OT (บาท)'] = summary?.otIncome || 0;
      rowObj['รวมเงินทั้งหมด (บาท)'] = summary?.totalIncome || 0;

      rows.push(rowObj);
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `ตารางเวร_${monthName}_${thaiYear}`);

  const fileName = `ตารางเวร_${roomName}_${monthName}_${thaiYear}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
