import React, { useState } from 'react';
import { CurrentUser, Staff } from '../types';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  currentUser: CurrentUser | null;
  staffList: Staff[];
  onPasswordChanged: (staffId: string, newPassword: string) => void;
  onCancel?: () => void;
  isMandatory?: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  currentUser,
  staffList,
  onPasswordChanged,
  onCancel,
  isMandatory = false,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 4) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }

    if (newPassword === '1234') {
      setError('กรุณาตั้งรหัสผ่านใหม่ที่ไม่ใช่รหัสผ่านเริ่มต้น 1234');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    if (currentUser.staffId) {
      onPasswordChanged(currentUser.staffId, newPassword);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="paper-card w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-[#8B1E27] text-white p-5 border-b border-[#6D161C] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#A82B35] rounded-lg">
              <Lock className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg">เปลี่ยนรหัสผ่านใหม่</h3>
              <p className="text-xs text-amber-100/80">
                {isMandatory ? 'ข้อกำหนด: ต้องเปลี่ยนรหัสผ่านในการใช้งานครั้งแรก' : 'ตั้งค่ารหัสผ่านใหม่'}
              </p>
            </div>
          </div>
          {!isMandatory && onCancel && (
            <button onClick={onCancel} className="text-white/80 hover:text-white">✕</button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
            ผู้ดูแลระบบย่อยที่ใช้รหัสเริ่มต้น <strong className="font-semibold text-red-700">1234</strong> ต้องกำหนดรหัสผ่านใหม่เพื่อความปลอดภัยในการเข้าถึงข้อมูล
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#4A2E18] mb-1">
              รหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#D8C7B5] bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1E27]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A2E18] mb-1">
              ยืนยันรหัสผ่านใหม่อีกครั้ง
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#D8C7B5] bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1E27]"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#8B1E27] hover:bg-[#721820] text-white rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              บันทึกรหัสผ่านใหม่และดำเนินการต่อ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
