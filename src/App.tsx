/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Staff, ShiftDefinition, CurrentUser, RoomType, MonthlyStaffSummary } from './types';
import {
  loadStaffList,
  saveStaffList,
  loadShiftDefs,
  saveShiftDefs,
  loadMonthSchedule,
  saveMonthSchedule,
  loadCurrentUser,
  saveCurrentUser,
  initializeFirestoreSync,
} from './utils/storage';
import { getDaysInMonth, generateAutoSchedule, THAI_MONTHS } from './utils/scheduler';
import { calculateAllStaffMonthlySummaries } from './utils/calculator';
import { exportDutyScheduleToExcel } from './utils/exportExcel';

import { SolarSystemBackground } from './components/SolarSystemBackground';
import { Header } from './components/Header';
import { DutyTable } from './components/DutyTable';
import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { DailySummaryModal } from './components/DailySummaryModal';
import { OtClaimModal } from './components/OtClaimModal';
import { PrintScheduleModal } from './components/PrintScheduleModal';
import { StaffManagementModal } from './components/StaffManagementModal';
import { ShiftRatesModal } from './components/ShiftRatesModal';
import { BackupModal } from './components/BackupModal';

export default function App() {
  // Current date state (Year & Month)
  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(10);
  const [room, setRoom] = useState<RoomType | 'all'>('all');

  // Loaded data
  const [staffList, setStaffList] = useState<Staff[]>(() => loadStaffList());
  const [shiftDefs, setShiftDefs] = useState<ShiftDefinition[]>(() => loadShiftDefs());
  const [shiftsMap, setShiftsMap] = useState<Record<string, string>>({});
  const [roomAssignments, setRoomAssignments] = useState<Record<string, RoomType>>({});
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => loadCurrentUser());

  // Modals
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isDailySummaryOpen, setIsDailySummaryOpen] = useState(false);
  const [isOtClaimOpen, setIsOtClaimOpen] = useState(false);
  const [isPrintScheduleOpen, setIsPrintScheduleOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isShiftRatesModalOpen, setIsShiftRatesModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Notification Banner
  const [notification, setNotification] = useState<string | null>(null);

  // Days in selected month
  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);

  // Boot Firestore sync on initial mount
  useEffect(() => {
    initializeFirestoreSync().then((res) => {
      if (res.connected) {
        setStaffList(loadStaffList());
        setShiftDefs(loadShiftDefs());
      }
    });
  }, []);

  // Load schedule whenever year, month, or room changes
  useEffect(() => {
    const data = loadMonthSchedule(year, month, room);
    
    // If the month schedule is completely empty on first load, seed with standard cascading schedule for MTs
    if (Object.keys(data.shifts).length === 0) {
      const seeded = generateAutoSchedule({
        mtStaffList: staffList,
        daysInMonth: getDaysInMonth(year, month),
        shiftCode: 'บด',
      });
      setShiftsMap(seeded);
      setRoomAssignments(data.roomAssignments);
      saveMonthSchedule(year, month, room, seeded, data.roomAssignments);
    } else {
      setShiftsMap(data.shifts);
      setRoomAssignments(data.roomAssignments);
    }
  }, [year, month, room]);

  const showToast = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification((curr) => (curr === message ? null : curr));
    }, 4000);
  };

  // Filter staff based on room selection
  const filteredStaff = useMemo(() => {
    if (room === 'all') return staffList;
    return staffList.filter((s) => s.defaultRoom === 'both' || s.defaultRoom === room || !s.defaultRoom);
  }, [staffList, room]);

  // Calculate monthly summaries
  const summaries = useMemo(() => {
    return calculateAllStaffMonthlySummaries(staffList, daysInMonth, shiftsMap, shiftDefs);
  }, [staffList, daysInMonth, shiftsMap, shiftDefs]);

  // Handle single shift cell update
  const handleUpdateShift = (staffId: string, day: number, newCode: string) => {
    const updated = { ...shiftsMap };
    const key = `${staffId}_${day}`;
    if (!newCode || newCode.trim() === '') {
      delete updated[key];
    } else {
      updated[key] = newCode.trim();
    }
    setShiftsMap(updated);
    saveMonthSchedule(year, month, room, updated, roomAssignments);
  };

  // Run auto-scheduler according to exact rule:
  // Run auto-scheduler according to exact rule:
  // Cascades 1 to 14, assigns 'บด', day 15 returns to 1, non-duty days are 100% empty blanks
  const handleRunAutoSchedule = () => {
    const newShifts = generateAutoSchedule({
      mtStaffList: staffList,
      daysInMonth,
      shiftCode: 'บด',
      existingShifts: shiftsMap,
      preserveExisting: false,
    });

    setShiftsMap(newShifts);
    saveMonthSchedule(year, month, room, newShifts, roomAssignments);
    showToast(
      `จัดเวร บด อัตโนมัติสำหรับนักเทคนิคการแพทย์ (MT) สำเร็จแล้ว: วนลำดับ 1 ถึง 14 วันละ 1 คนตลอดทั้งเดือน ${THAI_MONTHS[month - 1]} พ.ศ. ${year + 543}`
    );
  };

  // Run auto-scheduler for shift 'บ' with identical conditions:
  // Cascades 1 to 14, assigns 'บ', day 15 returns to 1, non-duty days are 100% empty blanks
  const handleRunAutoScheduleB = () => {
    const newShifts = generateAutoSchedule({
      mtStaffList: staffList,
      daysInMonth,
      shiftCode: 'บ',
      existingShifts: shiftsMap,
      preserveExisting: false,
    });

    setShiftsMap(newShifts);
    saveMonthSchedule(year, month, room, newShifts, roomAssignments);
    showToast(
      `จัดเวร บ อัตโนมัติสำหรับนักเทคนิคการแพทย์ (MT) สำเร็จแล้ว: วนลำดับ 1 ถึง 14 วันละ 1 คนตลอดทั้งเดือน ${THAI_MONTHS[month - 1]} พ.ศ. ${year + 543}`
    );
  };

  // Save updated staff list
  const handleSaveStaffList = (newStaffList: Staff[]) => {
    setStaffList(newStaffList);
    saveStaffList(newStaffList);
    showToast('บันทึกรายชื่อเจ้าหน้าที่เรียบร้อยแล้ว');
  };

  // Save updated shift defs
  const handleSaveShiftDefs = (newDefs: ShiftDefinition[]) => {
    setShiftDefs(newDefs);
    saveShiftDefs(newDefs);
    showToast('บันทึกรหัสเวรและอัตราค่าตอบแทนเรียบร้อยแล้ว');
  };

  // Handle sub-admin password change
  const handlePasswordChanged = (staffId: string, newPass: string) => {
    const updatedStaff = staffList.map((s) =>
      s.id === staffId ? { ...s, password: newPass, mustChangePassword: false } : s
    );
    setStaffList(updatedStaff);
    saveStaffList(updatedStaff);

    if (currentUser) {
      const updatedUser: CurrentUser = {
        ...currentUser,
        mustChangePassword: false,
      };
      setCurrentUser(updatedUser);
      saveCurrentUser(updatedUser);
    }

    showToast('เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    saveCurrentUser(null);
    showToast('ออกจากระบบแล้ว');
  };

  const handleDownloadExcelSchedule = () => {
    exportDutyScheduleToExcel(year, month, room, staffList, daysInMonth, shiftsMap, summaries);
    showToast('ส่งออกตารางเวรเป็นไฟล์ Excel (.xlsx) สำเร็จ');
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden selection:bg-[#8B1E27] selection:text-white font-sans">
      {/* Background Solar System Papercut */}
      <SolarSystemBackground />

      {/* Main Container */}
      <div className="relative z-10 max-w-[1720px] mx-auto px-2 sm:px-4 py-4 sm:py-6 flex flex-col min-h-screen">
        
        {/* Toast Notification */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 bg-[#8B1E27] text-white px-4 py-3 rounded-xl shadow-2xl border border-amber-300/40 text-xs sm:text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-4 duration-200">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{notification}</span>
          </div>
        )}

        {/* Top Header */}
        <Header
          year={year}
          month={month}
          room={room}
          currentUser={currentUser}
          onYearChange={setYear}
          onMonthChange={setMonth}
          onRoomChange={setRoom}
          onOpenLogin={() => setIsLoginOpen(true)}
          onLogout={handleLogout}
          onOpenDailySummary={() => setIsDailySummaryOpen(true)}
          onOpenOtClaim={() => setIsOtClaimOpen(true)}
          onOpenPrintSchedule={() => setIsPrintScheduleOpen(true)}
          onDownloadExcelSchedule={handleDownloadExcelSchedule}
          onOpenStaffModal={() => setIsStaffModalOpen(true)}
          onOpenShiftRatesModal={() => setIsShiftRatesModalOpen(true)}
          onRunAutoSchedule={handleRunAutoSchedule}
          onRunAutoScheduleB={handleRunAutoScheduleB}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
        />

        {/* Schedule Board Table */}
        <main className="flex-1 w-full">
          <DutyTable
            year={year}
            month={month}
            daysInMonth={daysInMonth}
            room={room}
            staffList={filteredStaff}
            shiftsMap={shiftsMap}
            shiftDefs={shiftDefs}
            summaries={summaries}
            currentUser={currentUser}
            onUpdateShift={handleUpdateShift}
            onRunAutoSchedule={handleRunAutoSchedule}
            onRunAutoScheduleB={handleRunAutoScheduleB}
          />
        </main>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-amber-100/70 py-4 border-t border-amber-900/30 no-print flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            งานเวชศาสตร์บริการโลหิต โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ • โครงการ Firebase: duty-schedule-tm
          </div>
          <div className="flex items-center gap-3">
            <span>หัวหน้างานเวชศาสตร์บริการโลหิต: ทนพญ.ณิชาภา เจียมจรรยา</span>
            <span>•</span>
            <span className="text-amber-300 font-medium">ธีม Papercut Solar System</span>
          </div>
        </footer>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        staffList={staffList}
        currentUser={currentUser}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          saveCurrentUser(user);
          showToast(`ยินดีต้อนรับ: ${user.name}`);
        }}
      />

      {/* Mandatory Password Change for Sub Admin on first login with 1234 */}
      <ChangePasswordModal
        isOpen={!!currentUser?.mustChangePassword}
        currentUser={currentUser}
        staffList={staffList}
        onPasswordChanged={handlePasswordChanged}
        isMandatory={true}
      />

      {/* Daily Shift Summary Modal (ใบสรุปเวรประจำวัน - ช่องขาว/ช่องเทา) */}
      <DailySummaryModal
        isOpen={isDailySummaryOpen}
        onClose={() => setIsDailySummaryOpen(false)}
        year={year}
        month={month}
        daysInMonth={daysInMonth}
        room={room}
        staffList={filteredStaff}
        shiftsMap={shiftsMap}
        shiftDefs={shiftDefs}
      />

      {/* OT Claim Sheet Modal (ใบเบิกเงินค่าตอบแทน OT) */}
      <OtClaimModal
        isOpen={isOtClaimOpen}
        onClose={() => setIsOtClaimOpen(false)}
        year={year}
        month={month}
        daysInMonth={daysInMonth}
        room={room}
        staffList={filteredStaff}
        shiftsMap={shiftsMap}
        shiftDefs={shiftDefs}
        summaries={summaries}
      />

      {/* Print Schedule Modal (PDF A4 Landscape) */}
      <PrintScheduleModal
        isOpen={isPrintScheduleOpen}
        onClose={() => setIsPrintScheduleOpen(false)}
        year={year}
        month={month}
        daysInMonth={daysInMonth}
        room={room}
        staffList={filteredStaff}
        shiftsMap={shiftsMap}
        shiftDefs={shiftDefs}
        summaries={summaries}
      />

      {/* Staff Management Modal */}
      <StaffManagementModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staffList={staffList}
        onSaveStaffList={handleSaveStaffList}
        canManage={currentUser?.role === 'super_admin' || currentUser?.role === 'sub_admin'}
      />

      {/* Shift Codes & Rates Modal */}
      <ShiftRatesModal
        isOpen={isShiftRatesModalOpen}
        onClose={() => setIsShiftRatesModalOpen(false)}
        shiftDefs={shiftDefs}
        onSaveShiftDefs={handleSaveShiftDefs}
        canEdit={currentUser?.role === 'super_admin' || currentUser?.role === 'sub_admin'}
      />

      {/* Backup and Cloud Sync Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        year={year}
        month={month}
        room={room}
        shiftsMap={shiftsMap}
        roomAssignments={roomAssignments}
        onDataRestored={() => {
          setStaffList(loadStaffList());
          setShiftDefs(loadShiftDefs());
          const refreshed = loadMonthSchedule(year, month, room);
          setShiftsMap(refreshed.shifts);
          showToast('กู้คืนและซิงค์ข้อมูลสำเร็จ');
        }}
      />
    </div>
  );
}
