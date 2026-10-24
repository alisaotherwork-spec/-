import React, { useState } from 'react';
import { Staff, CurrentUser } from '../types';
import { SUPER_ADMIN_CREDENTIALS, SUB_ADMIN_DEFAULT_PASSWORD } from '../data/initialData';
import { Lock, User, AlertCircle, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { SolarSystemBackground } from './SolarSystemBackground';

interface LoginViewProps {
  staffList: Staff[];
  onLoginSuccess: (user: CurrentUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ staffList, onLoginSuccess }) => {
  const [usernameOrName, setUsernameOrName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const inputUser = usernameOrName.trim();
    const inputPass = password.trim();

    if (!inputUser || !inputPass) {
      setError('กรุณากรอกชื่อผู้ใช้งาน/ชื่อ-สกุล และรหัสผ่าน');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // 1. Check Super Admin (alisa)
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
        setIsLoading(false);
        return;
      }

      // 2. Search staff by Name (Thai or English) or ID
      const query = inputUser.toLowerCase();
      const matchedStaff = staffList.find((s) => {
        const thaiName = s.name.toLowerCase();
        const engName = s.englishName ? s.englishName.toLowerCase() : '';
        // Match exact or contains key name tokens
        return (
          thaiName === query ||
          engName === query ||
          thaiName.includes(query) ||
          (engName && engName.includes(query)) ||
          s.id.toLowerCase() === query
        );
      });

      if (matchedStaff) {
        // Expected password (either staff's custom password or default 1234)
        const expectedPass = matchedStaff.password || SUB_ADMIN_DEFAULT_PASSWORD;

        if (inputPass === expectedPass) {
          // If this is Nichapa (staff-1), role is explicitly 'head' (หัวหน้าห้อง / หัวหน้างาน)
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
          setIsLoading(false);
          return;
        }
      }

      // Invalid credentials
      setError('ชื่อผู้ใช้งาน หรือ รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง');
      setIsLoading(false);
    }, 250);
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden selection:bg-[#8B1E27] selection:text-white font-sans flex items-center justify-center p-4">
      {/* Background Solar System Papercut */}
      <SolarSystemBackground />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md paper-card overflow-hidden shadow-2xl border-2 border-[#D4AF37]/60 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Card Header with Hospital Identity */}
        <div 
          className="p-6 text-white text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #6B1218 0%, #8B1E27 50%, #5E1015 100%)',
          }}
        >
          {/* Subtle paper decorative ring */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full border border-amber-300/20 bg-amber-500/5 pointer-events-none" />
          
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#FFFDF7] p-2.5 items-center justify-center shadow-lg border-2 border-[#D4AF37] mb-3">
            <span className="font-heading font-black text-[#8B1E27] text-2xl">TUH</span>
          </div>

          <h2 className="text-lg font-bold font-heading text-white tracking-tight">
            งานเวชศาสตร์บริการโลหิต
          </h2>
          <p className="text-xs text-amber-200/90 font-medium">
            โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
          </p>
          <div className="mt-2 inline-block px-3 py-0.5 rounded-full bg-black/25 border border-amber-400/30 text-[11px] text-amber-100">
            ระบบตารางเวรและการปฏิบัติงาน (Duty Scheduling)
          </div>
        </div>

        {/* Login Form Body */}
        <div className="p-6 sm:p-8 bg-[#FFFDF7]">
          <div className="mb-5 text-center">
            <h3 className="text-base font-bold text-[#4A2E18] font-heading">
              เข้าสู่ระบบก่อนเข้าใช้งาน
            </h3>
            <p className="text-xs text-[#7A5B47] mt-1">
              กรุณากรอกชื่อผู้ใช้งาน หรือ ชื่อ-สกุล และรหัสผ่านเพื่อเข้าสู่ระบบ
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Username / Name Input (Typed manually, NO dropdown list) */}
            <div>
              <label className="block text-xs font-semibold text-[#4A2E18] mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#8B1E27]" />
                <span>ชื่อผู้ใช้งาน หรือ ชื่อ - นามสกุล *</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={usernameOrName}
                  onChange={(e) => {
                    setUsernameOrName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="พิมพ์ชื่อผู้ใช้ หรือ ชื่อ-สกุล (ไทย / อังกฤษ)"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#D8C7B5] bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#8B1E27] focus:border-[#8B1E27] transition-all shadow-xs"
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
              <p className="text-[10px] text-stone-500 mt-1">
                เช่น alisa, ณิชาภา, นิชาภา, Nichapa, ปนัสยา, สิริยากร...
              </p>
            </div>

            {/* Masked Password Input (No password reveal, strictly type="password") */}
            <div>
              <label className="block text-xs font-semibold text-[#4A2E18] mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#8B1E27]" />
                <span>รหัสผ่าน (Password) *</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#D8C7B5] bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#8B1E27] focus:border-[#8B1E27] transition-all shadow-xs"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-[#8B1E27] hover:bg-[#721820] text-white rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>เข้าสู่ระบบ</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* System Roles Note */}
          <div className="mt-6 pt-4 border-t border-[#E5D5C5] text-center text-[11px] text-[#7A5B47] space-y-1">
            <p className="font-semibold text-[#4A2E18]">
              งานเวชศาสตร์บริการโลหิต • รพ.ธรรมศาสตร์เฉลิมพระเกียรติ
            </p>
            <p className="text-stone-500 text-[10px]">
              หัวหน้างานเวชศาสตร์บริการโลหิต: ทนพญ.ณิชาภา เจียมจรรยา
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
