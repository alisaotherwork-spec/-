import React, { useState, useRef, useEffect } from 'react';
import { Staff, ShiftDefinition, MonthlyStaffSummary, RoomType, CurrentUser } from '../types';
import { getDayOfWeekThai, isWeekend } from '../utils/scheduler';
import { formatBaht } from '../utils/calculator';
import { Lock, Sparkles, Check, X, ShieldAlert, UserCheck } from 'lucide-react';

interface DutyTableProps {
  year: number;
  month: number;
  daysInMonth: number;
  room: RoomType | 'all';
  staffList: Staff[];
  shiftsMap: Record<string, string>;
  shiftDefs: ShiftDefinition[];
  summaries: MonthlyStaffSummary[];
  currentUser: CurrentUser | null;
  onUpdateShift: (staffId: string, day: number, newCode: string) => void;
  onRunAutoSchedule: () => void;
  onRunAutoScheduleB: () => void;
  onOpenAutoScheduleModal?: () => void;
  activeFilter?: 'active' | 'all' | 'inactive';
  onActiveFilterChange?: (filter: 'active' | 'all' | 'inactive') => void;
}

export const DutyTable: React.FC<DutyTableProps> = ({
  year,
  month,
  daysInMonth,
  room,
  staffList,
  shiftsMap,
  shiftDefs,
  summaries,
  currentUser,
  onUpdateShift,
  onRunAutoSchedule,
  onRunAutoScheduleB,
  onOpenAutoScheduleModal,
  activeFilter = 'active',
  onActiveFilterChange,
}) => {
  const [activeCell, setActiveCell] = useState<{ staffId: string; day: number } | null>(null);
  const [customInput, setCustomInput] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setActiveCell(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sections = [
    {
      id: 'MT',
      title: 'ส่วนที่ 1: นักเทคนิคการแพทย์ (MT) (ลำดับที่ 1 - 14)',
      filter: (s: Staff) => s.section === 'MT',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    {
      id: 'SUPPORT',
      title: 'ส่วนที่ 2: ผู้ช่วยนักเทคนิคการแพทย์ (AMT) / ธุรการ (Office) / พนักงานช่วยงานบริการ (Service)',
      filter: (s: Staff) => s.section === 'SUPPORT',
      badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
    },
    {
      id: 'PART_TIME',
      title: 'ส่วนที่ 3: เจ้าหน้าที่ Part-time (ลำดับที่ 1 - 9)',
      filter: (s: Staff) => s.section === 'PART_TIME',
      badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    },
  ];

  // Check permission for a specific staff member
  const canEditStaffDuty = (targetStaffId: string): boolean => {
    if (!currentUser) return false;
    // Super Admin, Section Head (Nichapa), and Sub Admin can edit everyone
    if (
      currentUser.role === 'super_admin' ||
      currentUser.role === 'head' ||
      currentUser.role === 'sub_admin'
    ) {
      return true;
    }
    // General staff can ONLY edit their own shifts
    return currentUser.staffId === targetStaffId;
  };

  const handleCellClick = (staff: Staff, day: number) => {
    if (!canEditStaffDuty(staff.id)) {
      alert(`คุณเข้าสู่ระบบในชื่อ "${currentUser?.name || 'บุคคลภายนอก'}" คุณสามารถแก้ไขได้เฉพาะเวรของตนเองเท่านั้น`);
      return;
    }
    const currentCode = shiftsMap[`${staff.id}_${day}`] || '';
    setCustomInput(currentCode);
    setActiveCell({ staffId: staff.id, day });
  };

  const handleSelectCode = (code: string) => {
    if (activeCell) {
      onUpdateShift(activeCell.staffId, activeCell.day, code);
      setActiveCell(null);
    }
  };

  // Popular quick shifts for rapid entry
  const quickShiftCodes = ['บด', 'ช', 'บ', 'ด', 'ชบ', 'ชบด', 'OT1', 'OT2', 'OT3', 'OT4'];

  return (
    <div className="w-full relative">
      {/* Scrollable Container with Custom Scrollbars and sticky headers */}
      <div className="overflow-x-auto custom-scrollbar border border-[#D8C7B5] rounded-xl shadow-md bg-[#FFFDF7]">
        <table className="w-full text-xs text-left border-collapse select-none">
          
          {/* Sticky Header: Days of the Month */}
          <thead className="sticky top-0 z-20 bg-[#F5EFE6] text-[#4A2E18] shadow-xs">
            <tr className="border-b border-[#D8C7B5]">
              {/* Sticky Columns for Staff Info */}
              <th className="p-2.5 text-center w-12 sticky left-0 z-30 bg-[#F5EFE6] border-r border-[#D8C7B5] font-bold">
                ลำดับ
              </th>
              <th className="p-2.5 min-w-[200px] sticky left-12 z-30 bg-[#F5EFE6] border-r border-[#D8C7B5] font-bold">
                ชื่อ - สกุล
              </th>
              <th className="p-2.5 text-center w-16 sticky left-[248px] z-30 bg-[#F5EFE6] border-r border-[#D8C7B5] font-bold">
                ตำแหน่ง
              </th>

              {/* Days 1 to N */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                const dayTh = getDayOfWeekThai(year, month, d);
                const weekend = isWeekend(year, month, d);
                return (
                  <th
                    key={d}
                    className={`p-1.5 text-center min-w-[38px] max-w-[42px] border-r border-[#E5D5C5] transition-colors ${
                      weekend ? 'bg-amber-100/90 text-[#8B1E27] font-bold' : ''
                    }`}
                  >
                    <div className="text-sm font-heading font-bold">{d}</div>
                    <div className={`text-[10px] ${weekend ? 'text-red-700 font-semibold' : 'text-stone-500'}`}>
                      {dayTh}
                    </div>
                  </th>
                );
              })}

              {/* Totals Summary Columns */}
              <th className="p-2 text-center w-16 border-r border-[#D8C7B5] font-bold bg-[#EFE7DC] text-[#4A2E18]">
                เวรปกติ
              </th>
              <th className="p-2 text-center w-16 border-r border-[#D8C7B5] font-bold bg-[#E6F4EA] text-emerald-900">
                OT (ชม.)
              </th>
              <th className="p-2 text-right w-24 border-r border-[#D8C7B5] font-bold bg-[#FCE8E6] text-red-950">
                ค่าเวรปกติ
              </th>
              <th className="p-2 text-right w-24 border-r border-[#D8C7B5] font-bold bg-[#E6F4EA] text-emerald-950">
                ค่า OT
              </th>
              <th className="p-2 text-right w-28 font-bold bg-[#8B1E27] text-white">
                รวมเงินทั้งหมด
              </th>
            </tr>
          </thead>

          {/* Table Body divided into 3 distinct sections */}
          <tbody>
            {sections.map((sec) => {
              const members = staffList.filter(sec.filter).sort((a, b) => a.order - b.order);
              if (members.length === 0) return null;

              return (
                <React.Fragment key={sec.id}>
                  {/* Section Divider Header */}
                  <tr className="bg-[#EFE7DC] text-[#4A2E18] font-bold border-y-2 border-[#D8C7B5]">
                    <td
                      colSpan={daysInMonth + 8}
                      className="p-2 px-4 sticky left-0 z-10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${sec.badgeBg}`}>
                            {sec.id}
                          </span>
                          <span className="text-xs sm:text-sm font-heading font-semibold text-[#3E2514]">
                            {sec.title} ({members.length} ท่าน)
                          </span>
                        </div>

                        {sec.id === 'MT' && (currentUser?.role === 'super_admin' || currentUser?.role === 'head' || currentUser?.role === 'sub_admin') && (
                          <div className="flex items-center gap-1.5 no-print">
                            {onOpenAutoScheduleModal && (
                              <button
                                type="button"
                                onClick={onOpenAutoScheduleModal}
                                className="text-xs px-2.5 py-1 bg-[#8B1E27] hover:bg-[#721820] text-white rounded-md flex items-center gap-1.5 transition-transform hover:scale-[1.02] shadow-xs cursor-pointer font-bold ring-1 ring-amber-300"
                                title="จัดเวรอัตโนมัติได้ทุกเวรที่มี โดยสามารถเลือกหลายเวรพร้อมกัน"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                ⚡ จัดเวรอัตโนมัติ (เลือกหลายเวร)
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={onRunAutoSchedule}
                              className="text-xs px-2.5 py-1 bg-white hover:bg-stone-100 text-[#8B1E27] border border-amber-300 rounded-md flex items-center gap-1 transition-colors cursor-pointer font-medium"
                              title="จัดเวร บด อัตโนมัติ วน 1 ถึง 14 วันละ 1 คนตลอดทั้งเดือนตามข้อกำหนด"
                            >
                              จัดเวร บด
                            </button>
                            <button
                              type="button"
                              onClick={onRunAutoScheduleB}
                              className="text-xs px-2.5 py-1 bg-white hover:bg-stone-100 text-[#92400E] border border-amber-300 rounded-md flex items-center gap-1 transition-colors cursor-pointer font-medium"
                              title="จัดเวร บ อัตโนมัติ วน 1 ถึง 14 วันละ 1 คนตลอดทั้งเดือนตามข้อกำหนด"
                            >
                              จัดเวร บ
                            </button>
                            {onActiveFilterChange && (
                              <button
                                type="button"
                                onClick={() => onActiveFilterChange(activeFilter === 'active' ? 'all' : 'active')}
                                className={`text-xs px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer font-medium border ${
                                  activeFilter === 'active'
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                                }`}
                                title="คลิกเพื่อสลับการแสดงเฉพาะ Active หรือ ทั้งหมด"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                                <span>{activeFilter === 'active' ? 'เฉพาะ Active' : 'แสดงทั้งหมด'}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Staff Rows */}
                  {members.map((staff, idx) => {
                    const isEditable = canEditStaffDuty(staff.id);
                    const isCurrentUserRow = currentUser?.staffId === staff.id;
                    const summary = summaries.find((s) => s.staffId === staff.id);

                    return (
                      <tr
                        key={staff.id}
                        className={`border-b border-[#E5D5C5] transition-colors ${
                          isCurrentUserRow
                            ? 'bg-amber-50/80 hover:bg-amber-100/60'
                            : 'hover:bg-[#FAF6F0]'
                        }`}
                      >
                        {/* Column 1: Order */}
                        <td
                          className={`p-2 text-center sticky left-0 z-10 border-r border-[#D8C7B5] font-mono text-[11px] ${
                            isCurrentUserRow ? 'bg-amber-100/90 font-bold text-amber-900' : 'bg-[#FFFDF7] text-stone-600'
                          }`}
                        >
                          {staff.order}
                        </td>

                        {/* Column 2: Name */}
                        <td
                          className={`p-2 sticky left-12 z-10 border-r border-[#D8C7B5] font-medium whitespace-nowrap ${
                            isCurrentUserRow ? 'bg-amber-100/90 text-[#8B1E27] font-bold' : 'bg-[#FFFDF7] text-stone-900'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="flex items-center gap-1.5">
                              <span>{staff.name}</span>
                              {staff.isActive === false && (
                                <span className="text-[10px] px-1 py-0.2 bg-stone-200 text-stone-600 rounded border border-stone-300">
                                  Inactive
                                </span>
                              )}
                            </span>
                            {isCurrentUserRow && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-[#8B1E27] text-white rounded-sm font-semibold shrink-0">
                                คุณ
                              </span>
                            )}
                            {!isEditable && (
                              <span title="ไม่มีสิทธิ์แก้ไขคนนี้">
                                <Lock className="w-3 h-3 text-stone-400 opacity-60 shrink-0" />
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Column 3: Position */}
                        <td
                          className={`p-2 text-center sticky left-[248px] z-10 border-r border-[#D8C7B5] ${
                            isCurrentUserRow ? 'bg-amber-100/90' : 'bg-[#FFFDF7]'
                          }`}
                        >
                          <span className="px-1.5 py-0.5 rounded-sm bg-stone-100 text-stone-700 font-bold text-[10px] border border-stone-200">
                            {staff.position}
                          </span>
                        </td>

                        {/* Days Columns */}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                          const code = shiftsMap[`${staff.id}_${d}`] || '';
                          const weekend = isWeekend(year, month, d);
                          const isActive = activeCell?.staffId === staff.id && activeCell?.day === d;
                          const shiftDef = shiftDefs.find((s) => s.code.toLowerCase() === code.trim().toLowerCase());

                          return (
                            <td
                              key={d}
                              onClick={() => handleCellClick(staff, d)}
                              className={`p-0 text-center border-r border-[#E5D5C5] transition-all relative ${
                                isEditable ? 'cursor-pointer hover:bg-amber-100/50' : 'cursor-not-allowed opacity-90'
                              } ${weekend ? 'bg-amber-50/50' : ''} ${
                                isActive ? 'ring-2 ring-[#8B1E27] z-20 bg-white' : ''
                              }`}
                            >
                              <div className="h-8 flex items-center justify-center font-bold text-xs">
                                {code ? (
                                  <span
                                    className="px-1.5 py-0.5 rounded-sm shadow-2xs font-mono text-[11px] leading-none"
                                    style={{
                                      backgroundColor: shiftDef?.colorBg || (code.startsWith('OT') ? '#DCFCE7' : '#FCE7F3'),
                                      color: shiftDef?.colorText || (code.startsWith('OT') ? '#166534' : '#8B1E27'),
                                      border: `1px solid ${shiftDef?.colorBorder || '#E5D5C5'}`,
                                    }}
                                  >
                                    {code}
                                  </span>
                                ) : (
                                  /* Non-duty slots are 100% empty blanks as requested */
                                  <span className="w-full h-full block" />
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Summary Columns */}
                        <td className="p-2 text-center border-r border-[#D8C7B5] font-semibold bg-[#FAF6F0] text-stone-800">
                          {summary?.regularShiftCount || 0}
                        </td>
                        <td className="p-2 text-center border-r border-[#D8C7B5] font-bold bg-[#F0FDF4] text-emerald-800">
                          {summary?.otHours || 0}
                        </td>
                        <td className="p-2 text-right border-r border-[#D8C7B5] font-medium bg-[#FFF5F5] text-stone-900">
                          {summary?.regularShiftIncome ? formatBaht(summary.regularShiftIncome) : '0'}
                        </td>
                        <td className="p-2 text-right border-r border-[#D8C7B5] font-medium bg-[#F0FDF4] text-emerald-900">
                          {summary?.otIncome ? formatBaht(summary.otIncome) : '0'}
                        </td>
                        <td className="p-2 text-right font-bold bg-[#8B1E27]/5 text-[#8B1E27]">
                          {summary?.totalIncome ? formatBaht(summary.totalIncome) : '0'}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating Inline Shift Selector Popover with Position-Specific Shift Codes */}
      {activeCell && (() => {
        const activeStaff = staffList.find((s) => s.id === activeCell.staffId);
        const staffPos = activeStaff?.position || 'MT';

        // Filter shifts for this popover
        const posSpecificShifts = shiftDefs.filter((s) => {
          const isApplicable =
            !s.applicablePositions ||
            s.applicablePositions.length === 0 ||
            s.applicablePositions.includes(staffPos);
          const hasRate = (s.rates?.[staffPos] || 0) > 0;
          return isApplicable && hasRate;
        });

        const regularShifts = shiftDefs.filter((s) => !s.isOt && !/^OT/i.test(s.code));
        const otShifts = shiftDefs.filter((s) => s.isOt || /^OT/i.test(s.code));

        return (
          <div
            ref={popoverRef}
            className="fixed z-50 p-3.5 paper-card bg-[#FFFDF7] border-2 border-[#8B1E27] shadow-2xl rounded-2xl w-[340px] sm:w-[420px] max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#E5D5C5] mb-2 shrink-0">
              <div>
                <div className="font-heading font-bold text-xs sm:text-sm text-[#4A2E18] flex items-center gap-1.5">
                  <span>กำหนดรหัสเวร: วันที่ {activeCell.day}</span>
                  <span className="px-1.5 py-0.2 rounded-sm bg-[#8B1E27] text-white text-[10px] font-bold">
                    {staffPos}
                  </span>
                </div>
                <div className="text-[11px] text-stone-600 truncate max-w-[280px]">
                  {activeStaff?.name}
                </div>
              </div>
              <button
                onClick={() => setActiveCell(null)}
                className="text-stone-400 hover:text-stone-800 p-1 rounded-md hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Custom Input for Direct Typing */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSelectCode(customInput.trim());
              }}
              className="flex items-center gap-1.5 mb-2.5 shrink-0"
            >
              <input
                type="text"
                maxLength={4}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="พิมพ์รหัสเวรเอง (เช่น ช, บ, ด, บด)"
                className="flex-1 p-1.5 text-xs bg-white border border-[#D8C7B5] rounded-md font-bold text-stone-900 uppercase focus:outline-none focus:ring-1 focus:ring-[#8B1E27]"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#8B1E27] hover:bg-[#721820] text-white text-xs font-semibold rounded-md shadow-2xs cursor-pointer"
              >
                บันทึก
              </button>
            </form>

            {/* Scrollable Shift Codes Palette specifically for this Position */}
            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1 text-xs">
              
              {/* 1. Position-Specific Shifts Section */}
              <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                <div className="font-bold text-[11px] text-amber-950 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#8B1E27]" />
                    <span>รหัสเวรเฉพาะตำแหน่ง {staffPos} ({posSpecificShifts.length} รหัส):</span>
                  </span>
                  <span className="text-[10px] text-stone-500 font-normal">คลิกเพื่อเลือกทันที</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                  {posSpecificShifts.map((s) => {
                    const rate = s.rates?.[staffPos] || 0;
                    return (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => handleSelectCode(s.code)}
                        className={`p-1 rounded-md border text-center transition-all cursor-pointer hover:scale-105 shadow-2xs ${
                          s.isOt
                            ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
                            : 'bg-white hover:bg-amber-100 border-[#D8C7B5] text-[#8B1E27]'
                        }`}
                        title={`${s.name} • อัตราค่าเวร: ${rate.toLocaleString()} บาท`}
                      >
                        <div className="font-mono font-bold text-xs">{s.code}</div>
                        <div className="text-[9px] text-stone-500 truncate">
                          {rate > 0 ? `${rate.toLocaleString()}บ.` : s.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. All OT Shifts (OT1 - OT4) */}
              <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
                <div className="font-bold text-[11px] text-emerald-950 mb-1.5 flex items-center gap-1">
                  <span>เวรล่วงเวลา (OT 1 - 4 ชม.):</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {otShifts.map((s) => {
                    const rate = s.rates?.[staffPos] || 0;
                    return (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => handleSelectCode(s.code)}
                        className="p-1 rounded-md border border-emerald-300 bg-white hover:bg-emerald-100 text-emerald-900 text-center transition-all cursor-pointer hover:scale-105 shadow-2xs"
                        title={`${s.name} • อัตราค่าเวร: ${rate.toLocaleString()} บาท`}
                      >
                        <div className="font-mono font-bold text-xs text-emerald-800">{s.code}</div>
                        <div className="text-[9px] text-emerald-600 truncate">
                          {s.otHours} ชม. ({rate > 0 ? `${rate}บ.` : ''})
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Regular Shift Codes (Grouped) if wanting other codes */}
              {regularShifts.length > posSpecificShifts.length && (
                <div className="p-2 rounded-xl border border-stone-200 bg-stone-50/80">
                  <div className="font-bold text-[11px] text-stone-700 mb-1.5">
                    รหัสเวรปกติทั้งหมดในระบบ ({regularShifts.length} รหัส):
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                    {regularShifts.map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => handleSelectCode(s.code)}
                        className="p-1 rounded-md border border-stone-200 bg-white hover:bg-stone-100 text-stone-800 text-center transition-all cursor-pointer hover:scale-105 shadow-2xs font-mono font-bold text-xs"
                        title={s.name}
                      >
                        {s.code}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Clear Shift Button */}
            <div className="pt-2.5 mt-2 border-t border-[#E5D5C5] shrink-0">
              <button
                type="button"
                onClick={() => handleSelectCode('')}
                className="w-full py-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg font-medium transition-colors cursor-pointer"
              >
                ล้างเวรออก (เป็นช่องว่าง)
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
