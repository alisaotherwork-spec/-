import React, { useState } from 'react';
import { Staff, ShiftDefinition, RoomType } from '../types';
import { THAI_MONTHS } from '../utils/scheduler';
import { Sparkles, Check, CheckSquare, Square, Layers, Users, Building2, HelpCircle } from 'lucide-react';

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
  const [startStaffOrder, setStartStaffOrder] = useState<number>(1);
  const [staggerMultipleShifts, setStaggerMultipleShifts] = useState<boolean>(true);
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);

  if (!isOpen) return null;

  const monthName = THAI_MONTHS[month - 1];
  const thaiYear = year + 543;

  // Toggle shift code
  const toggleShift = (code: string) => {
    setSelectedShifts((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Quick Presets
  const setPreset = (preset: 'bd' | 'b' | 'three' | 'ot' | 'all' | 'clear' | 'mt' | 'amt' | 'office' | 'service') => {
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

  const eligibleStaff = staffList.filter((s) => {
    if (!s.isActive) return false;
    if (targetSection !== 'ALL' && s.section !== targetSection) return false;
    if (targetRoom !== 'all') {
      if (s.defaultRoom && s.defaultRoom !== 'both' && s.defaultRoom !== targetRoom) return false;
    }
    return true;
  });

  const totalShiftsToAssign = selectedShifts.length * daysInMonth;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedShifts.length === 0) {
      alert('กรุณาเลือกเวรที่ต้องการจัดอัตโนมัติอย่างน้อย 1 เวร');
      return;
    }

    onApplyAutoSchedule({
      selectedShifts,
      targetSection,
      targetRoom,
      startStaffOrder: Math.max(1, startStaffOrder) - 1, // convert to 0-based index
      staggerMultipleShifts,
      overwriteExisting,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="paper-card w-full max-w-2xl my-6 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-[#8B1E27] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#A82B35] rounded-lg">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg">
                ระบบจัดเวรอัตโนมัติ (เลือกได้ทุกเวร / หลายเวรพร้อมกัน)
              </h3>
              <p className="text-xs text-amber-100/80">
                ประจำเดือน {monthName} พ.ศ. {thaiYear} • หมุนเวียนกระจายเวรอย่างเป็นธรรม
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          
          {/* Section 1: Choose Shifts (Multi-select) */}
          <div className="p-4 bg-[#FBF7F0] border border-[#E5D5C5] rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-[#4A2E18] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#8B1E27]" />
                <span>1. เลือกเวรที่ต้องการจัดอัตโนมัติ (เลือกได้หลายเวร)</span>
                <span className="text-xs bg-[#8B1E27] text-white px-2 py-0.5 rounded-full font-semibold">
                  เลือกแล้ว {selectedShifts.length} เวร
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setPreset('bd')}
                  className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-md font-medium text-stone-700 cursor-pointer"
                >
                  บด
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('b')}
                  className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-md font-medium text-stone-700 cursor-pointer"
                >
                  บ
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('mt')}
                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-[#8B1E27] border border-amber-300 rounded-md font-semibold cursor-pointer"
                  title="เลือกทุกรหัสเวรสำหรับตำแหน่ง MT"
                >
                  เวร MT
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('amt')}
                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-md font-semibold cursor-pointer"
                  title="เลือกทุกรหัสเวรสำหรับตำแหน่ง AMT"
                >
                  เวร AMT
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('office')}
                  className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-md font-semibold cursor-pointer"
                  title="เลือกทุกรหัสเวรสำหรับตำแหน่ง Office"
                >
                  เวร Office
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('service')}
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-md font-semibold cursor-pointer"
                  title="เลือกทุกรหัสเวรสำหรับตำแหน่ง Service"
                >
                  เวร Service
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('ot')}
                  className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-md font-medium text-stone-700 cursor-pointer"
                >
                  เวร OT
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('all')}
                  className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-md font-medium text-stone-700 cursor-pointer"
                >
                  ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('clear')}
                  className="px-2 py-1 bg-white hover:bg-red-50 border border-stone-300 text-red-600 rounded-md font-medium cursor-pointer"
                >
                  ล้างค่า
                </button>
              </div>
            </div>

            {/* Shift Pills Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1 max-h-48 overflow-y-auto">
              {shiftDefs.map((def) => {
                const isChecked = selectedShifts.includes(def.code);
                return (
                  <button
                    key={def.code}
                    type="button"
                    onClick={() => toggleShift(def.code)}
                    className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isChecked
                        ? 'border-[#8B1E27] bg-[#8B1E27]/10 ring-1 ring-[#8B1E27] shadow-xs'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-bold shrink-0 border"
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

          {/* Section 2: Target Staff Group & Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Target Section */}
            <div className="p-3 bg-white border border-[#E5D5C5] rounded-xl space-y-2">
              <label className="font-bold text-[#4A2E18] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#8B1E27]" />
                <span>2. กลุ่มเจ้าหน้าที่เป้าหมาย</span>
              </label>
              <select
                value={targetSection}
                onChange={(e) => setTargetSection(e.target.value as any)}
                className="w-full p-2 border border-stone-300 rounded-lg bg-stone-50 text-stone-800"
              >
                <option value="MT">ส่วนที่ 1: นักเทคนิคการแพทย์ (MT) ลำดับ 1 - 14</option>
                <option value="SUPPORT">ส่วนที่ 2: สายสนับสนุน (AMT / Office / Service)</option>
                <option value="PART_TIME">ส่วนที่ 3: เจ้าหน้าที่ Part-time</option>
                <option value="ALL">เจ้าหน้าที่ทั้งหมดในระบบ</option>
              </select>
              <p className="text-[11px] text-stone-500">
                เข้าเกณฑ์ปัจจุบัน: <strong className="text-stone-800">{eligibleStaff.length} ท่าน</strong>
              </p>
            </div>

            {/* Target Room */}
            <div className="p-3 bg-white border border-[#E5D5C5] rounded-xl space-y-2">
              <label className="font-bold text-[#4A2E18] flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#8B1E27]" />
                <span>3. ห้องการทำงานที่จัดเวร</span>
              </label>
              <select
                value={targetRoom}
                onChange={(e) => setTargetRoom(e.target.value as any)}
                className="w-full p-2 border border-stone-300 rounded-lg bg-stone-50 text-stone-800"
              >
                <option value="all">รวมทุกห้องการทำงาน</option>
                <option value="lab">เฉพาะห้องปฏิบัติการ (Lab)</option>
                <option value="donation">เฉพาะห้องบริจาคโลหิต (Donation)</option>
              </select>
              <p className="text-[11px] text-stone-500">
                {targetRoom === 'all'
                  ? 'จัดเวรให้เจ้าหน้าที่ทุกคนที่อยู่ในกลุ่ม'
                  : `จัดเฉพาะผู้ที่สังกัดหรือปฏิบัติงานห้อง ${targetRoom === 'lab' ? 'ห้องปฏิบัติการ' : 'ห้องบริจาคโลหิต'}`}
              </p>
            </div>
          </div>

          {/* Section 3: Rotation Conditions */}
          <div className="p-4 bg-white border border-[#E5D5C5] rounded-xl space-y-3">
            <div className="font-bold text-[#4A2E18] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8B1E27]" />
              <span>4. เงื่อนไขและกฎการหมุนเวียน (Rotation Rules)</span>
            </div>

            <div className="space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={staggerMultipleShifts}
                  onChange={(e) => setStaggerMultipleShifts(e.target.checked)}
                  className="mt-0.5 rounded text-[#8B1E27] focus:ring-[#8B1E27] h-4 w-4"
                />
                <div>
                  <span className="font-semibold text-stone-900">
                    กระจายคนละคนในแต่ละวันเมื่อเลือกหลายเวร (Smart Staggering)
                  </span>
                  <p className="text-[11px] text-stone-500">
                    ป้องกันการจัดเวรซ้ำซ้อนให้คนเดียวกันในวันเดียวกัน โดยหมุนเวียนคนละผลัดเวรอย่างสมดุล
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="mt-0.5 rounded text-[#8B1E27] focus:ring-[#8B1E27] h-4 w-4"
                />
                <div>
                  <span className="font-semibold text-stone-900">
                    {overwriteExisting
                      ? 'ล้างและเขียนทับเวรเดิมทั้งหมดในกลุ่มนี้'
                      : 'คงเวรเดิมไว้ (เติมเฉพาะวันที่ยังไม่มีเวร)'}
                  </span>
                  <p className="text-[11px] text-stone-500">
                    {overwriteExisting
                      ? 'ระบบจะสร้างตารางเวรชุดใหม่ตามเงื่อนไขที่กำหนด'
                      : 'รักษาเวรที่เคยกรอกหรือขอไว้ก่อนหน้า'}
                  </p>
                </div>
              </label>

              <div className="pt-2 flex items-center gap-3">
                <label className="font-medium text-stone-700 whitespace-nowrap">
                  ลำดับเจ้าหน้าที่เริ่มต้นสำหรับวันที่ 1:
                </label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, eligibleStaff.length)}
                  value={startStaffOrder}
                  onChange={(e) => setStartStaffOrder(Number(e.target.value))}
                  className="w-20 p-1.5 border border-stone-300 rounded-md bg-stone-50 text-center font-bold"
                />
                <span className="text-[11px] text-stone-500">
                  (ค่าเริ่มต้นคือ ลำดับที่ 1: ทนพญ.ณิชาภา เจียมจรรยา)
                </span>
              </div>
            </div>
          </div>

          {/* Live Preview Summary Box */}
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-[#5D381E] flex items-center justify-between">
            <div>
              <p className="font-bold text-amber-950">สรุปการจัดเวรอัตโนมัติ:</p>
              <p>
                จัด <strong>{selectedShifts.length} เวร</strong> ({selectedShifts.join(', ') || '-'}) ให้แก่{' '}
                <strong>{eligibleStaff.length} ท่าน</strong> ตลอดทั้งเดือน {monthName} ({daysInMonth} วัน)
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-[#8B1E27]">{totalShiftsToAssign}</span>
              <span className="block text-[10px] text-stone-500">ผลัดเวรทั้งหมด</span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={selectedShifts.length === 0}
              className="px-5 py-2 bg-[#8B1E27] hover:bg-[#721820] text-white font-semibold rounded-lg flex items-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>ดำเนินการจัดเวรอัตโนมัติ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
