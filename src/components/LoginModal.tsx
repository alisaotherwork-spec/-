import React, { useState } from 'react';
import { Staff, CurrentUser } from '../types';
import { SUPER_ADMIN_CREDENTIALS, SUB_ADMIN_DEFAULT_PASSWORD } from '../data/initialData';
import { KeyRound, User, Lock, AlertCircle, ArrowRight } from 'lucide-react';

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
  const [usernameOrName, setUsernameOrName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const inputUser = usernameOrName.trim();
    const inputPass = password.trim();

    if (!inputUser || !inputPass) {
      setError('กรุณากรอกชื่อผู้ใช้งาน หรือ ชื่อ-สกุล และรหัสผ่าน');
      return;
    }

    // 1. Super Admin
    if (
      inputUser.toLowerCase() === SUPER_ADMIN_CREDENTIALS.username.toLowerCase() &&
      inputPass === SUPER_ADMIN_CREDENTIALS.password
    ) {
      const superStaff = staffList.find((s) => s.role === 'super_admin') || {
        id: 'staff-super',
        name: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
      };
      onLoginSuccess({
        id: 'super-admin-alisa',
        username: 'alisa',
        name: superStaff.name,
        role: 'super_admin',
        staffId: superStaff.id,
        mustChangePassword: false,
      });
      onClose();
      return;
    }

    // 2. Search staff by Name or ID
    const query = inputUser.toLowerCase();
    const matchedStaff = staffList.find((s) => {
      const thaiName = s.name.toLowerCase();
      const engName = s.englishName ? s.englishName.toLowerCase() : '';
      return (
        thaiName === query ||
        engName === query ||
        thaiName.includes(query) ||
        (engName && engName.includes(query)) ||
        s.id.toLowerCase() === query
      );
    });

    if (matchedStaff) {
      const expectedPass = matchedStaff.password || SUB_ADMIN_DEFAULT_PASSWORD;
      if (inputPass === expectedPass) {
        const role = matchedStaff.id === 'staff-1' ? 'head' : matchedStaff.role;
        onLoginSuccess({
          id: `user-${matchedStaff.id}`,
          username: matchedStaff.englishName || matchedStaff.name,
          name: matchedStaff.name,
          role,
          staffId: matchedStaff.id,
          mustChangePassword:
            (role === 'sub_admin' || role === 'head') &&
            inputPass === SUB_ADMIN_DEFAULT_PASSWORD &&
            matchedStaff.mustChangePassword,
        });
        onClose();
        return;
      }
    }

    setError('ชื่อผู้ใช้งาน หรือ รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง');
  };

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
              <h3 className="font-heading font-semibold text-lg">เข้าสู่ระบบ / สลับบัญชี</h3>
              <p className="text-xs text-amber-100/80">เวชศาสตร์บริการโลหิต รพ.ธรรมศาสตร์ฯ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            ✕
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#4A2E18] mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#8B1E27]" />
                <span>ชื่อผู้ใช้งาน หรือ ชื่อ - นามสกุล *</span>
              </label>
              <input
                type="text"
                value={usernameOrName}
                onChange={(e) => setUsernameOrName(e.target.value)}
                placeholder="พิมพ์ชื่อผู้ใช้ หรือ ชื่อ-สกุล (ไทย / อังกฤษ)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#D8C7B5] bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#8B1E27]"
                required
                autoFocus
              />
              <p className="text-[11px] text-[#A88B74] mt-1">
                เช่น alisa, ณิชาภา, Nichapa, ปนัสยา, สิริยากร...
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A2E18] mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#8B1E27]" />
                <span>รหัสผ่าน *</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#D8C7B5] bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#8B1E27]"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#8B1E27] hover:bg-[#721820] text-white rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>เข้าสู่ระบบ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
