import React, { useState } from 'react';
import { Staff, CurrentUser } from '../types';
import { SUPER_ADMIN_CREDENTIALS, SUB_ADMIN_DEFAULT_PASSWORD } from '../data/initialData';
import { ShieldCheck, UserCheck, KeyRound, User, Lock, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  currentUser: CurrentUser | null;
  onLoginSuccess: (user: CurrentUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  staffList,
  currentUser,
  onLoginSuccess,
}) => {
  const [tab, setTab] = useState<'super_admin' | 'sub_admin' | 'staff'>('super_admin');
  
  // Super admin credentials
  const [superUsername, setSuperUsername] = useState('alisa');
  const [superPassword, setSuperPassword] = useState('');

  // Sub admin credentials
  const [subStaffId, setSubStaffId] = useState<string>('staff-11');
  const [subPassword, setSubPassword] = useState('');

  // Staff search
  const [searchName, setSearchName] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSuperLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (
      superUsername.trim() === SUPER_ADMIN_CREDENTIALS.username &&
      superPassword.trim() === SUPER_ADMIN_CREDENTIALS.password
    ) {
      const superStaff = staffList.find((s) => s.id === 'staff-1') || staffList[0];
      onLoginSuccess({
        id: 'super-admin-alisa',
        username: 'alisa',
        name: superStaff ? `${superStaff.name} (หัวหน้างาน)` : 'ทนพญ.ณิชาภา เจียมจรรยา (หัวหน้างาน)',
        role: 'super_admin',
        staffId: superStaff?.id,
        mustChangePassword: false,
      });
      onClose();
    } else {
      setError('ชื่อผู้ใช้หรือรหัสผ่านผู้ดูแลระบบสูงสุดไม่ถูกต้อง (alisa / 1450)');
    }
  };

  const handleSubLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const staff = staffList.find((s) => s.id === subStaffId);
    if (!staff) {
      setError('กรุณาเลือกผู้ดูแลระบบย่อย');
      return;
    }

    const expectedPass = staff.password || SUB_ADMIN_DEFAULT_PASSWORD;
    if (subPassword.trim() === expectedPass) {
      const isDefault = subPassword.trim() === SUB_ADMIN_DEFAULT_PASSWORD;
      onLoginSuccess({
        id: `sub-admin-${staff.id}`,
        username: staff.name,
        name: `${staff.name} (ผู้ดูแลระบบย่อย)`,
        role: 'sub_admin',
        staffId: staff.id,
        mustChangePassword: isDefault || !!staff.mustChangePassword,
      });
      onClose();
    } else {
      setError('รหัสผ่านไม่ถูกต้อง (รหัสเริ่มต้นคือ 1234)');
    }
  };

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let matchedStaff: Staff | undefined;
    if (selectedStaffId) {
      matchedStaff = staffList.find((s) => s.id === selectedStaffId);
    } else if (searchName.trim()) {
      const term = searchName.trim().toLowerCase();
      matchedStaff = staffList.find(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          (s.englishName && s.englishName.toLowerCase().includes(term))
      );
    }

    if (matchedStaff) {
      onLoginSuccess({
        id: `staff-${matchedStaff.id}`,
        name: matchedStaff.name,
        role: 'staff',
        staffId: matchedStaff.id,
      });
      onClose();
    } else {
      setError('ไม่พบรายชื่อเจ้าหน้าที่ กรุณาพิมพ์ชื่อภาษาไทยหรืออังกฤษ หรือเลือกจากรายการ');
    }
  };

  const subAdminCandidates = staffList.filter((s) => s.role === 'sub_admin' || s.id === 'staff-11');
  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchName.toLowerCase()) ||
      (s.englishName && s.englishName.toLowerCase().includes(searchName.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="paper-card w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#8B1E27] text-[#FFFDF7] p-5 border-b border-[#6D161C] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#A82B35] rounded-lg">
              <KeyRound className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg">เข้าสู่ระบบการทำงาน</h3>
              <p className="text-xs text-amber-100/80">เวชศาสตร์บริการโลหิต รพ.ธรรมศาสตร์ฯ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-[#E5D5C5] bg-[#F7F2EA] p-1 text-xs sm:text-sm font-medium">
          <button
            type="button"
            onClick={() => { setTab('super_admin'); setError(null); }}
            className={`flex-1 py-2 text-center rounded-md transition-all flex items-center justify-center gap-1.5 ${
              tab === 'super_admin'
                ? 'bg-[#8B1E27] text-white shadow-sm'
                : 'text-[#6D4C41] hover:bg-[#EFE7DC]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            ผู้ดูแลสูงสุด
          </button>
          <button
            type="button"
            onClick={() => { setTab('sub_admin'); setError(null); }}
            className={`flex-1 py-2 text-center rounded-md transition-all flex items-center justify-center gap-1.5 ${
              tab === 'sub_admin'
                ? 'bg-[#8B1E27] text-white shadow-sm'
                : 'text-[#6D4C41] hover:bg-[#EFE7DC]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            ผู้ดูแลระบบย่อย
          </button>
          <button
            type="button"
            onClick={() => { setTab('staff'); setError(null); }}
            className={`flex-1 py-2 text-center rounded-md transition-all flex items-center justify-center gap-1.5 ${
              tab === 'staff'
                ? 'bg-[#8B1E27] text-white shadow-sm'
                : 'text-[#6D4C41] hover:bg-[#EFE7DC]'
            }`}
          >
            <User className="w-4 h-4" />
            เจ้าหน้าที่ทั่วไป
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'super_admin' && (
            <form onSubmit={handleSuperLogin} className="space-y-4">
              <div className="text-xs text-[#7A5B47] mb-2">
                ผู้ดูแลระบบสูงสุดสามารถจัดการได้ทุกส่วนในระบบ เช่น แก้ไขเวรทุกคน จัดเวรอัตโนมัติ เพิ่ม/ลบเจ้าหน้าที่ และแก้ไขราคาค่าเวร
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4A2E18] mb-1">
                  ชื่อผู้ใช้งาน (Username)
                </label>
                <input
                  type="text"
                  value={superUsername}
                  onChange={(e) => setSuperUsername(e.target.value)}
                  placeholder="alisa"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#D8C7B5] bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1E27]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4A2E18] mb-1">
                  รหัสผ่าน (Password)
                </label>
                <input
                  type="password"
                  value={superPassword}
                  onChange={(e) => setSuperPassword(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#D8C7B5] bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1E27]"
                  required
                />
                <p className="text-[11px] text-[#A88B74] mt-1">รหัสเริ่มต้น: 1450</p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#8B1E27] hover:bg-[#721820] text-white rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                เข้าสู่ระบบผู้ดูแลสูงสุด
              </button>
            </form>
          )}

          {tab === 'sub_admin' && (
            <form onSubmit={handleSubLogin} className="space-y-4">
              <div className="text-xs text-[#7A5B47] mb-2">
                ผู้ดูแลระบบย่อยสามารถแก้ไขเวรได้ทุกคน และเพิ่ม/แก้ไขเจ้าหน้าที่ได้ (ใส่รหัสเริ่มต้น 1234 และระบบจะให้เปลี่ยนรหัสผ่านทันที)
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4A2E18] mb-1">
                  เลือกผู้ดูแลระบบย่อย
                </label>
                <select
                  value={subStaffId}
                  onChange={(e) => setSubStaffId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#D8C7B5] bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1E27]"
                >
                  {subAdminCandidates.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.position})
                    </option>
                  ))}
                  {subAdminCandidates.length === 0 && (
                    <option value="staff-11">ทนพญ.ปนัสยา รัสสุรีย์</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4A2E18] mb-1">
                  รหัสผ่าน (เข้าใช้งานครั้งแรก: 1234)
                </label>
                <input
                  type="password"
                  value={subPassword}
                  onChange={(e) => setSubPassword(e.target.value)}
                  placeholder="1234"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#D8C7B5] bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1E27]"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#8B1E27] hover:bg-[#721820] text-white rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                เข้าสู่ระบบผู้ดูแลระบบย่อย
              </button>
            </form>
          )}

          {tab === 'staff' && (
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div className="text-xs text-[#7A5B47] mb-2">
                เจ้าหน้าที่ทั่วไปสามารถพิมพ์ชื่อภาษาไทย หรือ ภาษาอังกฤษ เพื่อเข้าใช้งานและแก้ไขเวรเฉพาะของตนเองได้
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4A2E18] mb-1">
                  ค้นหาชื่อภาษาไทย หรือ ภาษาอังกฤษ
                </label>
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => {
                    setSearchName(e.target.value);
                    setSelectedStaffId('');
                  }}
                  placeholder="เช่น ณิชาภา, นิชาภา, Nichapa, สิริยากร..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#D8C7B5] bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1E27]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A2E18] mb-1">
                  หรือเลือกจากรายชื่อ ({filteredStaff.length} คน)
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#D8C7B5] bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1E27] max-h-32"
                >
                  <option value="">-- เลือกเจ้าหน้าที่จากรายการ --</option>
                  {filteredStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.order}. {s.name} ({s.position})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#6D4C41] hover:bg-[#58392F] text-white rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                เข้าใช้งานในฐานะเจ้าหน้าที่
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
