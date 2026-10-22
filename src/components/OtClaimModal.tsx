import React, { useState } from 'react';
import { Staff, ShiftDefinition, MonthlyStaffSummary, RoomType } from '../types';
import { THAI_MONTHS } from '../utils/scheduler';
import { exportOtClaimToExcel } from '../utils/exportExcel';
import { formatBaht } from '../utils/calculator';
import { FileSpreadsheet, Printer, Download, Clock, DollarSign, Users, Filter } from 'lucide-react';

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

  if (!isOpen) return null;

  const thaiYear = year + 543;
  const monthName = THAI_MONTHS[month - 1];
  const roomName = room === 'lab' ? 'ห้องปฏิบัติการ' : room === 'donation' ? 'ห้องบริจาคโลหิต' : 'รวมทุกห้องการทำงาน';

  // Filter summaries based on toggles
  const filteredSummaries = summaries.filter((item) => {
    if (onlyWithOt && item.otCount === 0) return false;
    if (sectionFilter !== 'ALL' && item.staff.section !== sectionFilter) return false;
    return true;
  });

  const totalOtHours = filteredSummaries.reduce((sum, s) => sum + s.otHours, 0);
  const totalOtAmount = filteredSummaries.reduce((sum, s) => sum + s.otIncome, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadExcel = () => {
    exportOtClaimToExcel(year, month, room, summaries, shiftsMap, daysInMonth, shiftDefs);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="paper-card w-full max-w-5xl my-6 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        
        {/* Header - No print */}
        <div className="bg-[#8B1E27] text-white p-4 sm:p-5 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#A82B35] rounded-lg">
              <Clock className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg">
                ใบเบิกเงินค่าตอบแทน OT (แยกจากเวรปกติ)
              </h3>
              <p className="text-xs text-amber-100/80">
                งานเวชศาสตร์บริการโลหิต โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadExcel}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              ดาวน์โหลด Excel (.xlsx)
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ / บันทึก PDF (A4 แนวตั้ง)
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Action & Filter Bar - No print */}
        <div className="bg-[#F7F2EA] p-3 sm:p-4 border-b border-[#E5D5C5] flex flex-wrap items-center justify-between gap-3 no-print shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-[#4A2E18] cursor-pointer">
              <input
                type="checkbox"
                checked={onlyWithOt}
                onChange={(e) => setOnlyWithOt(e.target.checked)}
                className="rounded text-[#8B1E27] focus:ring-[#8B1E27] h-4 w-4"
              />
              <span>แสดงเฉพาะเจ้าหน้าที่ที่มี OT ({summaries.filter(s => s.otCount > 0).length} คน)</span>
            </label>

            <div className="flex items-center gap-1 text-xs">
              <span className="text-stone-600 font-medium">กลุ่ม:</span>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value as any)}
                className="bg-white border border-[#D8C7B5] rounded-md px-2 py-1 text-xs text-stone-800"
              >
                <option value="ALL">ทั้งหมด</option>
                <option value="MT">นักเทคนิคการแพทย์ (MT)</option>
                <option value="SUPPORT">สายสนับสนุน (AMT/Office/Service)</option>
                <option value="PART_TIME">Part-time</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-stone-700 bg-white px-3 py-1.5 rounded-lg border border-[#D8C7B5]">
            <span>รวม OT: <strong className="text-emerald-700">{totalOtHours} ชั่วโมง</strong></span>
            <span>รวมเงิน: <strong className="text-red-700">{formatBaht(totalOtAmount)} บาท</strong></span>
          </div>
        </div>

        {/* Printable Sheet View - A4 Portrait with table-header-group */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-black print:p-0">
          
          {/* Printable Page Header */}
          <div className="text-center pb-4 mb-4 border-b-2 border-stone-800">
            <div className="text-xs uppercase tracking-wider text-stone-600">โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ</div>
            <h2 className="text-lg sm:text-xl font-bold font-heading text-stone-900 mt-1">
              ใบสำคัญขออนุมัติเบิกเงินค่าตอบแทนการปฏิบัติงานนอกเวลาราชการ (OT)
            </h2>
            <div className="text-xs sm:text-sm text-stone-700 mt-1 flex flex-wrap justify-center gap-3">
              <span>งานเวชศาสตร์บริการโลหิต</span>
              <span>•</span>
              <span>ห้องการทำงาน: <strong>{roomName}</strong></span>
              <span>•</span>
              <span>ประจำเดือน <strong>{monthName} พ.ศ. {thaiYear}</strong></span>
            </div>
          </div>

          {/* Persistent Table Header across print pages */}
          <table className="w-full text-xs border-collapse border border-stone-800">
            <thead style={{ display: 'table-header-group' }} className="bg-stone-100 text-stone-900 font-bold border-b-2 border-stone-800">
              <tr>
                <th className="p-2 border border-stone-400 text-center w-10">ลำดับ</th>
                <th className="p-2 border border-stone-400 text-left min-w-[150px]">ชื่อ - สกุล</th>
                <th className="p-2 border border-stone-400 text-center w-16">ตำแหน่ง</th>
                <th className="p-2 border border-stone-400 text-center w-28">วันที่ปฏิบัติงาน OT</th>
                <th className="p-2 border border-stone-400 text-center w-14">จำนวนครั้ง</th>
                <th className="p-2 border border-stone-400 text-center w-16">ชั่วโมง OT</th>
                <th className="p-2 border border-stone-400 text-right w-24">รวมเป็นเงิน (บาท)</th>
                <th className="p-2 border border-stone-400 text-center w-28">ลายมือชื่อผู้ขอเบิก</th>
              </tr>
            </thead>
            <tbody>
              {filteredSummaries.length > 0 ? (
                filteredSummaries.map((item, idx) => {
                  // Find all OT dates
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

                  return (
                    <tr key={item.staffId} className="border-b border-stone-300 hover:bg-stone-50 print:hover:bg-transparent">
                      <td className="p-2 border border-stone-300 text-center">{idx + 1}</td>
                      <td className="p-2 border border-stone-300 font-medium text-stone-900">{item.staff.name}</td>
                      <td className="p-2 border border-stone-300 text-center text-stone-600">{item.staff.position}</td>
                      <td className="p-2 border border-stone-300 text-center text-stone-700">
                        {otDates.join(', ') || '-'}
                      </td>
                      <td className="p-2 border border-stone-300 text-center">{item.otCount}</td>
                      <td className="p-2 border border-stone-300 text-center font-semibold text-emerald-800">
                        {item.otHours}
                      </td>
                      <td className="p-2 border border-stone-300 text-right font-bold text-stone-900">
                        {formatBaht(item.otIncome)}
                      </td>
                      <td className="p-2 border border-stone-300 text-center text-stone-400">
                        .........................
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-stone-500 border border-stone-300">
                    ไม่พบรายการเบิกจ่ายค่าตอบแทน OT สำหรับเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}

              {/* Grand Total Row */}
              <tr className="bg-stone-100 font-bold text-stone-900 border-t-2 border-stone-800">
                <td colSpan={4} className="p-2 border border-stone-400 text-center">
                  รวมยอดเบิกจ่ายทั้งสิ้น ({filteredSummaries.length} คน)
                </td>
                <td className="p-2 border border-stone-400 text-center">
                  {filteredSummaries.reduce((sum, s) => sum + s.otCount, 0)}
                </td>
                <td className="p-2 border border-stone-400 text-center text-emerald-800">
                  {totalOtHours} ชม.
                </td>
                <td className="p-2 border border-stone-400 text-right text-red-800">
                  {formatBaht(totalOtAmount)}
                </td>
                <td className="p-2 border border-stone-400 text-center">-</td>
              </tr>
            </tbody>
          </table>

          {/* Rate reference footer */}
          <div className="mt-4 text-[11px] text-stone-600 leading-relaxed border-b border-stone-200 pb-3">
            <strong>หมายเหตุอัตราค่าตอบแทน OT:</strong> นักเทคนิคการแพทย์ (MT) ชม.ละ 175 บาท (OT1=175, OT2=350, OT3=525, OT4=700) | 
            ผู้ช่วยนักเทคนิคการแพทย์ (AMT) และธุรการ (Office) ชม.ละ 80 บาท (OT1=80, OT2=160, OT3=240, OT4=320) | 
            พนักงานช่วยงานบริการ (Service) ชม.ละ 55 บาท (OT1=55, OT2=110, OT3=165, OT4=220)
          </div>

          {/* Approval Signatures */}
          <div className="mt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="h-10"></div>
              <p className="border-t border-dotted border-stone-400 pt-2 inline-block px-8">
                ลงชื่อ......................................................ผู้ตรวจสอบและรวบรวม
              </p>
              <p className="text-[11px] text-stone-500 mt-1">ตำแหน่ง เจ้าหน้าที่งานเวชศาสตร์บริการโลหิต</p>
            </div>
            <div>
              <div className="h-10"></div>
              <p className="border-t border-dotted border-stone-400 pt-2 inline-block px-8">
                ลงชื่อ......................................................หัวหน้างานเวชศาสตร์บริการโลหิต
              </p>
              <p className="text-[11px] text-stone-500 mt-1">(ทนพญ.ณิชาภา เจียมจรรยา)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
