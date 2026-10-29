import React, { useState, useMemo } from 'react';
import { Staff, ShiftDefinition, MonthlyStaffSummary, RoomType } from '../types';
import { THAI_MONTHS, getDayOfWeekThai } from '../utils/scheduler';
import { exportOtClaimToExcel } from '../utils/exportExcel';
import { FileSpreadsheet, Printer, Clock, FileDown, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

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

export interface StaffOtItem {
  staff: Staff;
  otDates: {
    day: number;
    dayOfWeek: string;
    shiftCode: string;
    timePeriod: string;
    dateLabel: string;
  }[];
}

export interface OtClaimPageChunk {
  pageNumber: number;
  totalPages: number;
  items: StaffOtItem[];
  startIndex: number;
  isFirstPage: boolean;
  isLastPage: boolean;
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

/**
 * Partitions staff OT records into discrete A4 portrait pages to guarantee:
 * 1. Table header columns (thead) repeat at the top of every single page.
 * 2. Rows never get sliced/cut in half across page boundaries.
 * 3. Page 1 accommodates the full document title header.
 * 4. The last page accommodates official hospital signatures.
 * 5. Sequence numbers ("ลำดับ") remain continuous across pages.
 */
export function chunkStaffOtForPdf(items: StaffOtItem[]): OtClaimPageChunk[] {
  if (items.length === 0) {
    return [
      {
        pageNumber: 1,
        totalPages: 1,
        items: [],
        startIndex: 0,
        isFirstPage: true,
        isLastPage: true,
      },
    ];
  }

  // Row height estimation:
  // Base staff row (names, position, borders, padding) ~ 46px
  // Each OT date item in Column 4 adds ~ 23px
  const getStaffRowHeight = (item: StaffOtItem) => {
    const datesCount = Math.max(1, item.otDates.length);
    return Math.max(48, datesCount * 23 + 22);
  };

  const totalSinglePageHeight = items.reduce((sum, item) => sum + getStaffRowHeight(item), 0);
  // Total A4 height is 1120px.
  // Page 1 budget: 1120 - 80 (padding) - 130 (header) - 44 (table head) - 160 (signatures) = ~706px
  if (totalSinglePageHeight <= 700) {
    return [
      {
        pageNumber: 1,
        totalPages: 1,
        items,
        startIndex: 0,
        isFirstPage: true,
        isLastPage: true,
      },
    ];
  }

  // Multi-page chunking
  const pages: StaffOtItem[][] = [];
  const startIndices: number[] = [];
  const remaining = [...items];
  let currentStartIdx = 0;

  while (remaining.length > 0) {
    const isFirst = pages.length === 0;
    // Page 1 has the primary document header, so row capacity is around 820px
    // Subsequent pages have a compact subheader, so row capacity is around 880px
    const pageCapacity = isFirst ? 820 : 880;

    const pageItems: StaffOtItem[] = [];
    let currentHeight = 0;

    while (remaining.length > 0) {
      const nextItem = remaining[0];
      const nextItemHeight = getStaffRowHeight(nextItem);

      // If this is the last of remaining items, reserve 160px for signatures
      const isRemainingLast = remaining.length === 1;
      const signatureReserve = isRemainingLast ? 160 : 0;

      if (pageItems.length > 0 && currentHeight + nextItemHeight + signatureReserve > pageCapacity) {
        break;
      }

      pageItems.push(remaining.shift()!);
      currentHeight += nextItemHeight;
    }

    if (pageItems.length === 0 && remaining.length > 0) {
      pageItems.push(remaining.shift()!);
    }

    pages.push(pageItems);
    startIndices.push(currentStartIdx);
    currentStartIdx += pageItems.length;
  }

  const totalPages = pages.length;

  return pages.map((pageItems, idx) => ({
    pageNumber: idx + 1,
    totalPages,
    items: pageItems,
    startIndex: startIndices[idx],
    isFirstPage: idx === 0,
    isLastPage: idx === totalPages - 1,
  }));
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
  summaries: _summaries,
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

  // Partition into A4-sized pages with repeating headers and no cut rows
  const pageChunks = useMemo(() => {
    return chunkStaffOtForPdf(staffOtList);
  }, [staffOtList]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadExcel = () => {
    exportOtClaimToExcel(year, month, room, staffOtList, monthName, thaiYear);
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const pageElements = document.querySelectorAll<HTMLElement>('.ot-claim-pdf-page');
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

      pdf.save(`ใบสำคัญขออนุมัติเบิกเงิน_OT_${roomName}_${monthName}_${thaiYear}.pdf`);
    } catch (error) {
      console.error('Failed to generate OT Claim PDF:', error);
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
              title="ดาวน์โหลดไฟล์ PDF ขนาด A4 จัดรูปแบบสวยงาม คงหัวตารางทุกหน้า"
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
            {pageChunks.length > 1 && (
              <span className="ml-2 text-stone-500 font-normal">
                (จัดแบ่งพิมพ์ {pageChunks.length} หน้า A4)
              </span>
            )}
          </div>
        </div>

        {/* Printable Paper Document Container - Official A4 format with Repeating Header on every page */}
        <div
          id="ot-claim-printable-content"
          className="p-4 sm:p-6 overflow-y-auto flex-1 bg-stone-100 print:bg-white print:p-0"
        >
          {pageChunks.map((chunk) => (
            <React.Fragment key={`ot-chunk-${chunk.pageNumber}`}>
              <div
                className="ot-claim-pdf-page printable-sheet bg-white text-stone-900 border border-stone-300 shadow-md mx-auto p-8 sm:p-10 mb-6 print:border-none print:shadow-none print:m-0 print:p-6"
                style={{
                  width: '794px',
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
                    className="print-avoid-break text-center pb-2.5 mb-3 border-b-2 border-stone-900"
                    style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                  >
                    <div className="text-xs uppercase tracking-wider font-semibold text-stone-600">
                      โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold font-heading text-stone-950 mt-1">
                      ใบสำคัญขออนุมัติเบิกเงินค่าตอบแทนการปฏิบัติงานนอกเวลาราชการ (OT)
                    </h2>
                    <div className="text-xs sm:text-sm text-stone-800 mt-1.5 flex flex-wrap justify-center items-center gap-2.5">
                      <span>งานเวชศาสตร์บริการโลหิต</span>
                      <span>•</span>
                      <span>
                        ห้องการทำงาน: <strong className="text-stone-950 font-semibold">{roomName}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        ประจำเดือน <strong className="text-stone-950 font-semibold">{monthName} พ.ศ. {thaiYear}</strong>
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
                    className="print-avoid-break pb-2 mb-3 border-b-2 border-stone-700 flex items-center justify-between text-xs"
                    style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                  >
                    <span className="font-semibold text-stone-700">
                      โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ • งานเวชศาสตร์บริการโลหิต
                    </span>
                    <span className="font-bold text-stone-900">
                      ใบสำคัญขออนุมัติเบิกเงินค่าตอบแทน OT (ต่อ) - ประจำเดือน {monthName} พ.ศ. {thaiYear}
                    </span>
                    <span className="font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-xs border border-stone-300">
                      หน้า {chunk.pageNumber} จาก {chunk.totalPages}
                    </span>
                  </div>
                )}

                {/* Formatted Table matching image_e0d8fa80.png:
                    - Table Header (thead) repeats at the top of EVERY SINGLE PAGE
                    - Columns: ลำดับ (6.5%), ชื่อ - สกุล (25%), ตำแหน่ง (11.5%), วันที่ปฏิบัติงาน OT (39%), ลายมือชื่อผู้ขอเบิก (18%)
                    - Clean solid borders and professional layout
                */}
                <div
                  className={`printable-table-container overflow-x-auto border border-stone-800 rounded-xs ${
                    chunk.isLastPage ? 'mb-4' : 'flex-1 mb-2'
                  }`}
                >
                  <table
                    className="printable-table w-full text-xs border-collapse border border-stone-800 bg-white"
                    style={{ tableLayout: 'fixed', width: '100%' }}
                  >
                    <colgroup>
                      <col style={{ width: '6.5%' }} />
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '11.5%' }} />
                      <col style={{ width: '39%' }} />
                      <col style={{ width: '18%' }} />
                    </colgroup>
                    <thead
                      style={{ display: 'table-header-group' }}
                      className="bg-[#E5E7EB] text-stone-950 font-bold border-b border-stone-800"
                    >
                      <tr>
                        <th className="py-2.5 px-2 border border-stone-800 text-center bg-[#E5E7EB] font-bold text-stone-950 text-xs sm:text-sm">
                          ลำดับ
                        </th>
                        <th className="py-2.5 px-3 border border-stone-800 text-left bg-[#E5E7EB] font-bold text-stone-950 text-xs sm:text-sm">
                          ชื่อ - สกุล
                        </th>
                        <th className="py-2.5 px-2 border border-stone-800 text-center bg-[#E5E7EB] font-bold text-stone-950 text-xs sm:text-sm">
                          ตำแหน่ง
                        </th>
                        <th className="py-2.5 px-3 border border-stone-800 text-left bg-[#E5E7EB] font-bold text-stone-950 text-xs sm:text-sm">
                          วันที่ปฏิบัติงาน OT
                        </th>
                        <th className="py-2.5 px-2 border border-stone-800 text-center bg-[#E5E7EB] font-bold text-stone-950 text-xs sm:text-sm">
                          ลายมือชื่อผู้ขอเบิก
                        </th>
                      </tr>
                    </thead>
                    <tbody style={{ display: 'table-row-group' }}>
                      {chunk.items.length > 0 ? (
                        chunk.items.map((item, staffIdx) => (
                          <tr
                            key={item.staff.id}
                            className="border-b border-stone-800 hover:bg-stone-50/50 print:hover:bg-transparent"
                            style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                          >
                            {/* Column 1: ลำดับ (Continuous across pages) */}
                            <td className="p-2.5 border border-stone-800 text-center font-bold text-stone-900 align-top text-xs sm:text-sm">
                              {chunk.startIndex + staffIdx + 1}
                            </td>

                            {/* Column 2: ชื่อ - สกุล */}
                            <td className="p-2.5 border border-stone-800 text-left align-top">
                              <div className="font-bold text-stone-950 text-xs sm:text-sm leading-snug">
                                {item.staff.name}
                              </div>
                              {item.staff.englishName && (
                                <div className="text-[11px] text-stone-500 font-normal italic mt-0.5">
                                  {item.staff.englishName}
                                </div>
                              )}
                            </td>

                            {/* Column 3: ตำแหน่ง (MT badge pill with border) */}
                            <td className="p-2.5 border border-stone-800 text-center align-top">
                              <span className="inline-block px-3 py-0.5 rounded-md text-xs font-medium text-stone-700 bg-stone-100 border border-stone-300">
                                {item.staff.position || 'MT'}
                              </span>
                            </td>

                            {/* Column 4: วันที่ปฏิบัติงาน OT */}
                            <td className="p-0 border border-stone-800 align-top">
                              {item.otDates.length > 0 ? (
                                <div className="divide-y divide-stone-300">
                                  {item.otDates.map((otItem, dateIdx) => (
                                    <div
                                      key={dateIdx}
                                      className="px-3 py-1.5 text-xs text-stone-900 font-normal leading-normal"
                                    >
                                      วันที่ {otItem.day} {monthName} {thaiYear} ({otItem.dayOfWeek}) เวลา {otItem.timePeriod}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="px-3 py-2 text-xs text-stone-400 text-center">-</div>
                              )}
                            </td>

                            {/* Column 5: ลายมือชื่อผู้ขอเบิก (pure blank for signature) */}
                            <td className="p-2.5 border border-stone-800 align-middle text-center bg-white"></td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-stone-500 border border-stone-800">
                            ไม่พบรายการเบิกจ่ายค่าตอบแทน OT สำหรับเงื่อนไขที่เลือก
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Official Signatures on Last Page (No grand total row) */}
                {chunk.isLastPage && (
                  <div
                    className="print-avoid-break mt-auto pt-6 grid grid-cols-2 gap-8 text-center text-xs"
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
                )}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
