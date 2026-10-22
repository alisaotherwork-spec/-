import React, { useState } from 'react';
import { ShiftDefinition, Position } from '../types';
import { Coins, Plus, Trash2, Check, X, AlertCircle } from 'lucide-react';

interface ShiftRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftDefs: ShiftDefinition[];
  onSaveShiftDefs: (newDefs: ShiftDefinition[]) => void;
  canEdit: boolean;
}

export const ShiftRatesModal: React.FC<ShiftRatesModalProps> = ({
  isOpen,
  onClose,
  shiftDefs,
  onSaveShiftDefs,
  canEdit,
}) => {
  const [shifts, setShifts] = useState<ShiftDefinition[]>([...shiftDefs]);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [isOt, setIsOt] = useState(false);
  const [otHours, setOtHours] = useState(1);
  const [rateMt, setRateMt] = useState(900);
  const [rateAmt, setRateAmt] = useState(550);
  const [rateOffice, setRateOffice] = useState(550);
  const [rateService, setRateService] = useState(460);
  const [error, setError] = useState<string | null>(null);

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

  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const code = newCode.trim().toUpperCase();
    if (code.length < 1 || code.length > 4) {
      setError('รหัสเวรต้องมีความยาว 1-4 ตัวอักษร');
      return;
    }

    if (shifts.some((s) => s.code.toLowerCase() === code.toLowerCase())) {
      setError(`รหัสเวร "${code}" มีอยู่ในระบบแล้ว`);
      return;
    }

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
      colorBg: isOt ? '#DCFCE7' : '#F7F2EA',
      colorText: isOt ? '#166534' : '#4A2E18',
      colorBorder: '#D8C7B5',
    };

    setShifts([...shifts, newDef]);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="paper-card w-full max-w-4xl my-6 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in">
        
        {/* Header */}
        <div className="bg-[#8B1E27] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#A82B35] rounded-lg">
              <Coins className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg">กำหนดรหัสเวรและอัตราค่าตอบแทน</h3>
              <p className="text-xs text-amber-100/80">
                รหัสเวร 1-4 ตัวอักษร พร้อมกำหนดค่าตอบแทนแยกตามตำแหน่ง (MT / AMT / Office / Service)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
            ✕
          </button>
        </div>

        {/* Form to add custom shift */}
        {canEdit && (
          <form onSubmit={handleAddShift} className="bg-[#F7F2EA] p-4 border-b border-[#E5D5C5] text-xs">
            <div className="font-bold text-stone-800 mb-2">เพิ่มรหัสเวรใหม่ (1 - 4 ตัวอักษร)</div>
            {error && (
              <div className="mb-2 p-2 rounded-md bg-red-100 text-red-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 items-end">
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

              <div>
                <label className="block text-stone-600 font-medium mb-1">ชื่อเรียกเวร</label>
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
                  className="w-full p-1.5 bg-white border border-[#D8C7B5] rounded-md text-stone-900"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">AMT (บาท)</label>
                <input
                  type="number"
                  value={rateAmt}
                  onChange={(e) => setRateAmt(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-[#D8C7B5] rounded-md text-stone-900"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Office (บาท)</label>
                <input
                  type="number"
                  value={rateOffice}
                  onChange={(e) => setRateOffice(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-[#D8C7B5] rounded-md text-stone-900"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Service (บาท)</label>
                <input
                  type="number"
                  value={rateService}
                  onChange={(e) => setRateService(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border border-[#D8C7B5] rounded-md text-stone-900"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full py-1.5 px-3 bg-[#8B1E27] hover:bg-[#721820] text-white font-medium rounded-md flex items-center justify-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มรหัส
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
                <span className="text-stone-700">เป็นเวรล่วงเวลา (OT)</span>
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
                    className="w-14 p-1 bg-white border border-[#D8C7B5] rounded-md text-center"
                  />
                  <span className="text-stone-600">ชม.</span>
                </div>
              )}
            </div>
          </form>
        )}

        {/* Shift List Table */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-[#F5EFE6] text-[#4A2E18] font-bold border-b border-stone-200">
              <tr>
                <th className="p-2 text-center w-16">รหัสเวร</th>
                <th className="p-2 text-left">ชื่อเวร / รายละเอียด</th>
                <th className="p-2 text-center">ประเภท</th>
                <th className="p-2 text-right">MT (บาท)</th>
                <th className="p-2 text-right">AMT (บาท)</th>
                <th className="p-2 text-right">Office (บาท)</th>
                <th className="p-2 text-right">Service (บาท)</th>
                {canEdit && <th className="p-2 text-center w-16">ลบ</th>}
              </tr>
            </thead>
            <tbody>
              {shifts.map((s, idx) => (
                <tr key={s.code} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="p-2 text-center font-bold font-mono text-sm">
                    <span className="px-2 py-0.5 rounded-md border border-[#D8C7B5] bg-[#FFFDF7] text-[#8B1E27]">
                      {s.code}
                    </span>
                  </td>
                  <td className="p-2 text-stone-800">{s.name}</td>
                  <td className="p-2 text-center">
                    {s.isOt ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                        OT ({s.otHours || 1} ชม.)
                      </span>
                    ) : (
                      <span className="text-stone-500 text-[11px]">เวรปกติ</span>
                    )}
                  </td>
                  <td className="p-2 text-right font-medium">
                    {canEdit ? (
                      <input
                        type="number"
                        value={s.rates.MT}
                        onChange={(e) => handleRateChange(idx, 'MT', Number(e.target.value))}
                        className="w-20 p-1 text-right bg-white border border-stone-300 rounded-sm font-semibold"
                      />
                    ) : (
                      s.rates.MT.toLocaleString()
                    )}
                  </td>
                  <td className="p-2 text-right font-medium">
                    {canEdit ? (
                      <input
                        type="number"
                        value={s.rates.AMT}
                        onChange={(e) => handleRateChange(idx, 'AMT', Number(e.target.value))}
                        className="w-20 p-1 text-right bg-white border border-stone-300 rounded-sm"
                      />
                    ) : (
                      s.rates.AMT.toLocaleString()
                    )}
                  </td>
                  <td className="p-2 text-right font-medium">
                    {canEdit ? (
                      <input
                        type="number"
                        value={s.rates.Office}
                        onChange={(e) => handleRateChange(idx, 'Office', Number(e.target.value))}
                        className="w-20 p-1 text-right bg-white border border-stone-300 rounded-sm"
                      />
                    ) : (
                      s.rates.Office.toLocaleString()
                    )}
                  </td>
                  <td className="p-2 text-right font-medium">
                    {canEdit ? (
                      <input
                        type="number"
                        value={s.rates.Service}
                        onChange={(e) => handleRateChange(idx, 'Service', Number(e.target.value))}
                        className="w-20 p-1 text-right bg-white border border-stone-300 rounded-sm"
                      />
                    ) : (
                      s.rates.Service.toLocaleString()
                    )}
                  </td>
                  {canEdit && (
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleDeleteShift(s.code)}
                        className="p-1 hover:bg-red-100 text-red-700 rounded-sm"
                        title="ลบรหัสเวร"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-[#F7F2EA] p-3 sm:p-4 border-t border-[#E5D5C5] flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-stone-700 hover:bg-stone-200 rounded-lg"
          >
            ปิด
          </button>
          {canEdit && (
            <button
              onClick={handleSaveAll}
              className="px-5 py-2 text-xs sm:text-sm font-semibold bg-[#8B1E27] hover:bg-[#721820] text-white rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              บันทึกการเปลี่ยนแปลงทั้งหมด
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
