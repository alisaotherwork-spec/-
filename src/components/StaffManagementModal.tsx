import React, { useState, useMemo } from 'react';
import { Staff, Position, StaffSection, UserRole, RoomType } from '../types';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  Building2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  onSaveStaffList: (newStaffList: Staff[]) => void;
  canManage: boolean;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  staffList,
  onSaveStaffList,
  canManage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<'ALL' | 'MT' | 'SUPPORT' | 'PART_TIME'>('ALL');
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Drag and Drop state
  const [draggedStaffId, setDraggedStaffId] = useState<string | null>(null);
  const [dragOverStaffId, setDragOverStaffId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'before' | 'after'>('before');

  // Form states
  const [formData, setFormData] = useState<Partial<Staff>>({
    name: '',
    englishName: '',
    position: 'MT',
    section: 'MT',
    role: 'staff',
    order: 1,
    defaultRoom: 'lab',
    isActive: true,
  });

  // Always keep master list sorted by order ascending
  const sortedStaffList = useMemo(() => {
    return [...staffList].sort((a, b) => a.order - b.order);
  }, [staffList]);

  // Filtered staff list for display
  const displayList = useMemo(() => {
    return sortedStaffList.filter((s) => {
      const matchesSearch =
        !searchTerm.trim() ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.englishName && s.englishName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesSection =
        selectedSection === 'ALL' || s.section === selectedSection;
      return matchesSearch && matchesSection;
    });
  }, [sortedStaffList, searchTerm, selectedSection]);

  if (!isOpen) return null;

  // --- REORDERING LOGIC ---

  /**
   * Move an item before or after a target item, then re-index 1..N
   */
  const handleMoveStaff = (sourceStaffId: string, targetStaffId: string, position: 'before' | 'after') => {
    if (sourceStaffId === targetStaffId) return;

    const sourceIdx = sortedStaffList.findIndex((s) => s.id === sourceStaffId);
    const targetIdx = sortedStaffList.findIndex((s) => s.id === targetStaffId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const itemToMove = sortedStaffList[sourceIdx];
    const remainder = sortedStaffList.filter((s) => s.id !== sourceStaffId);
    const newTargetIdx = remainder.findIndex((s) => s.id === targetStaffId);
    const insertAt = position === 'before' ? newTargetIdx : newTargetIdx + 1;

    remainder.splice(insertAt, 0, itemToMove);

    const reordered = remainder.map((s, index) => ({
      ...s,
      order: index + 1,
    }));

    onSaveStaffList(reordered);
  };

  /**
   * Move 1 step up or down (within current filtered section or global)
   */
  const handleMoveStep = (staffId: string, direction: 'up' | 'down') => {
    // Find in the display list to respect section context if filtered
    const inDisplay = displayList.findIndex((s) => s.id === staffId);
    if (inDisplay === -1) return;

    const targetDisplayIdx = direction === 'up' ? inDisplay - 1 : inDisplay + 1;
    if (targetDisplayIdx < 0 || targetDisplayIdx >= displayList.length) return;

    const targetStaff = displayList[targetDisplayIdx];
    handleMoveStaff(staffId, targetStaff.id, direction === 'up' ? 'before' : 'after');
  };

  /**
   * Jump to top or bottom
   */
  const handleMoveToExtreme = (staffId: string, position: 'top' | 'bottom') => {
    const item = sortedStaffList.find((s) => s.id === staffId);
    if (!item) return;

    const remainder = sortedStaffList.filter((s) => s.id !== staffId);
    const updated = position === 'top' ? [item, ...remainder] : [...remainder, item];
    const reordered = updated.map((s, idx) => ({
      ...s,
      order: idx + 1,
    }));

    onSaveStaffList(reordered);
  };

  /**
   * Direct order number change (inline input)
   */
  const handleDirectOrderChange = (staffId: string, targetOrder: number) => {
    if (isNaN(targetOrder) || targetOrder < 1) return;

    const item = sortedStaffList.find((s) => s.id === staffId);
    if (!item) return;

    const remainder = sortedStaffList.filter((s) => s.id !== staffId);
    const clampedIndex = Math.max(0, Math.min(targetOrder - 1, remainder.length));
    remainder.splice(clampedIndex, 0, item);

    const reordered = remainder.map((s, idx) => ({
      ...s,
      order: idx + 1,
    }));

    onSaveStaffList(reordered);
  };

  /**
   * Re-normalize all order numbers sequentially 1..N
   */
  const handleNormalizeOrders = () => {
    const reordered = sortedStaffList.map((s, idx) => ({
      ...s,
      order: idx + 1,
    }));
    onSaveStaffList(reordered);
  };

  // --- FORM HANDLERS ---

  const startEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setIsAddingNew(false);
    setFormData({ ...staff });
  };

  const startAdd = () => {
    const nextOrder = staffList.length > 0 ? Math.max(...staffList.map((s) => s.order)) + 1 : 1;
    setEditingStaff(null);
    setIsAddingNew(true);
    setFormData({
      id: `staff-${Date.now()}`,
      name: '',
      englishName: '',
      position: 'MT',
      section: 'MT',
      role: 'staff',
      order: nextOrder,
      defaultRoom: 'lab',
      isActive: true,
    });
  };

  const handleQuickRoomChange = (staffId: string, newRoom: RoomType | 'both') => {
    const updated = staffList.map((s) => (s.id === staffId ? { ...s, defaultRoom: newRoom } : s));
    onSaveStaffList(updated);
  };

  const handleToggleStaffActive = (staffId: string) => {
    const updated = staffList.map((s) =>
      s.id === staffId ? { ...s, isActive: s.isActive === false ? true : false } : s
    );
    onSaveStaffList(updated);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    if (isAddingNew) {
      const newStaff: Staff = {
        id: formData.id || `staff-${Date.now()}`,
        name: formData.name.trim(),
        englishName: formData.englishName?.trim(),
        position: formData.position || 'MT',
        section: formData.section || 'MT',
        role: formData.role || 'staff',
        order: Number(formData.order) || staffList.length + 1,
        defaultRoom: formData.defaultRoom || 'lab',
        isActive: formData.isActive ?? true,
      };

      // Insert at target order position
      const targetPos = Math.max(0, Math.min(newStaff.order - 1, sortedStaffList.length));
      const updated = [...sortedStaffList];
      updated.splice(targetPos, 0, newStaff);
      const renumbered = updated.map((s, idx) => ({ ...s, order: idx + 1 }));
      onSaveStaffList(renumbered);
    } else if (editingStaff) {
      const targetOrder = Number(formData.order) || editingStaff.order;
      let updated = sortedStaffList.map((s) =>
        s.id === editingStaff.id
          ? ({
              ...s,
              ...formData,
              name: formData.name!.trim(),
              englishName: formData.englishName?.trim(),
              defaultRoom: formData.defaultRoom || 'lab',
            } as Staff)
          : s
      );

      // If order changed, reposition
      if (targetOrder !== editingStaff.order) {
        const item = updated.find((s) => s.id === editingStaff.id)!;
        const remainder = updated.filter((s) => s.id !== editingStaff.id);
        const clampedIndex = Math.max(0, Math.min(targetOrder - 1, remainder.length));
        remainder.splice(clampedIndex, 0, item);
        updated = remainder.map((s, idx) => ({ ...s, order: idx + 1 }));
      }

      onSaveStaffList(updated);
    }

    setEditingStaff(null);
    setIsAddingNew(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`ยืนยันการลบเจ้าหน้าที่ "${name}" หรือไม่?`)) {
      const remaining = sortedStaffList.filter((s) => s.id !== id);
      const renumbered = remaining.map((s, idx) => ({ ...s, order: idx + 1 }));
      onSaveStaffList(renumbered);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="paper-card w-full max-w-5xl my-6 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in">
        
        {/* Header */}
        <div className="bg-[#8B1E27] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#A82B35] rounded-lg">
              <Users className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg">จัดการรายชื่อและสลับลำดับเจ้าหน้าที่</h3>
              <p className="text-xs text-amber-100/80">
                สลับลำดับการแสดงผลได้อย่างอิสระ (ลากย้าย / ลูกศรขึ้น-ลง / ระบุตัวเลข) • กำหนดห้องปฏิบัติงานและสิทธิ์
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer">
            ✕
          </button>
        </div>

        {/* Action & Filter Bar */}
        <div className="bg-[#F7F2EA] p-3 sm:p-4 border-b border-[#E5D5C5] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            {/* Search Input */}
            <div className="relative min-w-[180px] max-w-xs flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อ หรือภาษาอังกฤษ..."
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-[#D8C7B5] rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#8B1E27]"
              />
            </div>

            {/* Section Filter Tabs */}
            <div className="flex items-center bg-white p-0.5 rounded-lg border border-[#D8C7B5] text-xs">
              <button
                type="button"
                onClick={() => setSelectedSection('ALL')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  selectedSection === 'ALL'
                    ? 'bg-[#8B1E27] text-white font-semibold shadow-2xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                ทั้งหมด ({staffList.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedSection('MT')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  selectedSection === 'MT'
                    ? 'bg-[#8B1E27] text-white font-semibold shadow-2xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                MT ({staffList.filter((s) => s.section === 'MT').length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedSection('SUPPORT')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  selectedSection === 'SUPPORT'
                    ? 'bg-[#8B1E27] text-white font-semibold shadow-2xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                สายสนับสนุน ({staffList.filter((s) => s.section === 'SUPPORT').length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedSection('PART_TIME')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  selectedSection === 'PART_TIME'
                    ? 'bg-[#8B1E27] text-white font-semibold shadow-2xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                Part-time ({staffList.filter((s) => s.section === 'PART_TIME').length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={handleNormalizeOrders}
                  className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg flex items-center gap-1 border border-stone-300 transition-colors cursor-pointer"
                  title="รีเซ็ตเรียงลำดับใหม่ 1 ถึง N ตามแถวปัจจุบัน"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  เรียงลำดับ 1..N
                </button>
                <button
                  onClick={startAdd}
                  className="px-3 py-1.5 bg-[#8B1E27] hover:bg-[#721820] text-white text-xs sm:text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มเจ้าหน้าที่ใหม่
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* Quick Guide Banner for Reordering */}
          {canManage && (
            <div className="flex items-center justify-between gap-2 text-xs text-[#7A5B47] bg-amber-50 px-3.5 py-2 rounded-lg border border-amber-200 mb-4">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-[#8B1E27] shrink-0" />
                <span>
                  <strong>การสลับลำดับอย่างอิสระ:</strong> ลากแถวตรงปุ่ม <span className="font-mono bg-white px-1 border border-amber-300 rounded">⠿</span> ไปวางที่ต้องการ, คลิกปุ่มลูกศร <span className="font-semibold text-stone-800">▲ ▼</span> เพื่อเลื่อนทีละแถว หรือ <span className="underline">พิมพ์เปลี่ยนตัวเลขลำดับ</span> ได้โดยตรง
                </span>
              </div>
              <span className="text-[11px] text-stone-500 font-medium hidden md:inline">
                ลำดับนี้จะส่งผลต่อตารางเวร, ใบสรุปเวร และใบพิมพ์ PDF โดยตรง
              </span>
            </div>
          )}

          {/* Add / Edit Form Drawer */}
          {(isAddingNew || editingStaff) && (
            <form onSubmit={handleSaveForm} className="mb-6 p-4 bg-amber-50/80 border border-amber-300 rounded-xl space-y-3 shadow-xs">
              <div className="font-bold text-sm text-[#4A2E18] flex items-center justify-between border-b border-amber-200 pb-2">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#8B1E27]" />
                  <span>{isAddingNew ? 'เพิ่มเจ้าหน้าที่ใหม่' : `แก้ไขข้อมูล: ${editingStaff?.name}`}</span>
                </span>
                <button
                  type="button"
                  onClick={() => { setEditingStaff(null); setIsAddingNew(false); }}
                  className="text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">ชื่อ - สกุล (ภาษาไทย) *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="เช่น ทนพญ.กานดา มีสุข"
                    className="w-full p-2 bg-white border border-stone-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">ชื่อภาษาอังกฤษ</label>
                  <input
                    type="text"
                    value={formData.englishName || ''}
                    onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                    placeholder="เช่น Kanda Meesook"
                    className="w-full p-2 bg-white border border-stone-300 rounded-md"
                  />
                </div>

                {/* Edit which room staff belongs to */}
                <div>
                  <label className="block font-medium text-[#8B1E27] font-bold mb-1">
                    ห้องปฏิบัติงาน (Room) *
                  </label>
                  <select
                    value={formData.defaultRoom || 'lab'}
                    onChange={(e) => setFormData({ ...formData, defaultRoom: e.target.value as any })}
                    className="w-full p-2 bg-white border-2 border-amber-400 rounded-md font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#8B1E27]"
                  >
                    <option value="lab">ห้องปฏิบัติการ (Lab)</option>
                    <option value="donation">ห้องรับบริจาคโลหิต (Donation)</option>
                    <option value="both">ปฏิบัติงานทั้ง 2 ห้อง (หมุนเวียน)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">ตำแหน่ง (Position)</label>
                  <select
                    value={formData.position || 'MT'}
                    onChange={(e) => {
                      const pos = e.target.value as Position;
                      const sec: StaffSection = pos === 'MT' ? 'MT' : 'SUPPORT';
                      setFormData({ ...formData, position: pos, section: sec });
                    }}
                    className="w-full p-2 bg-white border border-stone-300 rounded-md"
                  >
                    <option value="MT">นักเทคนิคการแพทย์ (MT)</option>
                    <option value="AMT">ผู้ช่วยนักเทคนิคการแพทย์ (AMT)</option>
                    <option value="Office">ธุรการ (Office)</option>
                    <option value="Service">พนักงานช่วยงานบริการ (Service)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">ส่วนในตารางเวร (Section)</label>
                  <select
                    value={formData.section || 'MT'}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value as StaffSection })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-md"
                  >
                    <option value="MT">ส่วนที่ 1: นักเทคนิคการแพทย์ (MT)</option>
                    <option value="SUPPORT">ส่วนที่ 2: สายสนับสนุน (AMT / Office / Service)</option>
                    <option value="PART_TIME">ส่วนที่ 3: เจ้าหน้าที่ Part-time</option>
                  </select>
                </div>

                {/* Role */}
                <div>
                  <label className="block font-medium text-stone-700 mb-1">สิทธิ์ในระบบ (Role)</label>
                  <select
                    value={formData.role || 'staff'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-md"
                  >
                    <option value="staff">เจ้าหน้าที่ทั่วไป (แก้ไขเฉพาะเวรตนเอง)</option>
                    <option value="head">หัวหน้าห้อง / หัวหน้างาน (ทนพญ.ณิชาภา)</option>
                    <option value="sub_admin">ผู้ดูแลระบบย่อย (แก้เวรทุกคนได้)</option>
                    <option value="super_admin">ผู้ดูแลระบบสูงสุด (Super Admin - alisa)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">ลำดับการแสดงผล (Order)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.order || 1}
                    onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-md font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded border border-stone-300 w-full hover:bg-stone-50">
                    <input
                      type="checkbox"
                      checked={formData.isActive ?? true}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-[#8B1E27] focus:ring-[#8B1E27]"
                    />
                    <span className="font-semibold text-stone-800 text-xs">
                      🟢 สถานะ Active (เปิดปฏิบัติงาน)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => { setEditingStaff(null); setIsAddingNew(false); }}
                  className="px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-200 rounded-md cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-[#8B1E27] hover:bg-[#721820] text-white rounded-md flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          )}

          {/* Staff Table List with Reordering Features */}
          <div className="border border-stone-200 rounded-lg overflow-x-auto bg-white shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#F5EFE6] text-[#4A2E18] font-bold border-b border-stone-200">
                <tr>
                  <th className="p-2.5 text-center min-w-[130px] w-36 bg-amber-100/60 border-r border-amber-200 text-[#8B1E27]">
                    สลับลำดับ
                  </th>
                  <th className="p-2.5">ชื่อ - สกุล</th>
                  <th className="p-2.5">ชื่อภาษาอังกฤษ</th>
                  <th className="p-2.5 text-center w-20">ตำแหน่ง</th>
                  <th className="p-2.5 text-center min-w-[130px] bg-amber-50/70 border-x border-amber-200 text-[#8B1E27]">
                    ห้องปฏิบัติงาน
                  </th>
                  <th className="p-2.5">ส่วนในตาราง</th>
                  <th className="p-2.5 text-center w-24">สถานะ Active</th>
                  <th className="p-2.5 text-center w-28">สิทธิ์</th>
                  {canManage && <th className="p-2.5 text-center w-20">จัดการ</th>}
                </tr>
              </thead>
              <tbody>
                {displayList.length > 0 ? (
                  displayList.map((staff, displayIdx) => {
                    const isFirstInDisplay = displayIdx === 0;
                    const isLastInDisplay = displayIdx === displayList.length - 1;
                    const isBeingDragged = draggedStaffId === staff.id;
                    const isDragOver = dragOverStaffId === staff.id;

                    return (
                      <tr
                        key={staff.id}
                        draggable={canManage && !searchTerm.trim()}
                        onDragStart={(e) => {
                          if (!canManage) return;
                          setDraggedStaffId(staff.id);
                          e.dataTransfer.setData('text/plain', staff.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          if (!canManage || !draggedStaffId || draggedStaffId === staff.id) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          const rect = e.currentTarget.getBoundingClientRect();
                          const midY = rect.top + rect.height / 2;
                          const pos = e.clientY < midY ? 'before' : 'after';
                          setDragOverStaffId(staff.id);
                          setDragPosition(pos);
                        }}
                        onDragLeave={() => {
                          if (dragOverStaffId === staff.id) {
                            setDragOverStaffId(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (!canManage || !draggedStaffId || draggedStaffId === staff.id) return;
                          handleMoveStaff(draggedStaffId, staff.id, dragPosition);
                          setDraggedStaffId(null);
                          setDragOverStaffId(null);
                        }}
                        onDragEnd={() => {
                          setDraggedStaffId(null);
                          setDragOverStaffId(null);
                        }}
                        className={`border-b border-stone-100 hover:bg-stone-50 transition-all ${
                          isBeingDragged ? 'opacity-35 bg-amber-100' : ''
                        } ${
                          isDragOver && dragPosition === 'before'
                            ? 'border-t-4 border-t-[#8B1E27] bg-rose-50/50'
                            : ''
                        } ${
                          isDragOver && dragPosition === 'after'
                            ? 'border-b-4 border-b-[#8B1E27] bg-rose-50/50'
                            : ''
                        }`}
                      >
                        {/* Column 1: Flexible Reorder Controls (Drag Handle, Inline Number, Up/Down, Top/Bottom) */}
                        <td className="p-2 text-center bg-amber-50/40 border-r border-amber-200/80">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Drag handle */}
                            {canManage && (
                              <div
                                className="cursor-grab active:cursor-grabbing text-stone-400 hover:text-[#8B1E27] p-0.5 rounded-sm hover:bg-amber-100/80 transition-colors"
                                title="คลิกค้างแล้วลากแถวเพื่อสลับลำดับได้อย่างอิสระ"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>
                            )}

                            {/* Direct Editable Order Number */}
                            {canManage ? (
                              <input
                                type="number"
                                min={1}
                                max={staffList.length}
                                value={staff.order}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val)) {
                                    handleDirectOrderChange(staff.id, val);
                                  }
                                }}
                                className="w-11 text-center font-mono font-bold text-xs py-1 px-1 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#8B1E27] hover:border-[#8B1E27] shadow-2xs"
                                title="พิมพ์เปลี่ยนตัวเลขลำดับเพื่อย้ายตำแหน่งทันที"
                              />
                            ) : (
                              <span className="font-mono font-bold text-xs px-2 py-0.5 bg-stone-100 rounded-md border border-stone-200">
                                {staff.order}
                              </span>
                            )}

                            {/* Up / Down Arrow Step Buttons */}
                            {canManage && (
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={isFirstInDisplay}
                                  onClick={() => handleMoveStep(staff.id, 'up')}
                                  className="p-1 text-stone-600 hover:text-[#8B1E27] hover:bg-amber-100 rounded-md disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                  title="เลื่อนขึ้น 1 ตำแหน่ง"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLastInDisplay}
                                  onClick={() => handleMoveStep(staff.id, 'down')}
                                  className="p-1 text-stone-600 hover:text-[#8B1E27] hover:bg-amber-100 rounded-md disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                  title="เลื่อนลง 1 ตำแหน่ง"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Jump to extreme top / bottom buttons */}
                            {canManage && (
                              <div className="hidden sm:flex items-center gap-0.5 border-l border-amber-200 pl-1">
                                <button
                                  type="button"
                                  disabled={isFirstInDisplay}
                                  onClick={() => handleMoveToExtreme(staff.id, 'top')}
                                  className="p-1 text-stone-400 hover:text-[#8B1E27] hover:bg-amber-100 rounded-md disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                  title="ย้ายขึ้นไปบนสุด (อันดับ 1)"
                                >
                                  <ChevronsUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLastInDisplay}
                                  onClick={() => handleMoveToExtreme(staff.id, 'bottom')}
                                  className="p-1 text-stone-400 hover:text-[#8B1E27] hover:bg-amber-100 rounded-md disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                  title="ย้ายลงไปท้ายสุด"
                                >
                                  <ChevronsDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-2 font-medium text-stone-900">{staff.name}</td>
                        <td className="p-2 text-stone-600 italic">{staff.englishName || '-'}</td>
                        <td className="p-2 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 font-bold text-[11px] border border-stone-200">
                            {staff.position}
                          </span>
                        </td>

                        {/* Room Assignment Column with Quick Switcher */}
                        <td className="p-2 text-center bg-amber-50/40 border-x border-amber-100">
                          {canManage ? (
                            <select
                              value={staff.defaultRoom || 'lab'}
                              onChange={(e) => handleQuickRoomChange(staff.id, e.target.value as any)}
                              className="px-2 py-1 text-[11px] font-semibold rounded-md border border-amber-300 bg-white text-stone-800 cursor-pointer hover:border-[#8B1E27]"
                              title="คลิกเพื่อเปลี่ยนห้องปฏิบัติงาน"
                            >
                              <option value="lab">ห้องปฏิบัติการ (Lab)</option>
                              <option value="donation">ห้องบริจาคโลหิต</option>
                              <option value="both">ทั้งสองห้อง</option>
                            </select>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                staff.defaultRoom === 'donation'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : staff.defaultRoom === 'both'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {staff.defaultRoom === 'donation'
                                ? 'ห้องบริจาคโลหิต'
                                : staff.defaultRoom === 'both'
                                ? 'ทั้งสองห้อง'
                                : 'ห้องปฏิบัติการ'}
                            </span>
                          )}
                        </td>

                        <td className="p-2 text-stone-700">
                          {staff.section === 'MT' ? (
                            <span className="text-amber-800 font-medium">1. MT</span>
                          ) : staff.section === 'SUPPORT' ? (
                            <span className="text-blue-800 font-medium">2. สายสนับสนุน</span>
                          ) : (
                            <span className="text-purple-800 font-medium">3. Part-time</span>
                          )}
                        </td>

                        {/* Active Status Column with 1-click Toggle */}
                        <td className="p-2 text-center">
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => handleToggleStaffActive(staff.id)}
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-all border ${
                                staff.isActive !== false
                                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300 shadow-2xs'
                                  : 'bg-stone-200 hover:bg-stone-300 text-stone-600 border-stone-300'
                              }`}
                              title="คลิกเพื่อสลับสถานะ Active / Inactive"
                            >
                              {staff.isActive !== false ? '🟢 Active' : '⚪ Inactive'}
                            </button>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                staff.isActive !== false
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-stone-200 text-stone-600 border-stone-300'
                              }`}
                            >
                              {staff.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>

                        <td className="p-2 text-center">
                          {staff.role === 'super_admin' ? (
                            <span className="px-2 py-0.5 rounded-xs bg-red-100 text-red-700 font-bold text-[10px] border border-red-200">
                              Super Admin
                            </span>
                          ) : staff.role === 'head' ? (
                            <span className="px-2 py-0.5 rounded-xs bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                              หัวหน้าห้อง
                            </span>
                          ) : staff.role === 'sub_admin' ? (
                            <span className="px-2 py-0.5 rounded-xs bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-200">
                              ผู้ดูแลย่อย
                            </span>
                          ) : (
                            <span className="text-stone-500 text-[11px]">ทั่วไป</span>
                          )}
                        </td>

                        {canManage && (
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => startEdit(staff)}
                                className="p-1 hover:bg-amber-100 text-amber-800 rounded-sm cursor-pointer"
                                title="แก้ไขข้อมูลทั้งหมด"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(staff.id, staff.name)}
                                className="p-1 hover:bg-red-100 text-red-700 rounded-sm cursor-pointer"
                                title="ลบ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={canManage ? 9 : 8} className="p-8 text-center text-stone-400">
                      ไม่พบข้อมูลเจ้าหน้าที่ตามเงื่อนไขที่ค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
