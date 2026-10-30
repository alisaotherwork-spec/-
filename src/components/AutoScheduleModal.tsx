import React, { useState, useEffect, useMemo } from 'react';
import { Staff, ShiftDefinition, RoomType } from '../types';
import { THAI_MONTHS, getDayOfWeekThai } from '../utils/scheduler';
import {
  Sparkles,
  Check,
  CheckSquare,
  Square,
  Layers,
  Users,
  Building2,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  RotateCcw,
  ListOrdered,
  Calendar,
  UserCheck,
  CheckCheck,
  ArrowUpDown,
  GripVertical,
} from 'lucide-react';

interface AutoScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  daysInMonth: number;
  room: RoomType | 'all';
  staffList: Staff[];
  shiftDefs: ShiftDefinition[];
  onApplyAutoSchedule: (config: {
    selectedShifts: string[];
    targetSection: 'ALL' | 'MT' | 'SUPPORT' | 'PART_TIME';
    targetRoom: RoomType | 'all';
    startStaffOrder: number;
    staggerMultipleShifts: boolean;
    overwriteExisting: boolean;
    customStaffOrderIds?: string[];
  }) => void;
}

export const AutoScheduleModal: React.FC<AutoScheduleModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
  daysInMonth,
  room,
  staffList,
  shiftDefs,
  onApplyAutoSchedule,
}) => {
  // Shifts selected for auto scheduling (default: ['บด'])
  const [selectedShifts, setSelectedShifts] = useState<string[]>(['บด']);
  const [targetSection, setTargetSection] = useState<'ALL' | 'MT' | 'SUPPORT' | 'PART_TIME'>('MT');
  const [targetRoom, setTargetRoom] = useState<RoomType | 'all'>(room);
  const [staggerMultipleShifts, setStaggerMultipleShifts] = useState<boolean>(true);
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);

  // Rotation Order Mode: 'system' (order 1..N) or 'custom' (user custom re-ordered)
  const [orderMode, setOrderMode] = useState<'system' | 'custom'>('custom');

  // Custom ordered list of staff IDs for the rotation
  const [customOrderIds, setCustomOrderIds] = useState<string[]>([]);
  // Which staff IDs are active/included in this auto-schedule run
  const [includedStaffIds, setIncludedStaffIds] = useState<string[]>([]);

  // Starting staff ID for Day 1
  const [startStaffId, setStartStaffId] = useState<string>('');

  // Drag and Drop
  const [draggedStaffId, setDraggedStaffId] = useState<string | null>(null);
  const [dragOverStaffId, setDragOverStaffId] = useState<string | null>(null);

  // Filter base eligible staff according to section and room
  const baseEligibleStaff = useMemo(() => {
    return staffList
      .filter((s) => {
        if (!s.isActive) return false;
        if (targetSection !== 'ALL' && s.section !== targetSection) return false;
        if (targetRoom !== 'all') {
          if (s.defaultRoom && s.defaultRoom !== 'both' && s.defaultRoom !== targetRoom) return false;
        }
        return true;
      })
      .sort((a, b) => a.order - b.order);
  }, [staffList, targetSection, targetRoom]);

  // Sync custom order whenever base eligible staff change
  useEffect(() => {
    const defaultIds = baseEligibleStaff.map((s) => s.id);
    setCustomOrderIds(defaultIds);
    setIncludedStaffIds(defaultIds);
    if (defaultIds.length > 0) {
      setStartStaffId(defaultIds[0]);
    } else {
      setStartStaffId('');
    }
  }, [baseEligibleStaff]);

  // The active sequence of staff participating in the rotation in exact user order
  const activeRotatingStaff = useMemo(() => {
    const idMap = new Map(baseEligibleStaff.map((s) => [s.id, s]));
    const sourceIds = orderMode === 'custom' ? customOrderIds : baseEligibleStaff.map((s) => s.id);

    return sourceIds
      .filter((id) => includedStaffIds.includes(id))
      .map((id) => idMap.get(id))
      .filter((s): s is Staff => s !== undefined);
  }, [baseEligibleStaff, customOrderIds, includedStaffIds, orderMode]);

  const monthName = THAI_MONTHS[month - 1];
  const thaiYear = year + 543;

  // Toggle shift code
  const toggleShift = (code: string) => {
    setSelectedShifts((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Quick Presets
  const setPreset = (
    preset: 'bd' | 'b' | 'three' | 'ot' | 'all' | 'clear' | 'mt' | 'amt' | 'office' | 'service'
  ) => {
    switch (preset) {
      case 'bd':
        setSelectedShifts(['บด']);
        break;
      case 'b':
        setSelectedShifts(['บ']);
        break;
      case 'three':
        setSelectedShifts(['ช', 'บ', 'ด']);
        break;
      case 'ot':
        setSelectedShifts(shiftDefs.filter((s) => s.isOt || /^OT/i.test(s.code)).map((s) => s.code));
        break;
      case 'mt':
        setSelectedShifts(
          shiftDefs
            .filter(
              (s) =>
                (s.rates?.MT || 0) > 0 &&
                (!s.applicablePositions || s.applicablePositions.includes('MT'))
            )
            .map((s) => s.code)
        );
        break;
      case 'amt':
        setSelectedShifts(
          shiftDefs
            .filter(
              (s) =>
                (s.rates?.AMT || 0) > 0 &&
                (!s.applicablePositions || s.applicablePositions.includes('AMT'))
            )
            .map((s) => s.code)
        );
        break;
      case 'office':
        setSelectedShifts(
          shiftDefs
            .filter(
              (s) =>
                (s.rates?.Office || 0) > 0 &&
                (!s.applicablePositions || s.applicablePositions.includes('Office'))
            )
            .map((s) => s.code)
        );
        break;
      case 'service':
        setSelectedShifts(
          shiftDefs
            .filter(
              (s) =>
                (s.rates?.Service || 0) > 0 &&
                (!s.applicablePositions || s.applicablePositions.includes('Service'))
            )
            .map((s) => s.code)
        );
        break;
      case 'all':
        setSelectedShifts(shiftDefs.map((s) => s.code));
        break;
      case 'clear':
        setSelectedShifts([]);
        break;
    }
  };

  // Staff Reordering Handlers
  const handleMoveStaff = (staffId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    const list = [...customOrderIds];
    const idx = list.indexOf(staffId);
    if (idx === -1) return;

    if (direction === 'up' && idx > 0) {
      const temp = list[idx - 1];
      list[idx - 1] = list[idx];
      list[idx] = temp;
    } else if (direction === 'down' && idx < list.length - 1) {
      const temp = list[idx + 1];
      list[idx + 1] = list[idx];
      list[idx] = temp;
    } else if (direction === 'top') {
      list.splice(idx, 1);
      list.unshift(staffId);
    } else if (direction === 'bottom') {
      list.splice(idx, 1);
      list.push(staffId);
    }

    setCustomOrderIds(list);
  };

  const handleToggleIncludeStaff = (staffId: string) => {
    setIncludedStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  const handleSelectAllStaff = () => {
    setIncludedStaffIds(baseEligibleStaff.map((s) => s.id));
  };

  const handleDeselectAllStaff = () => {
    setIncludedStaffIds([]);
  };

  const handleResetToSystemOrder = () => {
    const defaultIds = baseEligibleStaff.map((s) => s.id);
    setCustomOrderIds(defaultIds);
    setIncludedStaffIds(defaultIds);
    if (defaultIds.length > 0) {
      setStartStaffId(defaultIds[0]);
    }
  };

  const handleReverseOrder = () => {
    setCustomOrderIds((prev) => [...prev].reverse());
  };

  // Compute 0-based start index of startStaffId within activeRotatingStaff
  const computedStartIndex = useMemo(() => {
    const idx = activeRotatingStaff.findIndex((s) => s.id === startStaffId);
    return idx >= 0 ? idx : 0;
  }, [activeRotatingStaff, startStaffId]);

  // Total shifts to assign
  const totalShiftsToAssign = selectedShifts.length * daysInMonth;

  // Live simulation preview for first 7 days
  const previewSimulation = useMemo(() => {
    if (activeRotatingStaff.length === 0 || selectedShifts.length === 0) return [];
    const count = activeRotatingStaff.length;
    const daysToShow = Math.min(7, daysInMonth);
    const previewList = [];

    for (let day = 1; day <= daysToShow; day++) {
      const dayName = getDayOfWeekThai(year, month, day);
      const assignments = selectedShifts.map((shiftCode, shiftIdx) => {
        const offset = staggerMultipleShifts
          ? shiftIdx * Math.max(1, Math.floor(count / selectedShifts.length))
          : 0;
        const staffIndex = (computedStartIndex + (day - 1) + offset) % count;
        const staff = activeRotatingStaff[staffIndex];
        return {
          shiftCode,
          staffName: staff?.name || '?',
          staffOrder: staff?.order,
          rotationRank: staffIndex + 1,
        };
      });

      previewList.push({
        day,
        dayName,
        assignments,
      });
    }

    return previewList;
  }, [activeRotatingStaff, selectedShifts, computedStartIndex, staggerMultipleShifts, daysInMonth, year, month]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedShifts.length === 0) {
      alert('กรุณาเลือกเวรที่ต้องการจัดอัตโนมัติอย่างน้อย 1 เวร');
      return;
    }

    if (activeRotatingStaff.length === 0) {
      alert('กรุณาเลือกเจ้าหน้าที่อย่างน้อย 1 ท่านสำหรับหมุนเวร');
      return;
    }

    // Custom staff IDs sequence
    const finalOrderedIds = activeRotatingStaff.map((s) => s.id);

    onApplyAutoSchedule({
      selectedShifts,
      targetSection,
      targetRoom,
      startStaffOrder: computedStartIndex, // 0-based starting index in the sequence
      staggerMultipleShifts,
      overwriteExisting,
      customStaffOrderIds: finalOrderedIds,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="paper-card w-full max-w-4xl my-6 overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 shadow-2xl border-2 border-[#D4AF37]/50">
        {/* Header */}
        <div className="bg-[#8B1E27] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#A82B35] rounded-xl shadow-xs">
              <Sparkles className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg sm:text-xl tracking-tight">
                ระบบจัดเวรอัตโนมัติ (Auto-Scheduling)
              </h3>
              <p className="text-xs text-amber-100/90 font-medium">
                ประจำเดือน {monthName} พ.ศ. {thaiYear} • เลือกลำดับเจ้าหน้าที่และหมุนเวียนเวรได้อย่างอิสระ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-base"
            title="ปิดหน้าต่าง"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm bg-[#FFFDF9]">
          
          {/* Step 1: Choose Shifts */}
          <div className="p-4 bg-[#FBF7F0] border border-[#E5D5C5] rounded-2xl shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-[#4A2E18] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#8B1E27] text-white text-[11px] font-bold flex items-center justify-center">
                  1
                </span>
                <span className="text-sm font-semibold">เลือกเวรที่ต้องการจัดอัตโนมัติ (เลือกได้หลายเวร)</span>
                <span className="text-xs bg-[#8B1E27] text-white px-2.5 py-0.5 rounded-full font-bold shadow-2xs">
                  เลือกแล้ว {selectedShifts.length} เวร
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPreset('bd')}
                  className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg font-bold text-stone-800 cursor-pointer shadow-2xs"
                >
                  บด
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('b')}
                  className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg font-bold text-stone-800 cursor-pointer shadow-2xs"
                >
                  บ
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('three')}
                  className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg font-medium text-stone-700 cursor-pointer shadow-2xs"
                >
                  ช, บ, ด
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('mt')}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[#8B1E27] border border-amber-300 rounded-lg font-bold cursor-pointer shadow-2xs"
                  title="เลือกทุกรหัสเวรสำหรับตำแหน่ง MT"
                >
                  เวร MT
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('amt')}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-lg font-bold cursor-pointer shadow-2xs"
                  title="เลือกทุกรหัสเวรสำหรับตำแหน่ง AMT"
                >
                  เวร AMT
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('office')}
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-lg font-bold cursor-pointer shadow-2xs"
                  title="เลือกทุกรหัสเวรสำหรับตำแหน่ง Office"
                >
                  เวร Office
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('service')}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-bold cursor-pointer shadow-2xs"
                  title="เลือกทุกรหัสเวรสำหรับตำแหน่ง Service"
                >
                  เวร Service
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('ot')}
                  className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg font-bold text-stone-800 cursor-pointer shadow-2xs"
                >
                  เวร OT
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('all')}
                  className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg font-medium text-stone-700 cursor-pointer shadow-2xs"
                >
                  ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('clear')}
                  className="px-2.5 py-1 bg-white hover:bg-red-50 border border-stone-300 text-red-600 rounded-lg font-medium cursor-pointer shadow-2xs"
                >
                  ล้างค่า
                </button>
              </div>
            </div>

            {/* Shift Pills Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1 max-h-40 overflow-y-auto pr-1">
              {shiftDefs.map((def) => {
                const isChecked = selectedShifts.includes(def.code);
                return (
                  <button
                    key={def.code}
                    type="button"
                    onClick={() => toggleShift(def.code)}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isChecked
                        ? 'border-[#8B1E27] bg-[#8B1E27]/10 ring-1 ring-[#8B1E27] shadow-xs'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="px-2 py-0.5 rounded-md text-xs font-bold shrink-0 border shadow-2xs"
                        style={{
                          backgroundColor: def.colorBg || '#FEF3C7',
                          color: def.colorText || '#92400E',
                          borderColor: def.colorBorder || '#FDE68A',
                        }}
                      >
                        {def.code}
                      </span>
                      <span className="text-xs truncate font-medium text-stone-800">{def.name}</span>
                    </div>
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-[#8B1E27] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-300 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Target Staff Group & Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Section */}
            <div className="p-3.5 bg-white border border-[#E5D5C5] rounded-2xl shadow-xs space-y-2">
              <label className="font-bold text-[#4A2E18] flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#8B1E27] text-white text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <span className="font-semibold text-xs sm:text-sm">กลุ่มเจ้าหน้าที่เป้าหมาย</span>
              </label>
              <select
                value={targetSection}
                onChange={(e) => setTargetSection(e.target.value as any)}
                className="w-full p-2.5 border border-stone-300 rounded-xl bg-stone-50 text-stone-800 font-medium focus:ring-2 focus:ring-[#8B1E27] focus:outline-none"
              >
                <option value="MT">ส่วนที่ 1: นักเทคนิคการแพทย์ (MT)</option>
                <option value="SUPPORT">ส่วนที่ 2: สายสนับสนุน (AMT / Office / Service)</option>
                <option value="PART_TIME">ส่วนที่ 3: เจ้าหน้าที่ Part-time</option>
                <option value="ALL">เจ้าหน้าที่ทั้งหมดในระบบ</option>
              </select>
              <p className="text-[11px] text-stone-500">
                เข้าเกณฑ์ในกลุ่มนี้: <strong className="text-stone-800">{baseEligibleStaff.length} ท่าน</strong>
              </p>
            </div>

            {/* Target Room */}
            <div className="p-3.5 bg-white border border-[#E5D5C5] rounded-2xl shadow-xs space-y-2">
              <label className="font-bold text-[#4A2E18] flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#8B1E27]" />
                <span className="font-semibold text-xs sm:text-sm">ห้องการทำงานที่จัดเวร</span>
              </label>
              <select
                value={targetRoom}
                onChange={(e) => setTargetRoom(e.target.value as any)}
                className="w-full p-2.5 border border-stone-300 rounded-xl bg-stone-50 text-stone-800 font-medium focus:ring-2 focus:ring-[#8B1E27] focus:outline-none"
              >
                <option value="all">รวมทุกห้องการทำงาน</option>
                <option value="lab">เฉพาะห้องปฏิบัติการ (Lab)</option>
                <option value="donation">เฉพาะห้องบริจาคโลหิต (Donation)</option>
              </select>
              <p className="text-[11px] text-stone-500">
                {targetRoom === 'all'
                  ? 'จัดเวรให้เจ้าหน้าที่ทุกคนที่อยู่ในกลุ่ม'
                  : `จัดเฉพาะผู้ที่ปฏิบัติงานห้อง ${targetRoom === 'lab' ? 'ห้องปฏิบัติการ' : 'ห้องบริจาคโลหิต'}`}
              </p>
            </div>
          </div>

          {/* Step 3: STAFF ROTATION ORDER SELECTION (Core Feature) */}
          <div className="p-4 bg-white border-2 border-amber-300/80 rounded-2xl shadow-sm space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
              <div>
                <div className="font-bold text-[#4A2E18] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#8B1E27] text-white text-[11px] font-bold flex items-center justify-center">
                    3
                  </span>
                  <ListOrdered className="w-4 h-4 text-[#8B1E27]" />
                  <span className="text-sm font-bold text-[#4A2E18]">
                    การเลือกลำดับเจ้าหน้าที่ในการใส่เวรอัตโนมัติ (Staff Rotation Order)
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5 ml-7">
                  เลือกลำดับก่อน-หลัง กำหนดว่าใครจะได้รับเวรก่อน และสามารถสลับลำดับได้อย่างอิสระ
                </p>
              </div>

              {/* Order Mode Switch */}
              <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-300 text-xs">
                <button
                  type="button"
                  onClick={() => setOrderMode('custom')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    orderMode === 'custom'
                      ? 'bg-[#8B1E27] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  สลับลำดับอิสระ (Custom)
                </button>
                <button
                  type="button"
                  onClick={() => setOrderMode('system')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    orderMode === 'system'
                      ? 'bg-[#8B1E27] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  ตามลำดับในระบบ (1..N)
                </button>
              </div>
            </div>

            {/* Quick Helper Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-amber-50/50 p-2.5 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2 font-medium text-[#4A2E18]">
                <span>เจ้าหน้าที่ร่วมหมุนเวร:</span>
                <strong className="text-[#8B1E27] font-bold text-sm">
                  {activeRotatingStaff.length} จาก {baseEligibleStaff.length} ท่าน
                </strong>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllStaff}
                  className="px-2.5 py-1 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded-lg font-medium cursor-pointer"
                >
                  เลือกทุกคน
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllStaff}
                  className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-700 border border-stone-300 rounded-lg font-medium cursor-pointer"
                >
                  ล้างการเลือก
                </button>
                <button
                  type="button"
                  onClick={handleReverseOrder}
                  className="px-2.5 py-1 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded-lg font-medium flex items-center gap-1 cursor-pointer"
                  title="สลับลำดับย้อนหลังจากหลังมาหน้า"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-600" />
                  <span>สลับย้อนกลับ</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToSystemOrder}
                  className="px-2.5 py-1 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded-lg font-medium flex items-center gap-1 cursor-pointer"
                  title="รีเซ็ตกลับเป็นลำดับ 1..N ตามระบบเดิม"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
                  <span>รีเซ็ตลำดับเดิม</span>
                </button>
              </div>
            </div>

            {/* Staff Sequence List Table */}
            <div className="border border-stone-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto bg-white shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#F5EFE6] text-[#4A2E18] font-bold border-b border-stone-200 sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="p-2 text-center w-12">เลือก</th>
                    <th className="p-2 text-center w-24 bg-amber-100/70 border-x border-amber-200 text-[#8B1E27]">
                      ลำดับหมุนเวร
                    </th>
                    <th className="p-2">ชื่อ - สกุล</th>
                    <th className="p-2 text-center w-20">ตำแหน่ง</th>
                    <th className="p-2 text-center w-24">ห้องปฏิบัติงาน</th>
                    <th className="p-2 text-center w-28">สลับลำดับ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {customOrderIds.map((staffId, rankIdx) => {
                    const staff = baseEligibleStaff.find((s) => s.id === staffId);
                    if (!staff) return null;

                    const isIncluded = includedStaffIds.includes(staff.id);
                    const isFirst = rankIdx === 0;
                    const isLast = rankIdx === customOrderIds.length - 1;
                    const isStartStaff = staff.id === startStaffId;

                    return (
                      <tr
                        key={staff.id}
                        draggable
                        onDragStart={() => setDraggedStaffId(staff.id)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggedStaffId && draggedStaffId !== staff.id) {
                            setDragOverStaffId(staff.id);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverStaffId === staff.id) setDragOverStaffId(null);
                        }}
                        onDrop={() => {
                          if (!draggedStaffId || draggedStaffId === staff.id) return;
                          const list = [...customOrderIds];
                          const fromIdx = list.indexOf(draggedStaffId);
                          const toIdx = list.indexOf(staff.id);
                          if (fromIdx !== -1 && toIdx !== -1) {
                            list.splice(fromIdx, 1);
                            list.splice(toIdx, 0, draggedStaffId);
                            setCustomOrderIds(list);
                          }
                          setDraggedStaffId(null);
                          setDragOverStaffId(null);
                        }}
                        className={`transition-colors ${
                          !isIncluded
                            ? 'bg-stone-50 opacity-50'
                            : isStartStaff
                            ? 'bg-amber-50/80 font-medium'
                            : 'hover:bg-amber-50/30'
                        } ${dragOverStaffId === staff.id ? 'border-t-2 border-[#8B1E27]' : ''}`}
                      >
                        {/* Checkbox to include/exclude */}
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={isIncluded}
                            onChange={() => handleToggleIncludeStaff(staff.id)}
                            className="w-4 h-4 rounded text-[#8B1E27] focus:ring-[#8B1E27] cursor-pointer"
                          />
                        </td>

                        {/* Rotation Rank Badge */}
                        <td className="p-2 text-center font-bold font-mono border-x border-amber-100 bg-amber-50/30">
                          {isIncluded ? (
                            <span className="inline-flex items-center justify-center w-7 h-6 rounded-md bg-[#8B1E27] text-white text-xs shadow-2xs">
                              #{rankIdx + 1}
                            </span>
                          ) : (
                            <span className="text-stone-400">-</span>
                          )}
                        </td>

                        {/* Name */}
                        <td className="p-2">
                          <div className="flex items-center gap-1.5">
                            <GripVertical className="w-3.5 h-3.5 text-stone-300 cursor-grab shrink-0" />
                            <div>
                              <span className="font-semibold text-stone-900">{staff.name}</span>
                              {staff.englishName && (
                                <span className="text-[11px] text-stone-400 block italic">
                                  {staff.englishName}
                                </span>
                              )}
                            </div>
                            {isStartStaff && isIncluded && (
                              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold border border-amber-300 shrink-0">
                                ⭐ เริ่มวันที่ 1
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Position Badge */}
                        <td className="p-2 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-bold text-[11px] border border-stone-200">
                            {staff.position}
                          </span>
                        </td>

                        {/* Room */}
                        <td className="p-2 text-center text-[11px] text-stone-600">
                          {staff.defaultRoom === 'donation'
                            ? 'ห้องบริจาค'
                            : staff.defaultRoom === 'both'
                            ? 'ทั้ง 2 ห้อง'
                            : 'ห้อง Lab'}
                        </td>

                        {/* Reorder Buttons */}
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => handleMoveStaff(staff.id, 'up')}
                              className="p-1 rounded hover:bg-stone-200 disabled:opacity-30 cursor-pointer text-stone-700"
                              title="เลื่อนขึ้น 1 ลำดับ"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => handleMoveStaff(staff.id, 'down')}
                              className="p-1 rounded hover:bg-stone-200 disabled:opacity-30 cursor-pointer text-stone-700"
                              title="เลื่อนลง 1 ลำดับ"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => handleMoveStaff(staff.id, 'top')}
                              className="p-1 rounded hover:bg-stone-200 disabled:opacity-30 cursor-pointer text-stone-700"
                              title="ย้ายไปบนสุด"
                            >
                              <ChevronsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => handleMoveStaff(staff.id, 'bottom')}
                              className="p-1 rounded hover:bg-stone-200 disabled:opacity-30 cursor-pointer text-stone-700"
                              title="ย้ายไปล่างสุด"
                            >
                              <ChevronsDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Step 4: Starting Staff for Day 1 & Rotation Options */}
          <div className="p-4 bg-white border border-[#E5D5C5] rounded-2xl shadow-xs space-y-4">
            <div className="font-bold text-[#4A2E18] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#8B1E27] text-white text-[11px] font-bold flex items-center justify-center">
                4
              </span>
              <span className="text-sm font-bold text-[#4A2E18]">
                กำหนดผู้เริ่มต้นและเงื่อนไขการหมุนเวร
              </span>
            </div>

            {/* Select Starting Staff for Day 1 */}
            <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-xl space-y-2">
              <label className="font-bold text-[#4A2E18] flex items-center gap-2 text-xs sm:text-sm">
                <Calendar className="w-4 h-4 text-[#8B1E27]" />
                <span>เลือกลำดับ / เจ้าหน้าที่เริ่มต้นสำหรับวันที่ 1 (Start Staff on Day 1):</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="sm:col-span-2">
                  <select
                    value={startStaffId}
                    onChange={(e) => setStartStaffId(e.target.value)}
                    className="w-full p-2.5 bg-white border-2 border-amber-400 rounded-xl font-bold text-stone-900 focus:ring-2 focus:ring-[#8B1E27] focus:outline-none shadow-2xs"
                  >
                    {activeRotatingStaff.map((staff, idx) => (
                      <option key={staff.id} value={staff.id}>
                        ลำดับการหมุน #{idx + 1}: {staff.name} ({staff.position})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-stone-600 bg-white p-2.5 rounded-xl border border-stone-200">
                  <span>ผู้รับเวรวันที่ 1: </span>
                  <strong className="text-[#8B1E27] block font-bold truncate">
                    {activeRotatingStaff.find((s) => s.id === startStaffId)?.name || 'กรุณาเลือกเจ้าหน้าที่'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Rotation Checkbox Rules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={staggerMultipleShifts}
                  onChange={(e) => setStaggerMultipleShifts(e.target.checked)}
                  className="mt-0.5 rounded text-[#8B1E27] focus:ring-[#8B1E27] h-4 w-4 shrink-0"
                />
                <div>
                  <span className="font-bold text-stone-900 block text-xs">
                    กระจายคนละคนเมื่อเลือกหลายเวร (Smart Staggering)
                  </span>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    ป้องกันคนเดียวรับหลายเวรในวันเดียวกัน โดยเว้นผลัดเวรอย่างสมดุล
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="mt-0.5 rounded text-[#8B1E27] focus:ring-[#8B1E27] h-4 w-4 shrink-0"
                />
                <div>
                  <span className="font-bold text-stone-900 block text-xs">
                    {overwriteExisting ? 'เขียนทับเวรเดิมทั้งหมด' : 'คงเวรเดิมไว้ (เติมเฉพาะวันที่ยังว่าง)'}
                  </span>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {overwriteExisting
                      ? 'ล้างและสร้างตารางเวรชุดใหม่ตามลำดับที่เลือก'
                      : 'รักษาเวรที่เคยกรอกหรือขอไว้ก่อนหน้า'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Step 5: Live Simulation Preview */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#4A2E18] text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>ตัวอย่างการหมุนเวร 7 วันแรก ตามลำดับที่เลือก (Live Preview):</span>
              </span>
              <span className="text-[11px] text-stone-500">
                วนรอบ {activeRotatingStaff.length} ท่าน ตลอดทั้งเดือน ({daysInMonth} วัน)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1">
              {previewSimulation.map((p) => (
                <div
                  key={p.day}
                  className="p-2 rounded-xl bg-white border border-stone-200 text-center shadow-2xs space-y-1"
                >
                  <div className="text-[11px] font-bold text-stone-700 bg-stone-100 rounded py-0.5">
                    วันที่ {p.day} ({p.dayName})
                  </div>
                  {p.assignments.map((assign, aIdx) => (
                    <div key={aIdx} className="text-left pt-0.5">
                      <div className="flex items-center gap-1">
                        <span className="px-1 py-0.2 bg-[#8B1E27] text-white text-[10px] font-bold rounded">
                          {assign.shiftCode}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          #{assign.rotationRank}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-stone-900 truncate mt-0.5">
                        {assign.staffName}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Summary Bar */}
          <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl text-xs text-[#5D381E] flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div>
              <p className="font-bold text-amber-950 text-sm">สรุปการจัดเวรอัตโนมัติ:</p>
              <p className="mt-0.5">
                จัด <strong>{selectedShifts.length} เวร</strong> ({selectedShifts.join(', ') || '-'}) ให้แก่{' '}
                <strong>{activeRotatingStaff.length} ท่าน</strong> ตามลำดับที่เลือก เริ่มต้นวันที่ 1 ด้วย{' '}
                <strong>
                  {activeRotatingStaff.find((s) => s.id === startStaffId)?.name || 'คนแรก'}
                </strong>
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-[#8B1E27]">{totalShiftsToAssign}</span>
              <span className="block text-[10px] text-stone-500 font-semibold">ผลัดเวรทั้งหมดในเดือนนี้</span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer font-medium text-xs sm:text-sm"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={selectedShifts.length === 0 || activeRotatingStaff.length === 0}
              className="px-6 py-2.5 bg-[#8B1E27] hover:bg-[#721820] text-white font-bold rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>ดำเนินการจัดเวรตามลำดับที่เลือก</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
