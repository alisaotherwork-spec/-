import React, { useState } from 'react';
import { Staff, Position, StaffSection, UserRole, RoomType } from '../types';
import { Users, Plus, Edit2, Trash2, Check, X, Search, ShieldAlert } from 'lucide-react';

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
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

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

  if (!isOpen) return null;

  const filtered = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.englishName && s.englishName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
      onSaveStaffList([...staffList, newStaff]);
    } else if (editingStaff) {
      const updated = staffList.map((s) =>
        s.id === editingStaff.id
          ? ({
              ...s,
              ...formData,
              name: formData.name!.trim(),
              englishName: formData.englishName?.trim(),
              order: Number(formData.order) || s.order,
            } as Staff)
          : s
      );
      onSaveStaffList(updated);
    }

    setEditingStaff(null);
    setIsAddingNew(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`ยืนยันการลบเจ้าหน้าที่ "${name}" หรือไม่?`)) {
      onSaveStaffList(staffList.filter((s) => s.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="paper-card w-full max-w-4xl my-6 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in">
        
        {/* Header */}
        <div className="bg-[#8B1E27] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#A82B35] rounded-lg">
              <Users className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg">จัดการรายชื่อเจ้าหน้าที่</h3>
              <p className="text-xs text-amber-100/80">
                เพิ่ม ลบ แก้ไขเจ้าหน้าที่ และกำหนดส่วนในตารางเวร (MT / สายสนับสนุน / Part-time)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
            ✕
          </button>
        </div>

        {/* Action Bar */}
        <div className="bg-[#F7F2EA] p-3 sm:p-4 border-b border-[#E5D5C5] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ หรือภาษาอังกฤษ..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-[#D8C7B5] rounded-lg text-stone-800"
            />
          </div>

          {canManage && (
            <button
              onClick={startAdd}
              className="px-3 py-1.5 bg-[#8B1E27] hover:bg-[#721820] text-white text-xs sm:text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              เพิ่มเจ้าหน้าที่ใหม่
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* Add / Edit Form Modal/Drawer */}
          {(isAddingNew || editingStaff) && (
            <form onSubmit={handleSaveForm} className="mb-6 p-4 bg-amber-50/70 border border-amber-300 rounded-xl space-y-3">
              <div className="font-bold text-sm text-[#4A2E18] flex items-center justify-between border-b border-amber-200 pb-2">
                <span>{isAddingNew ? 'เพิ่มเจ้าหน้าที่ใหม่' : `แก้ไขข้อมูล: ${editingStaff?.name}`}</span>
                <button
                  type="button"
                  onClick={() => { setEditingStaff(null); setIsAddingNew(false); }}
                  className="text-stone-500 hover:text-stone-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
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

                <div>
                  <label className="block font-medium text-stone-700 mb-1">สิทธิ์ในระบบ (Role)</label>
                  <select
                    value={formData.role || 'staff'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-md"
                  >
                    <option value="staff">เจ้าหน้าที่ทั่วไป (แก้เฉพาะเวรตนเอง)</option>
                    <option value="sub_admin">ผู้ดูแลระบบย่อย (แก้เวรทุกคนได้)</option>
                    <option value="super_admin">ผู้ดูแลระบบสูงสุด</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">ลำดับการแสดงผล (Order)</label>
                  <input
                    type="number"
                    value={formData.order || 1}
                    onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditingStaff(null); setIsAddingNew(false); }}
                  className="px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-200 rounded-md"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-[#8B1E27] hover:bg-[#721820] text-white rounded-md flex items-center gap-1 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          )}

          {/* Staff Table List */}
          <div className="border border-stone-200 rounded-lg overflow-x-auto bg-white shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#F5EFE6] text-[#4A2E18] font-bold border-b border-stone-200">
                <tr>
                  <th className="p-2.5 text-center w-12">ลำดับ</th>
                  <th className="p-2.5">ชื่อ - สกุล</th>
                  <th className="p-2.5">ชื่อภาษาอังกฤษ</th>
                  <th className="p-2.5 text-center">ตำแหน่ง</th>
                  <th className="p-2.5">ส่วนในตาราง</th>
                  <th className="p-2.5 text-center">สิทธิ์</th>
                  {canManage && <th className="p-2.5 text-center w-24">จัดการ</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((staff) => (
                  <tr key={staff.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="p-2 text-center text-stone-500 font-mono">{staff.order}</td>
                    <td className="p-2 font-medium text-stone-900">{staff.name}</td>
                    <td className="p-2 text-stone-600 italic">{staff.englishName || '-'}</td>
                    <td className="p-2 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 font-bold text-[11px] border border-stone-200">
                        {staff.position}
                      </span>
                    </td>
                    <td className="p-2 text-stone-700">
                      {staff.section === 'MT' ? (
                        <span className="text-amber-800">1. MT</span>
                      ) : staff.section === 'SUPPORT' ? (
                        <span className="text-blue-800">2. สายสนับสนุน</span>
                      ) : (
                        <span className="text-purple-800">3. Part-time</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      {staff.role === 'super_admin' ? (
                        <span className="text-red-700 font-bold">Super Admin</span>
                      ) : staff.role === 'sub_admin' ? (
                        <span className="text-amber-700 font-bold">ผู้ดูแลย่อย</span>
                      ) : (
                        <span className="text-stone-500">ทั่วไป</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => startEdit(staff)}
                            className="p-1 hover:bg-amber-100 text-amber-800 rounded-sm"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(staff.id, staff.name)}
                            className="p-1 hover:bg-red-100 text-red-700 rounded-sm"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
