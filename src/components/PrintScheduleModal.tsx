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
  shiftDefs,
  summaries,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  if (!isOpen) return null;

  const thaiYear = year + 543;
  const monthName = THAI_MONTHS[month - 1];
  const roomName = room === 'lab' ? 'ห้องปฏิบัติการ' : room === 'donation' ? 'ห้องบริจาคโลหิต' : 'รวมทุกห้องการทำงาน';

  const sections = [
    { title: 'ส่วนที่ 1: นักเทคนิคการแพทย์ (MT)', filter: (s: Staff) => s.section === 'MT' },
    { title: 'ส่วนที่ 2: ผู้ช่วยนักเทคนิคการแพทย์ (AMT) / ธุรการ (Office) / พนักงานช่วยงานบริการ (Service)', filter: (s: Staff) => s.section === 'SUPPORT' },
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
        scale: 2,
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

      // Standard A4 landscape dimensions: 297mm x 210mm
      pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
      pdf.save(`ตารางเวรปฏิบัติงาน_${roomName}_${monthName}_${thaiYear}.pdf`);
    } catch (error) {
      console.error('Failed to generate schedule PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="printable-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="paper-card printable-modal-card w-full max-w-[98vw] my-4 overflow-hidden flex flex-col max-h-[96vh] animate-in fade-in">
        
        {/* Modal Top Bar - No print */}
        <div className="bg-[#8B1E27] text-white p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2 no-print shrink-0">
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
              ดาวน์โหลด Excel
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-600 disabled:bg-stone-500 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="ดาวน์โหลดไฟล์ PDF ตารางเวร A4 แนวนอน"
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
              พิมพ์เอกสาร
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas - Styled for A4 Landscape */}
        <div className="p-4 sm:p-6 overflow-x-auto overflow-y-auto flex-1 bg-stone-100 print:bg-white print:p-0">
          <div
            id="print-schedule-canvas"
            className="printable-sheet bg-white text-black p-6 mx-auto shadow-md border border-stone-300 print:shadow-none print:border-none print:p-0"
            style={{
              width: '1120px',
              minHeight: '792px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
            }}
          >
            {/* Header */}
            <div className="text-center pb-2 mb-3 border-b-2 border-stone-800">
              <div className="text-[11px] uppercase tracking-wider text-stone-600">
                โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
              </div>
              <h2 className="text-base sm:text-lg font-bold font-heading text-stone-900">
                ตารางเวรปฏิบัติงาน งานเวชศาสตร์บริการโลหิต ({roomName})
              </h2>
              <div className="text-xs text-stone-700">
                ประจำเดือน <strong>{monthName} พ.ศ. {thaiYear}</strong> (จำนวนวัน {daysInMonth} วัน)
              </div>
            </div>

            {/* Matrix Table */}
            <table className="w-full text-[9px] sm:text-[10px] border-collapse border border-stone-800">
              <thead style={{ display: 'table-header-group' }} className="bg-stone-100 text-stone-900 border-b border-stone-800">
                <tr>
                  <th className="p-1 border border-stone-400 text-center w-6">#</th>
                  <th className="p-1 border border-stone-400 text-left min-w-[130px]">ชื่อ - สกุล</th>
                  <th className="p-1 border border-stone-400 text-center w-10">ตำแหน่ง</th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                    const dayTh = getDayOfWeekThai(year, month, d);
                    const weekend = isWeekend(year, month, d);
                    return (
                      <th
                        key={d}
                        className={`p-0.5 border border-stone-400 text-center w-5 ${
                          weekend ? 'bg-amber-100 text-red-900 font-bold' : ''
                        }`}
                      >
                        <div>{d}</div>
                        <div className="text-[8px] opacity-80">{dayTh}</div>
                      </th>
                    );
                  })}
                  <th className="p-1 border border-stone-400 text-center w-8">เวร</th>
                  <th className="p-1 border border-stone-400 text-center w-8">OT</th>
                  <th className="p-1 border border-stone-400 text-right w-14">รวมเงิน</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((sec, secIdx) => {
                  const members = staffList.filter(sec.filter).sort((a, b) => a.order - b.order);
                  if (members.length === 0) return null;

                  return (
                    <React.Fragment key={secIdx}>
                      <tr className="bg-stone-200 text-stone-900 font-bold">
                        <td colSpan={daysInMonth + 6} className="p-1 px-2 border border-stone-400 text-xs">
                          {sec.title}
                        </td>
                      </tr>
                      {members.map((staff, idx) => {
                        const summary = summaries.find((s) => s.staffId === staff.id);
                        return (
                          <tr key={staff.id} className="border-b border-stone-300 hover:bg-stone-50">
                            <td className="p-0.5 border border-stone-300 text-center">{idx + 1}</td>
                            <td className="p-0.5 px-1 border border-stone-300 font-medium whitespace-nowrap">
                              {staff.name}
                            </td>
                            <td className="p-0.5 border border-stone-300 text-center text-stone-600">
                              {staff.position}
                            </td>
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                              const code = shiftsMap[`${staff.id}_${d}`] || '';
                              const weekend = isWeekend(year, month, d);
                              return (
                                <td
                                  key={d}
                                  className={`p-0.5 border border-stone-300 text-center font-bold ${
                                    code ? 'bg-white text-stone-900' : weekend ? 'bg-stone-50' : ''
                                  }`}
                                >
                                  {code}
                                </td>
                              );
                            })}
                            <td className="p-0.5 border border-stone-300 text-center font-semibold">
                              {summary?.regularShiftCount || 0}
                            </td>
                            <td className="p-0.5 border border-stone-300 text-center font-semibold text-emerald-800">
                              {summary?.otHours || 0}
                            </td>
                            <td className="p-0.5 border border-stone-300 text-right font-bold text-red-900">
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

            {/* Footer Signatures - 2 Columns (ผู้จัดเวร & หัวหน้างานเวชศาสตร์บริการโลหิต, เอาผู้อนุมัติออก) */}
            <div className="mt-8 pt-4 border-t border-stone-300 grid grid-cols-2 gap-12 text-center text-xs">
              <div>
                <div className="h-8"></div>
                <p className="border-t border-dotted border-stone-500 pt-1.5 inline-block px-8 font-medium">
                  ลงชื่อ......................................................ผู้จัดเวร
                </p>
                <p className="text-[11px] text-stone-600 mt-0.5">ตำแหน่ง เจ้าหน้าที่งานเวชศาสตร์บริการโลหิต</p>
              </div>
              <div>
                <div className="h-8"></div>
                <p className="border-t border-dotted border-stone-500 pt-1.5 inline-block px-8 font-medium">
                  ลงชื่อ......................................................หัวหน้างานเวชศาสตร์บริการโลหิต
                </p>
                <p className="text-[11px] text-stone-800 font-semibold mt-0.5">
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
