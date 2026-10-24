import * as XLSX from 'xlsx';
import { Staff, ShiftDefinition, MonthlyStaffSummary, RoomType } from '../types';
import { THAI_MONTHS, getDayOfWeekThai } from './scheduler';

/**
 * Exports the OT Compensation claim sheet as Excel file (.xlsx)
 * Formatted with 5 columns, 1 row per OT duty date descending per staff, and no summary row
 */
export function exportOtClaimToExcel(
  year: number,
  month: number,
  room: RoomType | 'all',
  staffOtList: Array<{
    staff: Staff;
    otDates: Array<{
      day: number;
      dayOfWeek: string;
      shiftCode: string;
      dateLabel: string;
    }>;
  }>,
  monthName: string,
  thaiYear: number
) {
  const roomName = room === 'lab' ? 'ห้องปฏิบัติการ' : room === 'donation' ? 'ห้องรับบริจาคโลหิต' : 'รวมทุกห้อง';

  // Build rows for OT Claim
  const rows: Array<Record<string, any>> = [];

  staffOtList.forEach((item, staffIdx) => {
    if (item.otDates.length === 0) {
      rows.push({
        'ลำดับ': staffIdx + 1,
        'ชื่อ - สกุล': item.staff.name,
        'ตำแหน่ง': item.staff.position,
        'วันที่ปฏิบัติงาน OT': '-',
        'ลายมือชื่อผู้ขอเบิก': '',
      });
    } else {
      item.otDates.forEach((ot, dateIdx) => {
        rows.push({
          'ลำดับ': dateIdx === 0 ? staffIdx + 1 : '',
          'ชื่อ - สกุล': dateIdx === 0 ? item.staff.name : '',
          'ตำแหน่ง': dateIdx === 0 ? item.staff.position : '',
          'วันที่ปฏิบัติงาน OT': ot.dateLabel,
          'ลายมือชื่อผู้ขอเบิก': '',
        });
      });
    }
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 8 },  // ลำดับ
    { wch: 32 }, // ชื่อ - สกุล
    { wch: 14 }, // ตำแหน่ง
    { wch: 45 }, // วันที่ปฏิบัติงาน OT
    { wch: 25 }, // ลายมือชื่อ
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `OT_${monthName}_${thaiYear}`);

  const fileName = `ใบสำคัญขออนุมัติเบิกเงิน_OT_${roomName}_${monthName}_${thaiYear}.xlsx`;
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
