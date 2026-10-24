import React, { useState, useMemo } from 'react';
import { Staff, ShiftDefinition, MonthlyStaffSummary, RoomType } from '../types';
import { THAI_MONTHS, getDayOfWeekThai } from '../utils/scheduler';
import { exportOtClaimToExcel } from '../utils/exportExcel';
import { FileSpreadsheet, Printer, Clock, FileDown, Loader2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface OtClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  daysInMonth: number;
  room: RoomType | 'all';
  staffList: Staff[];
  shiftsMap: Record<string, string>;
  shiftDefs: ShiftDefinition[];
  summaries: MonthlyStaffSummary[];
}

interface StaffOtItem {
  staff: Staff;
  otDates: {
    day: number;
    dayOfWeek: string;
    shiftCode: string;
    timePeriod: string;
    dateLabel: string;
  }[];
}

/**
 * Returns duty time period for OT shifts:
 * OT1 -> 16.00 - 17.00 น. (1 hr)
 * OT2 -> 16.00 - 18.00 น. (2 hrs)
 * OT3 -> 16.00 - 19.00 น. (3 hrs)
 * OT4 -> 16.00 - 20.00 น. (4 hrs)
 */
export function getOtTimePeriod(code: string, def?: ShiftDefinition): string {
  const normalized = code.trim().toUpperCase();
  if (normalized === 'OT1') return '16.00 - 17.00 น.';
  if (normalized === 'OT2') return '16.00 - 18.00 น.';
  if (normalized === 'OT3') return '16.00 - 19.00 น.';
  if (normalized === 'OT4') return '16.00 - 20.00 น.';

  if (def?.otHours === 1) return '16.00 - 17.00 น.';
  if (def?.otHours === 2) return '16.00 - 18.00 น.';
  if (def?.otHours === 3) return '16.00 - 19.00 น.';
  if (def?.otHours === 4) return '16.00 - 20.00 น.';
  if (def?.otHours && def.otHours > 0) {
    const endHour = 16 + def.otHours;
    return `16.00 - ${endHour}.00 น.`;
  }
  return '16.00 - 20.00 น.';
}

export const OtClaimModal: React.FC<OtClaimModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
  daysInMonth,
  room,
  staffList,
  shiftsMap,
  shiftDefs,
  summaries,
}) => {
  const [onlyWithOt, setOnlyWithOt] = useState<boolean>(true);
  const [sectionFilter, setSectionFilter] = useState<'ALL' | 'MT' | 'SUPPORT' | 'PART_TIME'>('ALL');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const thaiYear = year + 543;
  const monthName = THAI_MONTHS[month - 1];
  const roomName = room === 'lab' ? 'ห้องปฏิบัติการ' : room === 'donation' ? 'ห้องรับบริจาคโลหิต' : 'รวมทุกห้องการทำงาน';

  // Build OT duty date records grouped staff by staff
  // Sequential: displays all OT duty dates for person 1, then person 2, and so on.
  const staffOtList: StaffOtItem[] = useMemo(() => {
    if (!isOpen) return [];

    return staffList
      .filter((staff) => {
        if (sectionFilter !== 'ALL' && staff.section !== sectionFilter) return false;
        return true;
      })
      .sort((a, b) => a.order - b.order)
      .map((staff) => {
        const otDates: StaffOtItem['otDates'] = [];

        for (let d = 1; d <= daysInMonth; d++) {
          const code = shiftsMap[`${staff.id}_${d}`];
          if (code) {
            const def = shiftDefs.find((s) => s.code.toLowerCase() === code.trim().toLowerCase());
            if (def?.isOt || /^OT/i.test(code)) {
              const timePeriod = getOtTimePeriod(code, def);
              otDates.push({
                day: d,
                dayOfWeek: getDayOfWeekThai(year, month, d),
                shiftCode: code.trim(),
                timePeriod,
                dateLabel: `วันที่ ${d} ${monthName} ${thaiYear} (${getDayOfWeekThai(year, month, d)}) เวลา ${timePeriod}`,
              });
            }
          }
        }

        return {
          staff,
          otDates,
        };
      })
      .filter((item) => {
        if (onlyWithOt) return item.otDates.length > 0;
        return true;
      });
  }, [isOpen, staffList, shiftsMap, shiftDefs, sectionFilter, onlyWithOt, daysInMonth, monthName, thaiYear, year, month]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadExcel = () => {
    exportOtClaimToExcel(year, month, room, staffOtList, monthName, thaiYear);
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('ot-claim-printable-content');
    if (!element) return;

    setIsGeneratingPdf(true);
    try {
      const generator = typeof html2pdf === 'function' ? html2pdf : (html2pdf as any).default || html2pdf;

      const opt = {
        margin: [8, 8, 10, 8] as [number, number, number, number],
        filename: `ใบสำคัญขออนุมัติเบิกเงิน_OT_${roomName}_${monthName}_${thaiYear}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          scrollY: 0,
          backgroundColor: '#ffffff',
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          avoid: ['tr', '.print-avoid-break'],
        },
      };

      await generator().set(opt).from(element).save();
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="printable-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="paper-card printable-modal-card w-full max-w-5xl my-6 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        
        {/* Header - No print */}
        <div className="bg-[#8B1E27] text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#A82B35] rounded-lg">
              <Clock className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-base sm:text-lg">
                ใบสำคัญขออนุมัติเบิกเงินค่าตอบแทนการปฏิบัติงานนอกเวลาราชการ (OT)
              </h3>
              <p className="text-xs text-amber-100/80">
                แสดงวันที่ปฏิบัติงานพร้อมช่วงเวลา • รพ.ธรรมศาสตร์เฉลิมพระเกียรติ
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadExcel}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="ดาวน์โหลดไฟล์ Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ดาวน์โหลด Excel</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2 bg-rose-700 hover:bg-rose-600 disabled:bg-stone-500 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="ดาวน์โหลดไฟล์ PDF ขนาด A4 จัดรูปแบบสวยงาม"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-rose-200" />
                  <span>กำลังสร้าง PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 text-rose-200" />
                  <span>ดาวน์โหลด PDF</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              title="สั่งพิมพ์เอกสารผ่านระบบพิมพ์"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสาร</span>
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 cursor-pointer ml-1"
              title="ปิดหน้าต่าง"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Action & Filter Bar - No print */}
        <div className="bg-[#F7F2EA] p-3 sm:p-4 border-b border-[#E5D5C5] flex flex-wrap items-center justify-between gap-3 no-print shrink-0 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 font-medium text-[#4A2E18] cursor-pointer">
              <input
                type="checkbox"
                checked={onlyWithOt}
                onChange={(e) => setOnlyWithOt(e.target.checked)}
                className="rounded text-[#8B1E27] focus:ring-[#8B1E27] h-4 w-4"
              />
              <span>แสดงเฉพาะเจ้าหน้าที่ที่มีเวร OT ({staffOtList.filter((s) => s.otDates.length > 0).length} ท่าน)</span>
            </label>

            <div className="flex items-center gap-1">
              <span className="text-stone-600 font-medium">กลุ่ม:</span>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value as any)}
                className="bg-white border border-[#D8C7B5] rounded-md px-2.5 py-1 text-xs text-stone-800 cursor-pointer"
              >
                <option value="ALL">ทั้งหมด</option>
                <option value="MT">นักเทคนิคการแพทย์ (MT)</option>
                <option value="SUPPORT">สายสนับสนุน (AMT/Office/Service)</option>
                <option value="PART_TIME">Part-time</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-stone-700 bg-white px-3 py-1.5 rounded-lg border border-[#D8C7B5]">
            <span>รวมทั้งหมด: <strong className="text-emerald-800 font-bold">{staffOtList.reduce((sum, s) => sum + s.otDates.length, 0)} วันปฏิบัติงาน OT</strong></span>
          </div>
        </div>

        {/* Printable Sheet View - Formatted for official hospital A4 paper */}
        <div
          id="ot-claim-printable-content"
          className="printable-sheet p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-black print:p-0"
        >
          {/* Printable Page Header */}
          <div className="print-avoid-break text-center pb-4 mb-4 border-b-2 border-stone-800" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div className="text-xs uppercase tracking-wider font-semibold text-stone-600">
              โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-heading text-stone-900 mt-1">
              ใบสำคัญขออนุมัติเบิกเงินค่าตอบแทนการปฏิบัติงานนอกเวลาราชการ (OT)
            </h2>
            <div className="text-xs sm:text-sm text-stone-700 mt-1.5 flex flex-wrap justify-center gap-3">
              <span>งานเวชศาสตร์บริการโลหิต</span>
              <span>•</span>
              <span>ห้องการทำงาน: <strong className="text-stone-900">{roomName}</strong></span>
              <span>•</span>
              <span>ประจำเดือน <strong className="text-stone-900">{monthName} พ.ศ. {thaiYear}</strong></span>
            </div>
          </div>

          {/* Formatted Table: 
              - Replaced OT1, OT2, OT3, OT4 with duty time periods (ช่วงเวลาที่ปฏิบัติงาน)
              - 5 Columns with fixed table layout perfectly sized for A4 portrait
              - 1 cell per duty date descending sequentially per person
              - Repeating thead across all print pages
          */}
          <div className="printable-table-container overflow-x-auto border border-stone-800 rounded-sm">
            <table
              className="printable-table w-full text-xs border-collapse border border-stone-800"
              style={{ tableLayout: 'fixed', width: '100%' }}
            >
              <colgroup>
                <col style={{ width: '7%' }} />
                <col style={{ width: '27%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '35%' }} />
                <col style={{ width: '18%' }} />
              </colgroup>
              <thead
                style={{ display: 'table-header-group' }}
                className="bg-stone-200 text-stone-900 font-bold border-b-2 border-stone-800"
              >
                <tr>
                  <th className="p-2.5 border border-stone-600 text-center bg-stone-200 font-bold text-stone-950">
                    ลำดับ
                  </th>
                  <th className="p-2.5 border border-stone-600 text-left bg-stone-200 font-bold text-stone-950">
                    ชื่อ - สกุล
                  </th>
                  <th className="p-2.5 border border-stone-600 text-center bg-stone-200 font-bold text-stone-950">
                    ตำแหน่ง
                  </th>
                  {/* Duty dates listed 1 cell per day descending with duty time period */}
                  <th className="p-2.5 border border-stone-600 text-left bg-stone-200 font-bold text-stone-950">
                    วันที่ปฏิบัติงาน OT
                  </th>
                  <th className="p-2.5 border border-stone-600 text-center bg-stone-200 font-bold text-stone-950">
                    ลายมือชื่อผู้ขอเบิก
                  </th>
                </tr>
              </thead>
              <tbody style={{ display: 'table-row-group' }}>
                {staffOtList.length > 0 ? (
                  staffOtList.map((item, staffIdx) => {
                    const rowCount = Math.max(1, item.otDates.length);
                    const hasDates = item.otDates.length > 0;

                    return (
                      <React.Fragment key={item.staff.id}>
                        {/* First row for this staff */}
                        <tr
                          className="border-b border-stone-300 hover:bg-stone-50 print:hover:bg-transparent"
                          style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                        >
                          {/* Column 1: ลำดับ (rowspan over all OT dates of this person) */}
                          <td
                            rowSpan={rowCount}
                            className="p-2 border border-stone-400 text-center font-mono align-top font-bold text-stone-800 bg-stone-50/50"
                          >
                            {staffIdx + 1}
                          </td>

                          {/* Column 2: ชื่อ - สกุล (rowspan) */}
                          <td
                            rowSpan={rowCount}
                            className="p-2 border border-stone-400 font-semibold text-stone-950 align-top"
                          >
                            <div>{item.staff.name}</div>
                            {item.staff.englishName && (
                              <div className="text-[10px] text-stone-500 font-normal italic">
                                {item.staff.englishName}
                              </div>
                            )}
                          </td>

                          {/* Column 3: ตำแหน่ง (rowspan) */}
                          <td
                            rowSpan={rowCount}
                            className="p-2 border border-stone-400 text-center font-medium text-stone-700 align-top"
                          >
                            <span className="px-2 py-0.5 rounded-sm bg-stone-100 border border-stone-300">
                              {item.staff.position}
                            </span>
                          </td>

                          {/* Column 4: วันที่ปฏิบัติงาน OT - Day 1 with duty time period */}
                          <td className="p-2 border border-stone-400 text-stone-900 font-medium bg-white">
                            {hasDates ? (
                              <span>
                                วันที่ {item.otDates[0].day} {monthName} {thaiYear} ({item.otDates[0].dayOfWeek}){' '}
                                <strong className="text-stone-950 font-semibold">เวลา {item.otDates[0].timePeriod}</strong>
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          {/* Column 5: ลายมือชื่อผู้ขอเบิก (rowspan) */}
                          <td
                            rowSpan={rowCount}
                            className="p-2 border border-stone-400 text-center align-middle text-stone-400"
                          >
                            <div className="py-2">....................................</div>
                          </td>
                        </tr>

                        {/* Subsequent rows for this staff member's other OT duty dates */}
                        {item.otDates.slice(1).map((otItem, dateIdx) => (
                          <tr
                            key={`${item.staff.id}_ot_${otItem.day}_${dateIdx}`}
                            className="border-b border-stone-300 hover:bg-stone-50 print:hover:bg-transparent"
                            style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                          >
                            {/* Only the duty date cell is rendered here, others are covered by rowSpan */}
                            <td className="p-2 border border-stone-400 text-stone-900 font-medium bg-white">
                              <span>
                                วันที่ {otItem.day} {monthName} {thaiYear} ({otItem.dayOfWeek}){' '}
                                <strong className="text-stone-950 font-semibold">เวลา {otItem.timePeriod}</strong>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-stone-500 border border-stone-400">
                      ไม่พบรายการเบิกจ่ายค่าตอบแทน OT สำหรับเงื่อนไขที่เลือก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Official Signatures (No grand total row as requested) */}
          <div
            className="print-avoid-break mt-10 grid grid-cols-2 gap-8 text-center text-xs"
            style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
          >
            <div>
              <div className="h-10"></div>
              <p className="border-t border-dotted border-stone-500 pt-2 inline-block px-10">
                ลงชื่อ......................................................ผู้ตรวจสอบและรวบรวม
              </p>
              <p className="text-[11px] text-stone-600 mt-1">ตำแหน่ง เจ้าหน้าที่งานเวชศาสตร์บริการโลหิต</p>
            </div>
            <div>
              <div className="h-10"></div>
              <p className="border-t border-dotted border-stone-500 pt-2 inline-block px-10">
                ลงชื่อ......................................................หัวหน้างานเวชศาสตร์บริการโลหิต
              </p>
              <p className="text-[11px] text-stone-800 font-semibold mt-1">
                (ทนพญ.ณิชาภา เจียมจรรยา)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

