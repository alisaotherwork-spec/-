import React, { useState, useMemo } from 'react';
import { Staff, ShiftDefinition, RoomType } from '../types';
import { THAI_MONTHS, getDayOfWeekThai } from '../utils/scheduler';
import { Calendar, Printer, Filter, Users, FileText, FileDown, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

interface DailySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  daysInMonth: number;
  room: RoomType | 'all';
  staffList: Staff[];
  shiftsMap: Record<string, string>;
  shiftDefs: ShiftDefinition[];
}

interface DailyDutyEntry {
  day: number;
  dayOfWeek: string;
  dateText: string;
  indexInDay: number;
  globalIndex: number;
  staff: Staff;
  code: string;
}

// 3 Shift slots: เช้า (ช), บ่าย (บ), ดึก (ด)
const SHIFT_SLOTS = [
  {
    id: 'morning',
    label: 'เวรเช้า (ช)',
    match: (code: string) => /^ช\d?$/i.test(code) || /^ชบ/i.test(code) || /^ชบด/i.test(code),
  },
  {
    id: 'afternoon',
    label: 'เวรบ่าย (บ)',
    match: (code: string) => /^บ\d?$/i.test(code) || /^ชบ/i.test(code) || /^บด/i.test(code) || /^ชบด/i.test(code),
  },
  {
    id: 'night',
    label: 'เวรดึก (ด)',
    match: (code: string) => /^ด\d?$/i.test(code) || /^บด/i.test(code) || /^ชบด/i.test(code),
  },
];

export interface PageChunk {
  pageNumber: number;
  totalPages: number;
  entries: DailyDutyEntry[];
  isFirstPage: boolean;
  isLastPage: boolean;
}

/**
 * Partitions entries into discrete A4 portrait pages to guarantee:
 * 1. Table header (thead) repeats at the top of every single page.
 * 2. Rows never get sliced/cut in half across page boundaries.
 * 3. Page 1 accommodates the full document title header.
 * 4. The last page accommodates the statistics summary and official signatures.
 */
export function chunkDutyEntriesForPdf(entries: DailyDutyEntry[]): PageChunk[] {
  if (entries.length === 0) {
    return [
      {
        pageNumber: 1,
        totalPages: 1,
        entries: [],
        isFirstPage: true,
        isLastPage: true,
      },
    ];
  }

  // If all rows comfortably fit on a single page with full header and footer
  if (entries.length <= 16) {
    return [
      {
        pageNumber: 1,
        totalPages: 1,
        entries,
        isFirstPage: true,
        isLastPage: true,
      },
    ];
  }

  // Multi-page document:
  // Page 1 capacity: 21 rows (fills full A4 page with header)
  // Intermediate page capacity: 23 rows (fills full A4 page with subheader)
  // Last page capacity: up to 17 rows (with stats footer and signatures)
  const pages: DailyDutyEntry[][] = [];
  let remaining = [...entries];

  while (remaining.length > 0) {
    const isFirst = pages.length === 0;

    // Check if what remains fits on the last page with footer
    if (!isFirst && remaining.length <= 17) {
      pages.push(remaining);
      break;
    }

    // Capacity for page 1 is 21 rows, subsequent pages 23 rows
    const capacity = isFirst ? 21 : 23;

    if (remaining.length <= capacity) {
      const splitCount = Math.ceil(remaining.length / 2);
      pages.push(remaining.slice(0, splitCount));
      remaining = remaining.slice(splitCount);
      continue;
    }

    pages.push(remaining.slice(0, capacity));
    remaining = remaining.slice(capacity);
  }

  const totalPages = pages.length;
  return pages.map((pageEntries, idx) => ({
    pageNumber: idx + 1,
    totalPages,
    entries: pageEntries,
    isFirstPage: idx === 0,
    isLastPage: idx === totalPages - 1,
  }));
}

export const DailySummaryModal: React.FC<DailySummaryModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
  daysInMonth,
  room,
  staffList,
  shiftsMap,
  shiftDefs,
}) => {
  // 'ALL' = include all days in month, or specific day number (1..daysInMonth)
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'ALL'>('ALL');
  const [sectionFilter, setSectionFilter] = useState<'ALL' | 'MT' | 'SUPPORT' | 'PART_TIME'>('ALL');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const monthName = THAI_MONTHS[month - 1];

  // Collect on-duty entries: ONLY people who have duty on that day, across all days in the month
  const dutyEntries = useMemo(() => {
    if (!isOpen) return [];
    const list: DailyDutyEntry[] = [];
    let runningGlobalIndex = 1;

    const startDay = selectedDayFilter === 'ALL' ? 1 : selectedDayFilter;
    const endDay = selectedDayFilter === 'ALL' ? daysInMonth : selectedDayFilter;

    for (let d = startDay; d <= endDay; d++) {
      const dayOfWeek = getDayOfWeekThai(year, month, d);
      const dateText = `${d} ${monthName}`;

      // Filter only staff who have an assigned duty code on day d
      const onDutyStaff = staffList
        .filter((staff) => {
          if (sectionFilter !== 'ALL' && staff.section !== sectionFilter) return false;
          const code = shiftsMap[`${staff.id}_${d}`];
          return !!code && code.trim() !== '';
        })
        .sort((a, b) => a.order - b.order);

      onDutyStaff.forEach((staff, idx) => {
        const code = shiftsMap[`${staff.id}_${d}`].trim();
        list.push({
          day: d,
          dayOfWeek,
          dateText,
          indexInDay: idx + 1,
          globalIndex: runningGlobalIndex++,
          staff,
          code,
        });
      });
    }

    return list;
  }, [isOpen, selectedDayFilter, sectionFilter, staffList, shiftsMap, year, month, daysInMonth, monthName]);

  // Partition into A4-sized pages with repeating headers and no cut rows
  const pageChunks = useMemo(() => {
    return chunkDutyEntriesForPdf(dutyEntries);
  }, [dutyEntries]);

  if (!isOpen) return null;

  const thaiYear = year + 543;
  const roomName = room === 'lab' ? 'ห้องปฏิบัติการ' : room === 'donation' ? 'ห้องรับบริจาคโลหิต' : 'รวมทุกห้องการทำงาน';
  const shiftSlots = SHIFT_SLOTS;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const pageElements = document.querySelectorAll<HTMLElement>('.daily-summary-pdf-page');
      if (pageElements.length === 0) return;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        // Standard A4 portrait size: 210mm width x 297mm height
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }

      const fileDateSuffix = selectedDayFilter === 'ALL'
        ? `${monthName}_${thaiYear}`
        : `วันที่_${selectedDayFilter}_${monthName}_${thaiYear}`;

      pdf.save(`ใบสรุปการปฏิบัติงานเวรประจำวัน_${roomName}_${fileDateSuffix}.pdf`);
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
              <Calendar className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-base sm:text-lg">ใบสรุปการปฏิบัติงานเวรประจำวัน</h3>
              <p className="text-xs text-amber-100/80">
                ดึงเฉพาะผู้ที่มีเวรในวันนั้น และรวบรวมทุกวันในเดือน • รพ.ธรรมศาสตร์เฉลิมพระเกียรติ
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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

        {/* Filter Controls Bar - No print */}
        <div className="bg-[#F7F2EA] p-3 sm:p-4 border-b border-[#E5D5C5] flex flex-wrap items-center justify-between gap-3 no-print shrink-0 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Filter by Day */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[#4A2E18]">ช่วงวันที่:</span>
              <select
                value={selectedDayFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedDayFilter(val === 'ALL' ? 'ALL' : Number(val));
                }}
                className="px-3 py-1.5 font-medium bg-white border border-[#D8C7B5] rounded-lg text-stone-800 cursor-pointer"
              >
                <option value="ALL">รวมทุกวันในเดือน (1 - {daysInMonth} {monthName} {thaiYear})</option>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    เฉพาะวันที่ {d} {monthName} ({getDayOfWeekThai(year, month, d)})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Section */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-600 font-medium">กลุ่ม:</span>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white border border-[#D8C7B5] rounded-lg text-stone-800 cursor-pointer"
              >
                <option value="ALL">ทั้งหมด (MT, สายสนับสนุน, Part-time)</option>
                <option value="MT">เฉพาะนักเทคนิคการแพทย์ (MT)</option>
                <option value="SUPPORT">เฉพาะสายสนับสนุน (AMT/Office/Service)</option>
                <option value="PART_TIME">เฉพาะ Part-time</option>
              </select>
            </div>
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-[#D8C7B5]">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-4 bg-white border-2 border-stone-800 rounded-xs shadow-xs" />
              <span className="text-stone-800 font-semibold">ช่องสีขาว = อยู่เวร</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-4 bg-stone-400 border border-stone-500 rounded-xs" />
              <span className="text-stone-600 font-medium">ช่องสีเทา = ไม่อยู่เวร</span>
            </div>
          </div>
        </div>

        {/* Printable Paper Document Container - Official A4 format */}
        <div
          id="daily-summary-printable-content"
          className="p-4 sm:p-6 overflow-y-auto flex-1 bg-stone-100 print:bg-white print:p-0"
        >
          {pageChunks.map((chunk) => (
            <React.Fragment key={`page-chunk-${chunk.pageNumber}`}>
              <div
                className="daily-summary-pdf-page printable-sheet bg-white text-stone-900 border border-stone-300 shadow-md mx-auto p-8 sm:p-10 print:border-none print:shadow-none print:m-0 print:p-6"
                style={{
                  width: '794px',
                  height: '1120px',
                  minHeight: '1120px',
                  boxSizing: 'border-box',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#ffffff',
                  breakAfter: 'page',
                  pageBreakAfter: 'always',
                }}
              >
                {/* Document Header on Page 1 or Compact Subheader on Subsequent Pages */}
                {chunk.isFirstPage ? (
                  <div
                    className="print-avoid-break text-center pb-3 mb-3 border-b-2 border-stone-800"
                    style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                  >
                    <div className="text-xs uppercase tracking-wider font-semibold text-stone-600">
                      โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold font-heading text-stone-900 mt-1">
                      ใบสรุปการปฏิบัติงานเวรประจำวัน งานเวชศาสตร์บริการโลหิต
                    </h2>
                    <div className="text-xs sm:text-sm text-stone-700 mt-1.5 flex flex-wrap justify-center items-center gap-2">
                      <span>ห้องการทำงาน: <strong className="text-stone-900">{roomName}</strong></span>
                      <span>•</span>
                      <span>
                        ประจำเดือน: <strong className="text-stone-900">{monthName} พ.ศ. {thaiYear}</strong>
                        {selectedDayFilter !== 'ALL' && (
                          <span className="text-amber-800 ml-1 font-semibold">(เฉพาะวันที่ {selectedDayFilter})</span>
                        )}
                      </span>
                      {chunk.totalPages > 1 && (
                        <>
                          <span>•</span>
                          <span className="text-stone-600 font-medium">
                            (หน้า {chunk.pageNumber} จาก {chunk.totalPages})
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    className="print-avoid-break pb-2.5 mb-3 border-b-2 border-stone-700 flex items-center justify-between text-xs"
                    style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                  >
                    <span className="font-semibold text-stone-700">
                      โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ • งานเวชศาสตร์บริการโลหิต
                    </span>
                    <span className="font-bold text-stone-900">
                      ใบสรุปการปฏิบัติงานเวรประจำวัน (ต่อ) - {monthName} พ.ศ. {thaiYear}
                    </span>
                    <span className="font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-xs border border-stone-300">
                      หน้า {chunk.pageNumber} จาก {chunk.totalPages}
                    </span>
                  </div>
                )}

                {/* Formal Official Table with REPEATING HEADER on every single page */}
                <div
                  className={`printable-table-container overflow-x-auto border border-stone-800 rounded-xs mb-3 ${
                    chunk.isLastPage ? '' : 'flex-1'
                  }`}
                >
                  <table
                    className="printable-table w-full text-xs border-collapse border border-stone-800"
                    style={{ tableLayout: 'fixed', width: '100%' }}
                  >
                    <colgroup>
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '7%' }} />
                      <col style={{ width: '30%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '11%' }} />
                    </colgroup>
                    <thead
                      style={{ display: 'table-header-group' }}
                      className="bg-stone-200 text-stone-900 font-bold border-b-2 border-stone-800"
                    >
                      <tr>
                        {/* Column 1: วันที่ เดือน */}
                        <th className="py-2.5 px-2 border border-stone-600 text-center bg-stone-200 font-bold text-stone-950 text-xs sm:text-[13px]">
                          วันที่ เดือน
                        </th>
                        <th className="py-2.5 px-1.5 border border-stone-600 text-center bg-stone-200 font-bold text-stone-950 text-xs sm:text-[13px]">
                          ลำดับ
                        </th>
                        <th className="py-2.5 px-3 border border-stone-600 text-left bg-stone-200 font-bold text-stone-950 text-xs sm:text-[13px]">
                          ชื่อ - นามสกุล
                        </th>
                        <th className="py-2.5 px-1.5 border border-stone-600 text-center bg-stone-200 font-bold text-stone-950 text-xs sm:text-[13px]">
                          ตำแหน่ง
                        </th>
                        {shiftSlots.map((slot) => (
                          <th
                            key={slot.id}
                            className="py-2.5 px-1 border border-stone-600 text-center bg-stone-200 font-bold text-stone-950 text-xs sm:text-[13px]"
                          >
                            {slot.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody style={{ display: 'table-row-group' }}>
                      {chunk.entries.length > 0 ? (
                        chunk.entries.map((entry, idx) => {
                          const isNewDay = idx === 0 || chunk.entries[idx - 1].day !== entry.day;

                          return (
                            <tr
                              key={`${entry.staff.id}_${entry.day}_${idx}`}
                              className={`border-b border-stone-300 hover:bg-stone-50 print:hover:bg-transparent ${
                                isNewDay && idx !== 0 ? 'border-t-2 border-stone-500' : ''
                              }`}
                              style={{ breakInside: 'avoid', pageBreakInside: 'avoid', height: '40px' }}
                            >
                              {/* Column 1: วันที่ เดือน */}
                              <td className="py-2.5 px-2 text-center border border-stone-400 font-bold text-stone-900 whitespace-nowrap bg-stone-50 text-xs sm:text-[13px]">
                                {entry.dateText} ({entry.dayOfWeek})
                              </td>
                              <td className="py-2.5 px-1.5 text-center border border-stone-400 text-stone-700 font-mono font-medium text-xs sm:text-[13px]">
                                {entry.indexInDay}
                              </td>
                              <td className="py-2.5 px-3 font-semibold border border-stone-400 text-stone-950 text-xs sm:text-[13px]">
                                {entry.staff.name}
                              </td>
                              <td className="py-2.5 px-1.5 text-center border border-stone-400 text-stone-700 font-medium text-xs">
                                <span className="px-2 py-0.5 rounded-xs bg-stone-100 border border-stone-300 text-[11px] font-medium">
                                  {entry.staff.position}
                                </span>
                              </td>

                              {/* Duty / No-duty columns filled 100% full solid color without symbols */}
                              {shiftSlots.map((slot) => {
                                const matchesSlot = slot.match(entry.code);
                                return (
                                  <td
                                    key={slot.id}
                                    className="p-0 border border-stone-400 text-center align-middle"
                                    style={{
                                      backgroundColor: matchesSlot ? '#ffffff' : '#9ca3af',
                                      WebkitPrintColorAdjust: 'exact',
                                      printColorAdjust: 'exact',
                                    }}
                                    title={matchesSlot ? `มีเวร (${slot.label})` : 'ไม่มีเวร'}
                                  >
                                    <div
                                      className="w-full h-9 min-h-[36px] flex items-center justify-center"
                                      style={{
                                        backgroundColor: matchesSlot ? '#ffffff' : '#9ca3af',
                                        WebkitPrintColorAdjust: 'exact',
                                        printColorAdjust: 'exact',
                                      }}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-stone-500 border border-stone-400">
                            ไม่พบข้อมูลผู้มีเวรปฏิบัติงานตามเงื่อนไขที่เลือก
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Last Page: Statistics Summary & Approval Signatures */}
                {chunk.isLastPage && (
                  <div className="mt-auto">
                    {/* Monthly Shift Statistics Footer Box */}
                    <div
                      className="print-avoid-break mt-4 p-2.5 bg-stone-50 border border-stone-400 rounded-xs text-xs flex flex-wrap items-center justify-between gap-3"
                      style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                    >
                      <div>
                        <span>รวมรายการปฏิบัติงานเวรทั้งสิ้น: </span>
                        <strong className="text-emerald-800 font-bold text-sm">{dutyEntries.length} ครั้ง</strong>
                      </div>
                      <div>
                        <span>จำนวนวันที่มีการจัดเวร: </span>
                        <strong className="text-stone-900 font-bold text-sm">
                          {new Set(dutyEntries.map((e) => e.day)).size} วัน (จาก {daysInMonth} วัน)
                        </strong>
                      </div>
                      <div>
                        <span>จำนวนเจ้าหน้าที่ที่ขึ้นเวร: </span>
                        <strong className="text-[#8B1E27] font-bold text-sm">
                          {new Set(dutyEntries.map((e) => e.staff.id)).size} ท่าน
                        </strong>
                      </div>
                    </div>

                    {/* Formal Approval Signatures */}
                    <div
                      className="print-avoid-break mt-6 pt-4 border-t border-stone-400 grid grid-cols-2 gap-8 text-center text-xs"
                      style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                    >
                      <div>
                        <div className="h-8"></div>
                        <p className="border-t border-dotted border-stone-500 pt-1.5 inline-block px-8">
                          ลงชื่อ......................................................ผู้จัดทำรายงาน
                        </p>
                        <p className="text-[11px] text-stone-600 mt-0.5">ตำแหน่ง เจ้าหน้าที่งานเวชศาสตร์บริการโลหิต</p>
                      </div>
                      <div>
                        <div className="h-8"></div>
                        <p className="border-t border-dotted border-stone-500 pt-1.5 inline-block px-8">
                          ลงชื่อ......................................................หัวหน้างานเวชศาสตร์บริการโลหิต
                        </p>
                        <p className="text-[11px] text-stone-800 font-semibold mt-0.5">
                          (ทนพญ.ณิชาภา เจียมจรรยา)
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Visual Divider in Modal UI - NEVER rendered in PDF because it is outside .daily-summary-pdf-page */}
              {!chunk.isLastPage && (
                <div className="no-print my-4 flex items-center justify-center gap-3 text-xs text-stone-400 select-none">
                  <div className="h-px bg-stone-300 flex-1 max-w-[140px]" />
                  <span>จบหน้า {chunk.pageNumber} • ขึ้นหน้า {chunk.pageNumber + 1}</span>
                  <div className="h-px bg-stone-300 flex-1 max-w-[140px]" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
