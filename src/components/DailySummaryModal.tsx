import React, { useState, useMemo } from 'react';
import { Staff, ShiftDefinition, RoomType } from '../types';
import { THAI_MONTHS, getDayOfWeekThai } from '../utils/scheduler';
import { Calendar, Printer, Filter, Users, ChevronLeft, ChevronRight } from 'lucide-react';

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

// 3 Shift slots as requested: เช้า (ช), บ่าย (บ), ดึก (ด) (บ่าย-ดึก, ล่วงเวลา, รหัสเวร นำออกแล้ว)
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
  // 'ALL' = include all days in month (รวมทุกวันในเดือน), or specific day number (1..daysInMonth)
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'ALL'>('ALL');
  const [sectionFilter, setSectionFilter] = useState<'ALL' | 'MT' | 'SUPPORT' | 'PART_TIME'>('ALL');

  const monthName = THAI_MONTHS[month - 1];

  // Collect on-duty entries: ONLY people who have duty on that day, across all days in the month
  // NOTE: Hook must be called unconditionally before any early return!
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

  if (!isOpen) return null;

  const thaiYear = year + 543;
  const roomName = room === 'lab' ? 'ห้องปฏิบัติการ' : room === 'donation' ? 'ห้องบริจาคโลหิต' : 'รวมทุกห้องการทำงาน';
  const shiftSlots = SHIFT_SLOTS;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="paper-card w-full max-w-5xl my-6 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        
        {/* Header - No print */}
        <div className="bg-[#8B1E27] text-white p-4 sm:p-5 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#A82B35] rounded-lg">
              <Calendar className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg">ใบสรุปเวรประจำวัน (Daily Shift Summary)</h3>
              <p className="text-xs text-amber-100/80">
                ดึงเฉพาะผู้ที่มีเวรในแต่ละวัน รวมทุกวันในเดือน • รพ.ธรรมศาสตร์เฉลิมพระเกียรติ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ / บันทึก PDF (A4)
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Controls Bar - No print */}
        <div className="bg-[#F7F2EA] p-3 sm:p-4 border-b border-[#E5D5C5] flex flex-wrap items-center justify-between gap-3 no-print shrink-0 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Filter by Day (Default: รวมทุกวันในเดือน) */}
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
              <span className="text-stone-800 font-medium">ช่องสีขาว = อยู่เวร</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-4 bg-stone-400 border border-stone-500 rounded-xs" />
              <span className="text-stone-600 font-medium">ช่องสีเทา = ไม่อยู่เวร</span>
            </div>
          </div>
        </div>

        {/* Printable Paper Document Container */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-white text-black print:p-0">
          
          {/* Official Document Header */}
          <div className="text-center pb-4 mb-4 border-b-2 border-stone-800">
            <div className="text-xs uppercase tracking-wider font-semibold text-stone-600">
              โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-heading text-stone-900 mt-1">
              ใบสรุปการปฏิบัติงานเวรประจำวัน งานเวชศาสตร์บริการโลหิต
            </h2>
            <div className="text-xs sm:text-sm text-stone-700 mt-1 flex flex-wrap justify-center gap-3">
              <span>ห้องการทำงาน: <strong className="text-stone-900">{roomName}</strong></span>
              <span>•</span>
              <span>
                ประจำเดือน: <strong className="text-stone-900">{monthName} พ.ศ. {thaiYear}</strong>
              </span>
              <span>•</span>
              <span className="text-emerald-800 font-semibold">
                (แสดงเฉพาะผู้ที่มีเวรปฏิบัติงาน รวม {dutyEntries.length} รายการ)
              </span>
            </div>
          </div>

          {/* Table displaying ONLY staff on duty for each day, including all days in the month */}
          <div className="overflow-x-auto border border-stone-800 rounded-sm">
            <table className="w-full text-xs border-collapse border border-stone-800">
              <thead style={{ display: 'table-header-group' }} className="bg-stone-100 text-stone-900 font-bold border-b-2 border-stone-800">
                <tr>
                  {/* Column 1: วันที่ เดือน */}
                  <th className="p-2 border border-stone-400 text-center w-28 whitespace-nowrap bg-stone-200">
                    วันที่ เดือน
                  </th>
                  <th className="p-2 border border-stone-400 text-center w-12">ลำดับ</th>
                  <th className="p-2 border border-stone-400 text-left min-w-[200px]">ชื่อ - นามสกุล</th>
                  <th className="p-2 border border-stone-400 text-center w-16">ตำแหน่ง</th>
                  {shiftSlots.map((slot) => (
                    <th key={slot.id} className="p-2 border border-stone-400 text-center w-24">
                      {slot.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dutyEntries.length > 0 ? (
                  dutyEntries.map((entry, idx) => {
                    const isNewDay = idx === 0 || dutyEntries[idx - 1].day !== entry.day;

                    return (
                      <tr
                        key={`${entry.staff.id}_${entry.day}_${idx}`}
                        className={`border-b border-stone-300 hover:bg-stone-50 ${
                          isNewDay && idx !== 0 ? 'border-t-2 border-stone-400' : ''
                        }`}
                      >
                        {/* Column 1: วันที่ เดือน */}
                        <td className="p-2 text-center border border-stone-300 font-bold text-stone-900 whitespace-nowrap bg-stone-50">
                          {entry.dateText} ({entry.dayOfWeek})
                        </td>
                        <td className="p-2 text-center border border-stone-300 text-stone-700">
                          {entry.indexInDay}
                        </td>
                        <td className="p-2 font-medium border border-stone-300 text-stone-900">
                          {entry.staff.name}
                        </td>
                        <td className="p-2 text-center border border-stone-300 text-stone-600 font-semibold">
                          {entry.staff.position}
                        </td>

                        {/* Duty / No-duty columns filled 100% full solid color without symbols */}
                        {shiftSlots.map((slot) => {
                          const matchesSlot = slot.match(entry.code);
                          return (
                            <td
                              key={slot.id}
                              className={`p-0 border border-stone-400 text-center align-middle h-9 ${
                                matchesSlot ? 'bg-white' : 'bg-stone-400'
                              }`}
                              title={matchesSlot ? `มีเวร (${slot.label})` : 'ไม่มีเวร'}
                            >
                              <div
                                className={`w-full h-full min-h-[36px] flex items-center justify-center ${
                                  matchesSlot ? 'bg-white' : 'bg-stone-400'
                                }`}
                              >
                                {/* Pure solid color block: white for on-duty, gray for off */}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-500">
                      ไม่พบข้อมูลผู้มีเวรปฏิบัติงานตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Monthly Shift Statistics Footer Box */}
          <div className="mt-6 p-3 bg-stone-50 border border-stone-300 rounded-sm text-xs flex flex-wrap items-center justify-between gap-4">
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

          {/* Signatures */}
          <div className="mt-8 pt-6 border-t border-stone-300 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="h-10"></div>
              <p className="border-t border-dotted border-stone-400 pt-2 inline-block px-8">
                ลงชื่อ......................................................ผู้จัดเวร
              </p>
            </div>
            <div>
              <div className="h-10"></div>
              <p className="border-t border-dotted border-stone-400 pt-2 inline-block px-8">
                ลงชื่อ......................................................หัวหน้างานเวชศาสตร์บริการโลหิต
              </p>
              <p className="text-[11px] text-stone-600 mt-1">(ทนพญ.ณิชาภา เจียมจรรยา)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
