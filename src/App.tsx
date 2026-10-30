/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Staff, ShiftDefinition, CurrentUser, RoomType } from './types';
import {
  loadStaffList,
  saveStaffList,
  updateSingleStaffFields,
  loadShiftDefs,
  saveShiftDefs,
  loadMonthSchedule,
  saveMonthSchedule,
  updateSingleShiftCell,
  isMonthScheduleInitialized,
  syncMonthScheduleWithFirestore,
  loadCurrentUser,
  saveCurrentUser,
  initializeFirestoreSync,
} from './utils/storage';
import {
  getDaysInMonth,
  generateAutoSchedule,
  generateMultiShiftAutoSchedule,
  THAI_MONTHS,
} from './utils/scheduler';
import { calculateAllStaffMonthlySummaries } from './utils/calculator';
import { exportDutyScheduleToExcel } from './utils/exportExcel';

import { SolarSystemBackground } from './components/SolarSystemBackground';
import { Header } from './components/Header';
import { DutyTable } from './components/DutyTable';
import { LoginView } from './components/LoginView';
import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { DailySummaryModal } from './components/DailySummaryModal';
import { OtClaimModal } from './components/OtClaimModal';
import { PrintScheduleModal } from './components/PrintScheduleModal';
import { StaffManagementModal } from './components/StaffManagementModal';
import { ShiftRatesModal } from './components/ShiftRatesModal';
import { AutoScheduleModal } from './components/AutoScheduleModal';
import { BackupModal } from './components/BackupModal';

export default function App() {
  // Current date state (Year & Month)
  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(10);
  const [room, setRoom] = useState<RoomType | 'all'>('all');

  // Loaded data
  const [staffList, setStaffList] = useState<Staff[]>(() => loadStaffList());
  const [shiftDefs, setShiftDefs] = useState<ShiftDefinition[]>(() => loadShiftDefs());
  const [shiftsMap, setShiftsMap] = useState<Record<string, string>>(() => {
    return loadMonthSchedule(2026, 10, 'all').shifts;
  });
  const [roomAssignments, setRoomAssignments] = useState<Record<string, RoomType>>(() => {
    return loadMonthSchedule(2026, 10, 'all').roomAssignments;
  });
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => loadCurrentUser());

  // Modals
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAutoScheduleModalOpen, setIsAutoScheduleModalOpen] = useState(false);
  const [isDailySummaryOpen, setIsDailySummaryOpen] = useState(false);
  const [isOtClaimOpen, setIsOtClaimOpen] = useState(false);
  const [isPrintScheduleOpen, setIsPrintScheduleOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isShiftRatesModalOpen, setIsShiftRatesModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Notification Banner
  const [notification, setNotification] = useState<string | null>(null);

  // Active status filter for duty table ('active' | 'all' | 'inactive')
  const [activeFilter, setActiveFilter] = useState<'active' | 'all' | 'inactive'>('active');

  // Days in selected month
  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);

  // Boot Firestore sync on initial mount without overwriting local edits
  useEffect(() => {
    initializeFirestoreSync()
      .then((res) => {
        if (res.connected) {
          setStaffList(loadStaffList());
          setShiftDefs(loadShiftDefs());
        }
      })
      .catch((err) => {
        console.warn('Initial Firestore sync caught error:', err);
      });
  }, []);

  // Load schedule whenever year or month changes (room filter only filters view, never splits schedule)
  useEffect(() => {
    let isCancelled = false;
    const localData = loadMonthSchedule(year, month, 'all');
    const alreadyInit =
      isMonthScheduleInitialized(year, month) || Object.keys(localData.shifts).length > 0;

    if (alreadyInit) {
      setShiftsMap(localData.shifts);
      setRoomAssignments(localData.roomAssignments);
    }

    syncMonthScheduleWithFirestore(year, month)
      .then((synced) => {
        if (isCancelled) return;
        if (synced.hasExistingData) {
          setShiftsMap(synced.shifts);
          setRoomAssignments(synced.roomAssignments);
        } else {
          // Seed initial schedule ONLY if neither local storage nor Firestore has any record for this month
          const currentStaff = loadStaffList();
          const seeded = generateAutoSchedule({
            mtStaffList: currentStaff,
            daysInMonth: getDaysInMonth(year, month),
            shiftCode: 'บด',
          });
          setShiftsMap(seeded);
          setRoomAssignments(synced.roomAssignments);
          saveMonthSchedule(
            year,
            month,
            'all',
            seeded,
            synced.roomAssignments,
            currentUser?.username || 'alisa'
          );
        }
      })
      .catch((err) => {
        console.warn('Schedule sync caught error:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [year, month]);

  const showToast = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification((curr) => (curr === message ? null : curr));
    }, 4000);
  };

  // Filter staff based on room selection and Active status option
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      // Room filter
      const roomMatch =
        room === 'all' || s.defaultRoom === 'both' || s.defaultRoom === room || !s.defaultRoom;

      // Active status filter
      const activeMatch =
        activeFilter === 'all'
          ? true
          : activeFilter === 'active'
          ? s.isActive !== false
          : s.isActive === false;

      return roomMatch && activeMatch;
    });
  }, [staffList, room, activeFilter]);

  // Calculate monthly summaries
  const summaries = useMemo(() => {
    return calculateAllStaffMonthlySummaries(staffList, daysInMonth, shiftsMap, shiftDefs);
  }, [staffList, daysInMonth, shiftsMap, shiftDefs]);

  // Handle single shift cell update (sends ONLY the single modified cell)
  const handleUpdateShift = (staffId: string, day: number, newCode: string) => {
    const updatedShifts = updateSingleShiftCell(
      year,
      month,
      staffId,
      day,
      newCode,
      currentUser?.username || 'alisa'
    );
    setShiftsMap(updatedShifts);
  };

  // Quick 1-click Auto Schedule for 'บด' (modifies only active MT staff shifts, preserving all other staff shifts)
  const handleRunAutoSchedule = () => {
    const newShifts = generateAutoSchedule({
      mtStaffList: staffList,
      daysInMonth,
      shiftCode: 'บด',
      existingShifts: shiftsMap,
      preserveExisting: false,
    });

    setShiftsMap(newShifts);
    saveMonthSchedule(year, month, 'all', newShifts, roomAssignments, currentUser?.username || 'alisa');
    showToast(
      `จัดเวร บด อัตโนมัติสำหรับนักเทคนิคการแพทย์ (MT) สำเร็จแล้ว: วนลำดับ 1 ถึง 14 วันละ 1 คนตลอดทั้งเดือน ${THAI_MONTHS[month - 1]} พ.ศ. ${year + 543}`
    );
  };

  // Quick 1-click Auto Schedule for 'บ' (modifies only active MT staff shifts, preserving all other staff shifts)
  const handleRunAutoScheduleB = () => {
    const newShifts = generateAutoSchedule({
      mtStaffList: staffList,
      daysInMonth,
      shiftCode: 'บ',
      existingShifts: shiftsMap,
      preserveExisting: false,
    });

    setShiftsMap(newShifts);
    saveMonthSchedule(year, month, 'all', newShifts, roomAssignments, currentUser?.username || 'alisa');
    showToast(
      `จัดเวร บ อัตโนมัติสำหรับนักเทคนิคการแพทย์ (MT) สำเร็จแล้ว: วนลำดับ 1 ถึง 14 วันละ 1 คนตลอดทั้งเดือน ${THAI_MONTHS[month - 1]} พ.ศ. ${year + 543}`
    );
  };

  // Multi-shift auto scheduler applied from AutoScheduleModal
  const handleApplyMultiShiftAutoSchedule = (config: {
    selectedShifts: string[];
    targetSection: 'ALL' | 'MT' | 'SUPPORT' | 'PART_TIME';
    targetRoom: RoomType | 'all';
    startStaffOrder: number;
    staggerMultipleShifts: boolean;
    overwriteExisting: boolean;
    customStaffOrderIds?: string[];
  }) => {
    const newShifts = generateMultiShiftAutoSchedule({
      staffList,
      daysInMonth,
      selectedShifts: config.selectedShifts,
      targetSection: config.targetSection,
      targetRoom: config.targetRoom,
      startOrderIndex: config.startStaffOrder,
      staggerMultipleShifts: config.staggerMultipleShifts,
      overwriteExisting: config.overwriteExisting,
      customStaffOrderIds: config.customStaffOrderIds,
      existingShifts: shiftsMap,
    });

    setShiftsMap(newShifts);
    saveMonthSchedule(year, month, 'all', newShifts, roomAssignments, currentUser?.username || 'alisa');
    showToast(
      `จัดเวรอัตโนมัติสำเร็จ: [${config.selectedShifts.join(', ')}] ประจำเดือน ${THAI_MONTHS[month - 1]} พ.ศ. ${year + 543}`
    );
  };

  // Save updated staff list (saveStaffList diffs and sends ONLY modified fields of modified staff)
  const handleSaveStaffList = (newStaffList: Staff[]) => {
    saveStaffList(newStaffList);
    setStaffList(loadStaffList());
    showToast('บันทึกเฉพาะข้อมูลเจ้าหน้าที่ที่มีการเปลี่ยนแปลงเรียบร้อยแล้ว');
  };

  // Save updated shift defs (saveShiftDefs diffs and sends ONLY modified shift definitions)
  const handleSaveShiftDefs = (newDefs: ShiftDefinition[]) => {
    saveShiftDefs(newDefs);
    setShiftDefs(loadShiftDefs());
    showToast('บันทึกเฉพาะรหัสเวรและอัตราค่าตอบแทนที่มีการแก้ไขเรียบร้อยแล้ว');
  };

  // Handle password change (sends ONLY password & mustChangePassword for that single staff member)
  const handlePasswordChanged = (staffId: string, newPass: string) => {
    const updatedStaff = updateSingleStaffFields(staffId, {
      password: newPass,
      mustChangePassword: false,
    });
    setStaffList(updatedStaff);

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
    exportDutyScheduleToExcel(year, month, room, filteredStaff, daysInMonth, shiftsMap, summaries);
    showToast('ส่งออกตารางเวรเป็นไฟล์ Excel (.xlsx) สำเร็จ');
  };

  // Requirement 1: If not logged in, show Login Screen BEFORE entering the main page
  if (!currentUser) {
    return (
      <LoginView
        staffList={staffList}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          saveCurrentUser(user);
          showToast(`ยินดีต้อนรับ: ${user.name}`);
        }}
      />
    );
  }

  const isAnyPrintModalOpen = isDailySummaryOpen || isOtClaimOpen || isPrintScheduleOpen;
  const canManage =
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'head' ||
    currentUser?.role === 'sub_admin';

  return (
    <div className="min-h-screen relative overflow-x-hidden selection:bg-[#8B1E27] selection:text-white font-sans">
      <div className={isAnyPrintModalOpen ? 'no-print' : ''}>
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
            onOpenAutoScheduleModal={() => setIsAutoScheduleModalOpen(true)}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
            activeFilter={activeFilter}
            onActiveFilterChange={setActiveFilter}
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
              onOpenAutoScheduleModal={() => setIsAutoScheduleModalOpen(true)}
              activeFilter={activeFilter}
              onActiveFilterChange={setActiveFilter}
              onShowToast={showToast}
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
      </div>

      {/* Login / Switch Account Modal */}
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

      {/* Enhanced Multi-Shift Auto Scheduler Modal */}
      <AutoScheduleModal
        isOpen={isAutoScheduleModalOpen}
        onClose={() => setIsAutoScheduleModalOpen(false)}
        year={year}
        month={month}
        daysInMonth={daysInMonth}
        room={room}
        staffList={staffList}
        shiftDefs={shiftDefs}
        onApplyAutoSchedule={handleApplyMultiShiftAutoSchedule}
      />

      {/* Daily Shift Summary Modal (ใบสรุปเวรประจำวัน) */}
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

      {/* Staff Management Modal with Room Assignment */}
      <StaffManagementModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staffList={staffList}
        onSaveStaffList={handleSaveStaffList}
        canManage={canManage}
      />

      {/* Shift Codes & Rates Modal */}
      <ShiftRatesModal
        isOpen={isShiftRatesModalOpen}
        onClose={() => setIsShiftRatesModalOpen(false)}
        shiftDefs={shiftDefs}
        onSaveShiftDefs={handleSaveShiftDefs}
        canEdit={currentUser?.role === 'super_admin' || currentUser?.role === 'head'}
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
