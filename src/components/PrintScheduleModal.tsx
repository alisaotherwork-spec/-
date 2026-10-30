import React, { useState } from 'react';
import { Staff, ShiftDefinition, MonthlyStaffSummary, RoomType } from '../types';
import { THAI_MONTHS, getDayOfWeekThai, isWeekend } from '../utils/scheduler';
import { exportDutyScheduleToExcel } from '../utils/exportExcel';
import { Printer, FileSpreadsheet, FileDown, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

interface PrintScheduleModalProps {
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

export const PrintScheduleModal: React.FC<PrintScheduleModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
  daysInMonth,
  room,
  staffList,
  shiftsMap,
  shiftDefs: _shiftDefs,
  summaries,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const thaiYear = year + 543;
  const monthName = THAI_MONTHS[month - 1];
  const roomName =
    room === 'lab'
      ? 'ห้องปฏิบัติการ'
      : room === 'donation'
      ? 'ห้องบริจาคโลหิต'
      : 'รวมทุกห้องการทำงาน';

  const sections = [
    { title: 'ส่วนที่ 1: นักเทคนิคการแพทย์ (MT)', filter: (s: Staff) => s.section === 'MT' },
    {
      title:
        'ส่วนที่ 2: ผู้ช่วยนักเทคนิคการแพทย์ (AMT) / ธุรการ (Office) / พนักงานช่วยงานบริการ (Service)',
      filter: (s: Staff) => s.section === 'SUPPORT',
    },
    { title: 'ส่วนที่ 3: เจ้าหน้าที่ Part-time', filter: (s: Staff) => s.section === 'PART_TIME' },
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleExcel = () => {
    exportDutyScheduleToExcel(year, month, room, staffList, daysInMonth, shiftsMap, summaries);
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const element = document.getElementById('print-schedule-canvas');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 297;
      const pageHeight = 210;
      const canvasRatio = canvas.height / canvas.width;
      const imgHeight = Math.min(pageHeight, pageWidth * canvasRatio);

      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, imgHeight, undefined, 'FAST');
      pdf.save(`ตารางเวรปฏิบัติงาน_${roomName}_${monthName}_${thaiYear}.pdf`);
    } catch (error) {
      console.error('Failed to generate schedule PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="printable-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <style>{`
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 6mm 8mm 6mm 8mm !important;
          }
        }
      `}</style>
      <div className="paper-card printable-modal-card w-full max-w-[98vw] my-4 overflow-hidden flex flex-col max-h-[96vh] animate-in fade-in">
        {/* Modal Top Bar - No print */}
        <div className="bg-[#8B1E27] text-white p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2 no-print shrink-0 shadow-md">
          <div>
            <h3 className="font-heading font-semibold text-base sm:text-lg">
              พิมพ์ตารางเวร (A4 แนวนอน / Landscape PDF)
            </h3>
            <p className="text-xs text-amber-100/80">
              {roomName} • {monthName} พ.ศ. {thaiYear}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExcel}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ดาวน์โหลด Excel</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-600 disabled:bg-stone-500 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="ดาวน์โหลดไฟล์ PDF ตารางเวร A4 แนวนอนตามแบบฟอร์มทางการ"
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
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสาร</span>
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas - Styled exactly matching image_f0869d4e.png */}
        <div className="p-4 sm:p-6 overflow-x-auto overflow-y-auto flex-1 bg-stone-100 print:bg-white print:p-0">
          <div
            id="print-schedule-canvas"
            className="printable-sheet bg-white text-black mx-auto shadow-md border border-stone-300 print:shadow-none print:border-none print:p-0"
            style={{
              width: '1120px',
              minHeight: '792px',
              padding: '24px 28px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
            }}
          >
            {/* Header section matching reference */}
            <div className="text-center pb-1">
              <div className="text-[11px] text-stone-600 font-medium tracking-wide">
                โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
              </div>
              <h2 className="text-lg font-bold font-heading text-stone-900 mt-0.5 tracking-tight">
                ตารางเวรปฏิบัติงาน งานเวชศาสตร์บริการโลหิต ({roomName})
              </h2>
              <div className="text-[11px] text-stone-700 font-medium mt-0.5">
                ประจำเดือน {monthName} พ.ศ. {thaiYear} (จำนวนวัน {daysInMonth} วัน)
              </div>
            </div>

            {/* Solid Horizontal Line spanning full width */}
            <div className="border-b-2 border-stone-900 w-full mt-2 mb-2.5" />

            {/* Matrix Table with Exact 5-part layout & weekend highlights */}
            <table
              className="w-full text-stone-900 border-collapse border border-stone-800"
              style={{ tableLayout: 'fixed' }}
            >
              <colgroup>
                {/* Column 1: # */}
                <col style={{ width: '24px' }} />
                {/* Column 2: ชื่อ - สกุล */}
                <col style={{ width: '165px' }} />
                {/* Column 3: ตำแหน่ง */}
                <col style={{ width: '46px' }} />
                {/* Day columns 1 to N */}
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <col key={i} />
                ))}
                {/* Summary columns: เวร, OT, รวมเงิน */}
                <col style={{ width: '28px' }} />
                <col style={{ width: '28px' }} />
                <col style={{ width: '56px' }} />
              </colgroup>

              <thead
                style={{ display: 'table-header-group' }}
                className="bg-white text-stone-900 border-b border-stone-800"
              >
                <tr>
                  <th className="p-0.5 py-1 border border-stone-400 text-center text-[10px] font-bold text-stone-900">
                    #
                  </th>
                  <th className="p-0.5 py-1 px-2 border border-stone-400 text-left text-[10px] font-bold text-stone-900">
                    ชื่อ - สกุล
                  </th>
                  <th className="p-0.5 py-1 border border-stone-400 text-center text-[10px] font-bold text-stone-900">
                    ตำแหน่ง
                  </th>

                  {/* Days 1 to N Header with Weekend Coloring */}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                    const dayTh = getDayOfWeekThai(year, month, d);
                    const weekend = isWeekend(year, month, d);
                    return (
                      <th
                        key={d}
                        className={`p-0.5 border border-stone-400 text-center ${
                          weekend ? 'bg-[#FCD34D]' : 'bg-white'
                        }`}
                      >
                        <div
                          className={`text-[9.5px] leading-tight ${
                            weekend ? 'text-[#78350F] font-bold' : 'text-stone-800 font-bold'
                          }`}
                        >
                          {d}
                        </div>
                        <div
                          className={`text-[8px] leading-tight ${
                            weekend ? 'text-[#78350F] font-bold' : 'text-stone-600'
                          }`}
                        >
                          {dayTh}
                        </div>
                      </th>
                    );
                  })}

                  <th className="p-0.5 py-1 border border-stone-400 text-center text-[10px] font-bold text-stone-900">
                    เวร
                  </th>
                  <th className="p-0.5 py-1 border border-stone-400 text-center text-[10px] font-bold text-stone-900">
                    OT
                  </th>
                  <th className="p-0.5 py-1 border border-stone-400 text-center text-[10px] font-bold text-stone-900">
                    รวมเงิน
                  </th>
                </tr>
              </thead>

              <tbody>
                {sections.map((sec, secIdx) => {
                  const members = staffList.filter(sec.filter).sort((a, b) => a.order - b.order);
                  if (members.length === 0) return null;

                  return (
                    <React.Fragment key={secIdx}>
                      {/* Section Header Row */}
                      <tr className="bg-[#F3F4F6] text-stone-900 font-bold">
                        <td
                          colSpan={daysInMonth + 6}
                          className="py-1 px-2.5 border border-stone-400 text-[10.5px] font-bold text-stone-950"
                        >
                          {sec.title}
                        </td>
                      </tr>

                      {/* Staff Data Rows */}
                      {members.map((staff, idx) => {
                        const summary = summaries.find((s) => s.staffId === staff.id);
                        return (
                          <tr
                            key={staff.id}
                            className="border-b border-stone-300 hover:bg-stone-50/50 print:hover:bg-transparent"
                            style={{ height: '24px' }}
                          >
                            {/* Sequence number restarting at 1 for each section */}
                            <td className="p-0.5 border border-stone-300 text-center text-[10px] text-stone-800 font-normal">
                              {idx + 1}
                            </td>

                            {/* Staff Name */}
                            <td className="p-0.5 px-2 border border-stone-300 text-[10.5px] font-normal text-stone-900 whitespace-nowrap">
                              {staff.name}
                            </td>

                            {/* Position Badge */}
                            <td className="p-0.5 border border-stone-300 text-center">
                              <span className="inline-block px-1.5 py-0.2 rounded border border-stone-300 text-stone-600 text-[8.5px] font-medium bg-stone-50/60">
                                {staff.position}
                              </span>
                            </td>

                            {/* Day cells 1 to N */}
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                              const code = shiftsMap[`${staff.id}_${d}`] || '';
                              const weekend = isWeekend(year, month, d);
                              return (
                                <td
                                  key={d}
                                  className={`p-0 border border-stone-300 text-center align-middle ${
                                    weekend ? 'bg-[#FEEBB0]' : 'bg-white'
                                  }`}
                                >
                                  {code ? (
                                    <span className="font-bold text-[9.5px] text-stone-900 leading-none">
                                      {code}
                                    </span>
                                  ) : (
                                    <span className="w-full h-full block" />
                                  )}
                                </td>
                              );
                            })}

                            {/* Summary Columns */}
                            <td className="p-0.5 border border-stone-300 text-center text-[10px] text-stone-800 font-normal">
                              {summary?.regularShiftCount || 0}
                            </td>
                            <td className="p-0.5 border border-stone-300 text-center text-[10px] text-stone-800 font-normal">
                              {summary?.otHours || 0}
                            </td>
                            <td className="p-0.5 pr-1.5 border border-stone-300 text-right text-[10px] font-bold text-stone-900">
                              {summary?.totalIncome ? summary.totalIncome.toLocaleString() : '0'}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Divider line above signatures */}
            <div className="border-b border-stone-300 w-full mt-6 mb-6" />

            {/* Official Signatures matching image_f0869d4e.png */}
            <div className="mt-auto grid grid-cols-2 gap-20 text-center text-xs px-10">
              <div className="space-y-1">
                <div className="border-t border-dotted border-stone-400 w-full mb-3" />
                <p className="text-[11px] text-stone-800 whitespace-nowrap font-normal">
                  ลงชื่อ....................................................................................................ผู้จัดเวร
                </p>
                <p className="text-[10.5px] text-stone-600 mt-0.5">
                  ตำแหน่ง เจ้าหน้าที่งานเวชศาสตร์บริการโลหิต
                </p>
              </div>

              <div className="space-y-1">
                <div className="border-t border-dotted border-stone-400 w-full mb-3" />
                <p className="text-[11px] text-stone-800 whitespace-nowrap font-normal">
                  ลงชื่อ....................................................................................................หัวหน้างานเวชศาสตร์บริการโลหิต
                </p>
                <p className="text-[10.5px] text-stone-800 font-semibold mt-0.5">
                  (ทนพญ.ณิชาภา เจียมจรรยา)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
