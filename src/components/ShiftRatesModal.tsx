import React, { useState, useEffect, useMemo } from 'react';
import { ShiftDefinition, Position } from '../types';
import { POSITION_SPECIFIC_PRESETS, ShiftPresetItem } from '../data/initialData';
import {
  Coins,
  Plus,
  Trash2,
  Check,
  X,
  AlertCircle,
  Search,
  Filter,
  Sparkles,
  Layers,
  CheckSquare,
  Square,
  CheckCheck,
} from 'lucide-react';

interface ShiftRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftDefs: ShiftDefinition[];
  onSaveShiftDefs: (newDefs: ShiftDefinition[]) => void;
  canEdit: boolean;
}

const ALL_POSITIONS: Position[] = ['MT', 'AMT', 'Office', 'Service'];

export const ShiftRatesModal: React.FC<ShiftRatesModalProps> = ({
  isOpen,
  onClose,
  shiftDefs,
  onSaveShiftDefs,
  canEdit,
}) => {
  const [shifts, setShifts] = useState<ShiftDefinition[]>(() =>
    shiftDefs.map((d) => ({
      ...d,
      rates: { ...d.rates },
      applicablePositions: d.applicablePositions ? [...d.applicablePositions] : [...ALL_POSITIONS],
    }))
  );

  // Position filter tab for the table
  const [selectedPositionTab, setSelectedPositionTab] = useState<
    'ALL' | Position | 'OT'
  >('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Preset selector position tab
  const [presetTab, setPresetTab] = useState<Position>('MT');

  // Form states
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [isOt, setIsOt] = useState(false);
  const [otHours, setOtHours] = useState(1);
  const [rateMt, setRateMt] = useState(900);
  const [rateAmt, setRateAmt] = useState(550);
  const [rateOffice, setRateOffice] = useState(550);
  const [rateService, setRateService] = useState(460);
  const [applicablePositions, setApplicablePositions] = useState<Position[]>([
    'MT',
    'AMT',
    'Office',
    'Service',
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setShifts(
        shiftDefs.map((d) => ({
          ...d,
          rates: { ...d.rates },
          applicablePositions: d.applicablePositions
            ? [...d.applicablePositions]
            : [...ALL_POSITIONS],
        }))
      );
      setError(null);
    }
  }, [isOpen, shiftDefs]);

  // Filtered shifts for table display
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      // Search filter
      const matchesSearch =
        !searchTerm.trim() ||
        s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Position filter
      if (selectedPositionTab === 'ALL') return true;
      if (selectedPositionTab === 'OT') return s.isOt || /^OT/i.test(s.code);

      // Check if position is explicitly marked applicable or has positive rate
      const isApplicable =
        !s.applicablePositions ||
        s.applicablePositions.length === 0 ||
        s.applicablePositions.includes(selectedPositionTab);
      const hasRate = (s.rates?.[selectedPositionTab] || 0) > 0;

      return isApplicable && hasRate;
    });
  }, [shifts, selectedPositionTab, searchTerm]);

  // Count badges
  const counts = useMemo(() => {
    return {
      all: shifts.length,
      mt: shifts.filter(
        (s) =>
          (!s.applicablePositions || s.applicablePositions.includes('MT')) &&
          (s.rates?.MT || 0) > 0
      ).length,
      amt: shifts.filter(
        (s) =>
          (!s.applicablePositions || s.applicablePositions.includes('AMT')) &&
          (s.rates?.AMT || 0) > 0
      ).length,
      office: shifts.filter(
        (s) =>
          (!s.applicablePositions || s.applicablePositions.includes('Office')) &&
          (s.rates?.Office || 0) > 0
      ).length,
      service: shifts.filter(
        (s) =>
          (!s.applicablePositions || s.applicablePositions.includes('Service')) &&
          (s.rates?.Service || 0) > 0
      ).length,
      ot: shifts.filter((s) => s.isOt || /^OT/i.test(s.code)).length,
    };
  }, [shifts]);

  if (!isOpen) return null;

  const handleRateChange = (index: number, pos: Position, value: number) => {
    const updated = [...shifts];
    updated[index] = {
      ...updated[index],
      rates: {
        ...updated[index].rates,
        [pos]: value,
      },
    };
    setShifts(updated);
  };

  const handleTogglePositionApplicable = (shiftIndex: number, pos: Position) => {
    const updated = [...shifts];
    const current = updated[shiftIndex].applicablePositions || [...ALL_POSITIONS];
    const next = current.includes(pos)
      ? current.filter((p) => p !== pos)
      : [...current, pos];
    updated[shiftIndex] = {
      ...updated[shiftIndex],
      applicablePositions: next,
    };
    setShifts(updated);
  };

  // Quick select preset shift code for a position
  const handleSelectPreset = (preset: ShiftPresetItem) => {
    setError(null);
    setNewCode(preset.code);
    setNewName(preset.name);
    setIsOt(!!preset.isOt);
    setOtHours(preset.otHours || 1);
    setRateMt(preset.rates.MT);
    setRateAmt(preset.rates.AMT);
    setRateOffice(preset.rates.Office);
    setRateService(preset.rates.Service);
    // If selecting under a specific position tab, set applicable positions accordingly
    setApplicablePositions(['MT', 'AMT', 'Office', 'Service']);
  };

  const toggleFormPosition = (pos: Position) => {
    setApplicablePositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    );
  };

  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const code = newCode.trim().toUpperCase();
    if (code.length < 1 || code.length > 4) {
      setError('รหัสเวรต้องมีความยาว 1-4 ตัวอักษร');
      return;
    }

    if (applicablePositions.length === 0) {
      setError('กรุณาเลือกตำแหน่งที่สามารถใช้รหัสเวรนี้อย่างน้อย 1 ตำแหน่ง');
      return;
    }

    const existingIndex = shifts.findIndex(
      (s) => s.code.toLowerCase() === code.toLowerCase()
    );

    const newDef: ShiftDefinition = {
      code,
      name: newName.trim() || `เวร ${code}`,
      isOt,
      otHours: isOt ? Number(otHours) : undefined,
      rates: {
        MT: Number(rateMt) || 0,
        AMT: Number(rateAmt) || 0,
        Office: Number(rateOffice) || 0,
        Service: Number(rateService) || 0,
      },
      applicablePositions: [...applicablePositions],
      colorBg: isOt ? '#DCFCE7' : '#F7F2EA',
      colorText: isOt ? '#166534' : '#4A2E18',
      colorBorder: '#D8C7B5',
    };

    if (existingIndex >= 0) {
      // Update existing code
      const updated = [...shifts];
      updated[existingIndex] = newDef;
      setShifts(updated);
    } else {
      // Add new
      setShifts([...shifts, newDef]);
    }

    setNewCode('');
    setNewName('');
    setIsOt(false);
  };

  const handleDeleteShift = (code: string) => {
    if (window.confirm(`ต้องการลบรหัสเวร "${code}" หรือไม่?`)) {
      setShifts(shifts.filter((s) => s.code !== code));
    }
  };

  const handleSaveAll = () => {
    onSaveShiftDefs(shifts);
    onClose();
  };

  const presetsForActiveTab = POSITION_SPECIFIC_PRESETS[presetTab] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="paper-card w-full max-w-5xl my-6 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-[#8B1E27] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#A82B35] rounded-lg">
              <Coins className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg">
                กำหนดรหัสเวรและอัตราค่าตอบแทน (ตัวเลือกรหัสเวรเฉพาะตำแหน่งครบทุกรหัส)
              </h3>
              <p className="text-xs text-amber-100/80">
                เลือกและกำหนดรหัสเวรเฉพาะตำแหน่ง MT / AMT / Office / Service / OT ครบทุกผลัดเวร พร้อมอัตราค่าตอบแทน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Position-Specific Preset Shift Code Palette (ตัวเลือกรหัสเวรให้เลือกเฉพาะตำแหน่งครบทุกรหัส) */}
        {canEdit && (
          <div className="bg-[#FFFDF7] p-3 sm:p-4 border-b border-[#E5D5C5] shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#8B1E27]" />
                <span className="font-bold text-xs sm:text-sm text-[#4A2E18]">
                  ตัวเลือกรหัสเวรสำเร็จรูปเฉพาะตำแหน่ง (คลิกเพื่อเลือกใส่ข้อมูลอัตโนมัติ):
                </span>
              </div>

              {/* Selector Tabs for Preset Positions */}
              <div className="flex items-center bg-[#F5EFE6] p-0.5 rounded-lg border border-[#D8C7B5] text-xs">
                {(['MT', 'AMT', 'Office', 'Service'] as Position[]).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setPresetTab(pos)}
                    className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      presetTab === pos
                        ? 'bg-[#8B1E27] text-white shadow-2xs'
                        : 'text-stone-700 hover:text-stone-900 hover:bg-white/60'
                    }`}
                  >
                    เฉพาะ {pos} ({POSITION_SPECIFIC_PRESETS[pos].length} รหัส)
                  </button>
                ))}
              </div>
            </div>

            {/* Categorized Pill Buttons for Active Position */}
            <div className="space-y-1.5 pt-1">
              {(['เช้า', 'บ่าย', 'ดึก', 'เวรควบ', 'OT'] as const).map((cat) => {
                const groupItems = presetsForActiveTab.filter((p) => p.category === cat);
                if (groupItems.length === 0) return null;

                return (
                  <div key={cat} className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="w-14 shrink-0 font-bold text-[11px] text-[#7A5B47]">
                      {cat}:
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      {groupItems.map((preset) => {
                        const isCurrentlyAdded = shifts.some(
                          (s) => s.code.toLowerCase() === preset.code.toLowerCase()
                        );
                        return (
                          <button
                            key={preset.code}
                            type="button"
                            onClick={() => handleSelectPreset(preset)}
                            className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs border transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                              preset.isOt
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-white hover:bg-amber-100/70 text-[#8B1E27] border-[#D8C7B5]'
                            }`}
                            title={`${preset.name} • ค่าตอบแทน ${presetTab}: ${preset.rates[presetTab].toLocaleString()} บาท (คลิกเพื่อนำรหัสนี้ไปใช้)`}
                          >
                            <span>{preset.code}</span>
                            <span className="text-[10px] text-stone-500 font-sans font-normal">
                              ({preset.rates[presetTab].toLocaleString()}บ.)
                            </span>
                            {isCurrentlyAdded && (
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add / Edit Shift Form */}
        {canEdit && (
          <form
            onSubmit={handleAddShift}
            className="bg-[#F7F2EA] p-3 sm:p-4 border-b border-[#E5D5C5] text-xs shrink-0"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-stone-800">
                เพิ่มหรือปรับปรุงรหัสเวร (1 - 4 ตัวอักษร) พร้อมกำหนดตำแหน่งที่ใช้ได้
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-stone-600">ตำแหน่งที่ใช้รหัสนี้:</span>
                {ALL_POSITIONS.map((pos) => {
                  const isChecked = applicablePositions.includes(pos);
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => toggleFormPosition(pos)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                        isChecked
                          ? 'bg-[#8B1E27] text-white border-[#8B1E27]'
                          : 'bg-white text-stone-500 border-stone-300'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                      <span>{pos}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="mb-2 p-2 rounded-md bg-red-100 text-red-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 items-end">
              <div>
                <label className="block text-stone-600 font-medium mb-1">รหัสเวร (1-4 ตัว)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="เช่น ช4, บ4"
                  className="w-full p-1.5 bg-white border border-[#D8C7B5] rounded-md font-bold text-stone-900 uppercase"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-stone-600 font-medium mb-1">ชื่อเรียกเวร / ช่วงเวลา</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="เช่น เวรเช้าพิเศษ"
                  className="w-full p-1.5 bg-white border border-[#D8C7B5] rounded-md text-stone-900"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">MT (บาท)</label>
                <input
                  type="number"
                  value={rateMt}
                  onChange={(e) => setRateMt(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-[#D8C7B5] rounded-md text-stone-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">AMT (บาท)</label>
                <input
                  type="number"
                  value={rateAmt}
                  onChange={(e) => setRateAmt(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-[#D8C7B5] rounded-md text-stone-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Office (บาท)</label>
                <input
                  type="number"
                  value={rateOffice}
                  onChange={(e) => setRateOffice(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-[#D8C7B5] rounded-md text-stone-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Service (บาท)</label>
                <input
                  type="number"
                  value={rateService}
                  onChange={(e) => setRateService(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-[#D8C7B5] rounded-md text-stone-900 font-mono"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full py-1.5 px-3 bg-[#8B1E27] hover:bg-[#721820] text-white font-medium rounded-md flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  บันทึกรหัส
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOt}
                  onChange={(e) => setIsOt(e.target.checked)}
                  className="rounded text-[#8B1E27]"
                />
                <span className="text-stone-700 font-medium">เป็นเวรล่วงเวลา (OT)</span>
              </label>
              {isOt && (
                <div className="flex items-center gap-1">
                  <span className="text-stone-600">จำนวนชั่วโมง:</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={otHours}
                    onChange={(e) => setOtHours(Number(e.target.value))}
                    className="w-14 p-1 bg-white border border-[#D8C7B5] rounded-md text-center font-bold"
                  />
                  <span className="text-stone-600">ชม.</span>
                </div>
              )}
            </div>
          </form>
        )}

        {/* Filter and Search Bar */}
        <div className="bg-[#FAF6F0] p-3 border-b border-[#E5D5C5] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Position Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="text-stone-500 font-medium flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-stone-600" />
              <span>แสดง:</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedPositionTab('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                selectedPositionTab === 'ALL'
                  ? 'bg-[#8B1E27] text-white shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              ทั้งหมด ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setSelectedPositionTab('MT')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                selectedPositionTab === 'MT'
                  ? 'bg-[#8B1E27] text-white shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              เฉพาะ MT ({counts.mt})
            </button>
            <button
              type="button"
              onClick={() => setSelectedPositionTab('AMT')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                selectedPositionTab === 'AMT'
                  ? 'bg-[#8B1E27] text-white shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              เฉพาะ AMT ({counts.amt})
            </button>
            <button
              type="button"
              onClick={() => setSelectedPositionTab('Office')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                selectedPositionTab === 'Office'
                  ? 'bg-[#8B1E27] text-white shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              เฉพาะ Office ({counts.office})
            </button>
            <button
              type="button"
              onClick={() => setSelectedPositionTab('Service')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                selectedPositionTab === 'Service'
                  ? 'bg-[#8B1E27] text-white shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              เฉพาะ Service ({counts.service})
            </button>
            <button
              type="button"
              onClick={() => setSelectedPositionTab('OT')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                selectedPositionTab === 'OT'
                  ? 'bg-[#8B1E27] text-white shadow-2xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              เวร OT ({counts.ot})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหารหัสเวร หรือชื่อเวร..."
              className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-[#D8C7B5] rounded-md text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#8B1E27]"
            />
          </div>
        </div>

        {/* Shift List Table */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-[#F5EFE6] text-[#4A2E18] font-bold border-b border-stone-200 sticky top-0 z-10">
              <tr>
                <th className="p-2 text-center w-16">รหัสเวร</th>
                <th className="p-2 text-left">ชื่อเวร / รายละเอียด</th>
                <th className="p-2 text-center w-24">ประเภท</th>
                <th className="p-2 text-center min-w-[130px]">ตำแหน่งที่ใช้ได้</th>
                <th
                  className={`p-2 text-right w-24 ${
                    selectedPositionTab === 'MT'
                      ? 'bg-amber-100 text-[#8B1E27] border-x border-[#8B1E27]'
                      : ''
                  }`}
                >
                  MT (บาท)
                </th>
                <th
                  className={`p-2 text-right w-24 ${
                    selectedPositionTab === 'AMT'
                      ? 'bg-blue-100 text-blue-900 border-x border-blue-500'
                      : ''
                  }`}
                >
                  AMT (บาท)
                </th>
                <th
                  className={`p-2 text-right w-24 ${
                    selectedPositionTab === 'Office'
                      ? 'bg-purple-100 text-purple-900 border-x border-purple-500'
                      : ''
                  }`}
                >
                  Office (บาท)
                </th>
                <th
                  className={`p-2 text-right w-24 ${
                    selectedPositionTab === 'Service'
                      ? 'bg-emerald-100 text-emerald-900 border-x border-emerald-500'
                      : ''
                  }`}
                >
                  Service (บาท)
                </th>
                {canEdit && <th className="p-2 text-center w-14">ลบ</th>}
              </tr>
            </thead>
            <tbody>
              {filteredShifts.length > 0 ? (
                filteredShifts.map((s, idx) => {
                  const shiftIndex = shifts.findIndex((orig) => orig.code === s.code);
                  const applicable = s.applicablePositions || ALL_POSITIONS;

                  return (
                    <tr
                      key={s.code}
                      className="border-b border-stone-100 hover:bg-stone-50 transition-colors"
                    >
                      <td className="p-2 text-center font-bold font-mono text-sm">
                        <span
                          className="px-2 py-0.5 rounded-md border font-mono font-bold"
                          style={{
                            backgroundColor:
                              s.colorBg || (s.isOt ? '#DCFCE7' : '#FFFDF7'),
                            color: s.colorText || (s.isOt ? '#166534' : '#8B1E27'),
                            borderColor: s.colorBorder || '#D8C7B5',
                          }}
                        >
                          {s.code}
                        </span>
                      </td>
                      <td className="p-2 text-stone-800 font-medium">{s.name}</td>
                      <td className="p-2 text-center">
                        {s.isOt ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                            OT ({s.otHours || 1} ชม.)
                          </span>
                        ) : (
                          <span className="text-stone-500 text-[11px]">เวรปกติ</span>
                        )}
                      </td>

                      {/* Position Badges */}
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {ALL_POSITIONS.map((pos) => {
                            const isIncluded = applicable.includes(pos);
                            return canEdit ? (
                              <button
                                key={pos}
                                type="button"
                                onClick={() =>
                                  handleTogglePositionApplicable(shiftIndex, pos)
                                }
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                  isIncluded
                                    ? pos === 'MT'
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : pos === 'AMT'
                                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                                      : pos === 'Office'
                                      ? 'bg-purple-100 text-purple-900 border-purple-300'
                                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : 'bg-stone-100 text-stone-400 border-stone-200 line-through opacity-60'
                                }`}
                                title={`คลิกเพื่อเปิด/ปิดการใช้รหัสนี้สำหรับ ${pos}`}
                              >
                                {pos}
                              </button>
                            ) : (
                              <span
                                key={pos}
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                  isIncluded
                                    ? 'bg-stone-100 text-stone-800 border-stone-300'
                                    : 'opacity-25 line-through'
                                }`}
                              >
                                {pos}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Rates columns */}
                      <td
                        className={`p-2 text-right font-medium ${
                          selectedPositionTab === 'MT' ? 'bg-amber-50/70 font-bold' : ''
                        }`}
                      >
                        {canEdit ? (
                          <input
                            type="number"
                            value={s.rates.MT}
                            onChange={(e) =>
                              handleRateChange(shiftIndex, 'MT', Number(e.target.value))
                            }
                            className="w-20 p-1 text-right bg-white border border-stone-300 rounded-sm font-semibold font-mono"
                          />
                        ) : (
                          s.rates.MT.toLocaleString()
                        )}
                      </td>
                      <td
                        className={`p-2 text-right font-medium ${
                          selectedPositionTab === 'AMT' ? 'bg-blue-50/70 font-bold' : ''
                        }`}
                      >
                        {canEdit ? (
                          <input
                            type="number"
                            value={s.rates.AMT}
                            onChange={(e) =>
                              handleRateChange(shiftIndex, 'AMT', Number(e.target.value))
                            }
                            className="w-20 p-1 text-right bg-white border border-stone-300 rounded-sm font-mono"
                          />
                        ) : (
                          s.rates.AMT.toLocaleString()
                        )}
                      </td>
                      <td
                        className={`p-2 text-right font-medium ${
                          selectedPositionTab === 'Office' ? 'bg-purple-50/70 font-bold' : ''
                        }`}
                      >
                        {canEdit ? (
                          <input
                            type="number"
                            value={s.rates.Office}
                            onChange={(e) =>
                              handleRateChange(shiftIndex, 'Office', Number(e.target.value))
                            }
                            className="w-20 p-1 text-right bg-white border border-stone-300 rounded-sm font-mono"
                          />
                        ) : (
                          s.rates.Office.toLocaleString()
                        )}
                      </td>
                      <td
                        className={`p-2 text-right font-medium ${
                          selectedPositionTab === 'Service' ? 'bg-emerald-50/70 font-bold' : ''
                        }`}
                      >
                        {canEdit ? (
                          <input
                            type="number"
                            value={s.rates.Service}
                            onChange={(e) =>
                              handleRateChange(shiftIndex, 'Service', Number(e.target.value))
                            }
                            className="w-20 p-1 text-right bg-white border border-stone-300 rounded-sm font-mono"
                          />
                        ) : (
                          s.rates.Service.toLocaleString()
                        )}
                      </td>

                      {canEdit && (
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleDeleteShift(s.code)}
                            className="p-1 hover:bg-red-100 text-red-700 rounded-sm cursor-pointer"
                            title="ลบรหัสเวร"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={canEdit ? 9 : 8}
                    className="p-8 text-center text-stone-400"
                  >
                    ไม่พบรหัสเวรตามตัวเลือกที่กำหนด
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-[#F7F2EA] p-3 sm:p-4 border-t border-[#E5D5C5] flex items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-stone-500">
            จำนวนรหัสเวรที่แสดง: <strong className="text-stone-800">{filteredShifts.length}</strong> จากทั้งหมด {shifts.length} รหัส
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-stone-700 hover:bg-stone-200 rounded-lg cursor-pointer"
            >
              ปิด
            </button>
            {canEdit && (
              <button
                onClick={handleSaveAll}
                className="px-5 py-2 text-xs sm:text-sm font-semibold bg-[#8B1E27] hover:bg-[#721820] text-white rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                บันทึกการเปลี่ยนแปลงทั้งหมด
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
