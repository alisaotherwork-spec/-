import React, { useState } from 'react';
import { CurrentUser, RoomType } from '../types';
import { THAI_MONTHS } from '../utils/scheduler';
import { EXTERNAL_LINKS } from '../data/initialData';
import {
  Calendar,
  Sparkles,
  Printer,
  FileSpreadsheet,
  FileText,
  Users,
  Coins,
  Database,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  ShieldCheck,
  Building2,
  Clock,
  Layers,
  UserCheck,
  UserX,
} from 'lucide-react';

interface HeaderProps {
  year: number;
  month: number;
  room: RoomType | 'all';
  currentUser: CurrentUser | null;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onRoomChange: (room: RoomType | 'all') => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenDailySummary: () => void;
  onOpenOtClaim: () => void;
  onOpenPrintSchedule: () => void;
  onDownloadExcelSchedule: () => void;
  onOpenStaffModal: () => void;
  onOpenShiftRatesModal: () => void;
  onRunAutoSchedule: () => void;
  onRunAutoScheduleB: () => void;
  onOpenAutoScheduleModal: () => void;
  onOpenBackupModal: () => void;
  activeFilter?: 'active' | 'all' | 'inactive';
  onActiveFilterChange?: (filter: 'active' | 'all' | 'inactive') => void;
}

export const Header: React.FC<HeaderProps> = ({
  year,
  month,
  room,
  currentUser,
  onYearChange,
  onMonthChange,
  onRoomChange,
  onOpenLogin,
  onLogout,
  onOpenDailySummary,
  onOpenOtClaim,
  onOpenPrintSchedule,
  onDownloadExcelSchedule,
  onOpenStaffModal,
  onOpenShiftRatesModal,
  onRunAutoSchedule,
  onRunAutoScheduleB,
  onOpenAutoScheduleModal,
  onOpenBackupModal,
  activeFilter = 'active',
  onActiveFilterChange,
}) => {
  const thaiYear = year + 543;
  const monthName = THAI_MONTHS[month - 1];

  const handlePrevMonth = () => {
    if (month === 1) {
      onMonthChange(12);
      onYearChange(year - 1);
    } else {
      onMonthChange(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onMonthChange(1);
      onYearChange(year + 1);
    } else {
      onMonthChange(month + 1);
    }
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isHead = currentUser?.role === 'head';
  const isSubAdmin = currentUser?.role === 'sub_admin';
  const canManage = isSuperAdmin || isHead || isSubAdmin;

  return (
    <header className="relative z-10 w-full mb-6 no-print">
      {/* Top Banner / Hospital Identity in Papercut Burgundy */}
      <div 
        className="text-white p-4 sm:p-5 rounded-2xl border-2 border-[#D4AF37]/70 shadow-2xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, #6B1218 0%, #8B1E27 50%, #5E1015 100%)',
          boxShadow: '0 10px 25px -5px rgba(44, 24, 16, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
        }}
      >
        
        {/* Decorative Papercut Craft Elements */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full border border-amber-300/20 bg-amber-500/5 pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full border border-dashed border-amber-300/15 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title and Hospital Logo/Badge */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#FFFDF7] p-2 flex items-center justify-center shadow-md border-2 border-[#D4AF37] shrink-0">
              <span className="font-heading font-black text-[#8B1E27] text-xl">TUH</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-200 bg-black/25 px-2 py-0.5 rounded-full border border-amber-400/30">
                  ระบบตารางเวรและการปฏิบัติงาน
                </span>
                <span className="text-[11px] text-amber-200/90 hidden sm:inline">
                  Thammasat University Hospital
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-white tracking-tight mt-0.5 drop-shadow-xs">
                งานเวชศาสตร์บริการโลหิต โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
              </h1>
            </div>
          </div>

          {/* User Status / Login Controls */}
          <div className="flex items-center gap-2 self-end lg:self-center">
            {currentUser ? (
              <div className="flex items-center gap-2 bg-black/30 border border-amber-300/30 rounded-xl p-1.5 px-3">
                <div className="text-right">
                  <div className="text-xs font-bold text-amber-100 flex items-center justify-end gap-1">
                    {currentUser.role === 'super_admin' && (
                      <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-xs text-[10px] font-bold">
                        Super Admin
                      </span>
                    )}
                    {currentUser.role === 'head' && (
                      <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded-xs text-[10px] font-bold">
                        หัวหน้าห้อง
                      </span>
                    )}
                    {currentUser.role === 'sub_admin' && (
                      <span className="px-1.5 py-0.2 bg-amber-500 text-stone-950 rounded-xs text-[10px] font-bold">
                        ผู้ดูแลย่อย
                      </span>
                    )}
                    {currentUser.role === 'staff' && (
                      <span className="px-1.5 py-0.2 bg-stone-200 text-stone-800 rounded-xs text-[10px] font-bold">
                        เจ้าหน้าที่
                      </span>
                    )}
                    <span>{currentUser.name}</span>
                  </div>
                  <span className="text-[10px] text-stone-300">
                    {currentUser.role === 'staff' ? 'แก้ไขเฉพาะเวรตนเอง' : 'แก้ไขเวรได้ทุกคน'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-md transition-all hover:scale-[1.02] cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                เข้าสู่ระบบ (alisa / เจ้าหน้าที่)
              </button>
            )}
          </div>
        </div>

        {/* Room Switcher Tabs & External Sync Quick-links */}
        <div className="mt-4 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
          
          {/* Room Selector: ห้องปฏิบัติการ vs ห้องบริจาคโลหิต */}
          <div className="flex items-center gap-1.5 bg-black/25 p-1 rounded-xl border border-white/15">
            <button
              type="button"
              onClick={() => onRoomChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                room === 'all'
                  ? 'bg-[#FFFDF7] text-[#8B1E27] shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              รวมทุกห้อง
            </button>
            <button
              type="button"
              onClick={() => onRoomChange('lab')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                room === 'lab'
                  ? 'bg-[#FFFDF7] text-[#8B1E27] shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              ห้องปฏิบัติการ (Lab)
            </button>
            <button
              type="button"
              onClick={() => onRoomChange('donation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                room === 'donation'
                  ? 'bg-[#FFFDF7] text-[#8B1E27] shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              ห้องบริจาคโลหิต (Donation)
            </button>
          </div>

          {/* Cloud Storage and Backup Quick Access */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={onOpenBackupModal}
              className="px-2.5 py-1.5 bg-black/30 hover:bg-black/50 text-amber-200 border border-amber-300/30 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Firebase & Google Drive / Sheet Storage Manager"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Duty schedule-TM</span>
            </button>
            <a
              href={EXTERNAL_LINKS.googleDrive}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-1 transition-colors"
              title="เปิดโฟลเดอร์ ตารางเวร ใน Google Drive"
            >
              <span>Drive: ตารางเวร</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
            <a
              href={EXTERNAL_LINKS.googleSheets}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-1 transition-colors"
              title="เปิด Google Sheets ตารางเวร"
            >
              <span>Google ชีต</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
        </div>
      </div>

      {/* Sub Header: Month/Year Navigator & Action Buttons */}
      <div className="mt-3 paper-card bg-[#FFFDF7] p-3 sm:p-4 rounded-xl border border-[#D8C7B5] shadow-md flex flex-wrap items-center justify-between gap-3">
        
        {/* Month & Year Stepper */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 bg-[#F5EFE6] hover:bg-[#EAE0D3] border border-[#D8C7B5] rounded-lg text-[#4A2E18] transition-colors cursor-pointer"
            title="เดือนก่อนหน้า"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 bg-[#F5EFE6] border border-[#D8C7B5] rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-[#8B1E27]" />
            <select
              value={month}
              onChange={(e) => onMonthChange(Number(e.target.value))}
              className="bg-transparent font-heading font-bold text-sm text-[#4A2E18] focus:outline-none cursor-pointer"
            >
              {THAI_MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>

            <span className="text-[#A88B74] font-medium">พ.ศ.</span>
            <select
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="bg-transparent font-heading font-bold text-sm text-[#4A2E18] focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 11 }, (_, i) => year - 5 + i).map((y) => (
                <option key={y} value={y}>
                  {y + 543} ({y})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 bg-[#F5EFE6] hover:bg-[#EAE0D3] border border-[#D8C7B5] rounded-lg text-[#4A2E18] transition-colors cursor-pointer"
            title="เดือนถัดไป"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Active Status Filter Option for Duty Table */}
          {onActiveFilterChange && (
            <div className="flex items-center gap-1.5 bg-[#F5EFE6] border border-[#D8C7B5] rounded-lg px-2.5 py-1.5 shadow-2xs">
              <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="text-xs font-semibold text-[#4A2E18]">ตัวเลือกแสดงชื่อ:</span>
              <select
                value={activeFilter}
                onChange={(e) => onActiveFilterChange(e.target.value as 'active' | 'all' | 'inactive')}
                className="bg-transparent font-bold text-xs text-stone-900 focus:outline-none cursor-pointer"
                title="เลือกแสดงชื่อเจ้าหน้าที่ในตารางเวรตามสถานะ Active"
              >
                <option value="active">🟢 เฉพาะ Active (กำลังปฏิบัติงาน)</option>
                <option value="all">👥 แสดงทั้งหมด (รวม Inactive)</option>
                <option value="inactive">⚪ เฉพาะ Inactive (พักงาน)</option>
              </select>
            </div>
          )}
        </div>

        {/* Action Button Strip */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Scheduler buttons */}
          {canManage && (
            <>
              <button
                type="button"
                onClick={onOpenAutoScheduleModal}
                className="px-3 py-1.5 bg-[#8B1E27] hover:bg-[#721820] text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.02] cursor-pointer ring-1 ring-amber-400"
                title="จัดเวรอัตโนมัติทุกเวรที่มี โดยสามารถเลือกหลายเวรพร้อมกัน"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>⚡ จัดเวรอัตโนมัติ (เลือกหลายเวร)</span>
              </button>

              <button
                type="button"
                onClick={onRunAutoSchedule}
                className="px-2.5 py-1.5 bg-[#FAF6F0] hover:bg-[#EFE7DC] border border-[#D8C7B5] text-[#8B1E27] font-medium text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                title="จัดเวร บด อัตโนมัติ วน 1 ถึง 14 วันละ 1 คนตลอดทั้งเดือน"
              >
                <span>จัดเวร บด</span>
              </button>

              <button
                type="button"
                onClick={onRunAutoScheduleB}
                className="px-2.5 py-1.5 bg-[#FAF6F0] hover:bg-[#EFE7DC] border border-[#D8C7B5] text-[#92400E] font-medium text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                title="จัดเวร บ อัตโนมัติ วน 1 ถึง 14 วันละ 1 คนตลอดทั้งเดือน"
              >
                <span>จัดเวร บ</span>
              </button>
            </>
          )}

          {/* Daily Summary Button */}
          <button
            type="button"
            onClick={onOpenDailySummary}
            className="px-3 py-1.5 bg-[#4A2E18] hover:bg-[#382212] text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="ใบสรุปเวรประจำวัน (ช่องสีขาว/ช่องสีเทา)"
          >
            <FileText className="w-3.5 h-3.5 text-amber-300" />
            <span>ใบสรุปเวรประจำวัน</span>
          </button>

          {/* OT Claim Button */}
          <button
            type="button"
            onClick={onOpenOtClaim}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="ใบเบิกเงินค่าตอบแทน OT (Excel / PDF A4 แนวตั้ง)"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-200" />
            <span>ใบเบิกค่าตอบแทน OT</span>
          </button>

          {/* Print Schedule A4 Landscape */}
          <button
            type="button"
            onClick={onOpenPrintSchedule}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="ดาวน์โหลดตารางเวรเป็น PDF ขนาด A4 แนวนอน"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF ตารางเวร</span>
          </button>

          {/* Download Excel Schedule */}
          <button
            type="button"
            onClick={onDownloadExcelSchedule}
            className="px-3 py-1.5 bg-[#FAF6F0] hover:bg-[#EFE7DC] border border-[#D8C7B5] text-[#4A2E18] font-medium text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            title="ส่งออกตารางเวรเป็นไฟล์ Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Excel ตารางเวร</span>
          </button>

          {/* Staff Roster Button */}
          {canManage && (
            <button
              type="button"
              onClick={onOpenStaffModal}
              className="px-2.5 py-1.5 bg-[#FAF6F0] hover:bg-[#EFE7DC] border border-[#D8C7B5] text-[#4A2E18] font-medium text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              title="เพิ่ม ลบ แก้ไขเจ้าหน้าที่"
            >
              <Users className="w-3.5 h-3.5 text-stone-600" />
              <span>เจ้าหน้าที่</span>
            </button>
          )}

          {/* Shift Rates Button */}
          {canManage && (
            <button
              type="button"
              onClick={onOpenShiftRatesModal}
              className="px-2.5 py-1.5 bg-[#FAF6F0] hover:bg-[#EFE7DC] border border-[#D8C7B5] text-[#4A2E18] font-medium text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              title="กำหนดรหัสเวรและอัตราค่าตอบแทน"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span>รหัสเวร & ราคา</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
