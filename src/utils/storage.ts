import { Staff, ShiftDefinition, CurrentUser, RoomType } from '../types';
import { INITIAL_STAFF, INITIAL_SHIFTS, SUPER_ADMIN_CREDENTIALS } from '../data/initialData';
import {
  testConnection,
  saveStaffListToFirestore,
  fetchStaffListFromFirestore,
  saveShiftDefsToFirestore,
  fetchShiftDefsFromFirestore,
  saveScheduleToFirestore,
  fetchScheduleFromFirestore,
} from './firebase';

const STAFF_KEY = 'tuh_duty_staff_list_v1';
const SHIFTS_KEY = 'tuh_duty_shift_defs_v1';
const CURRENT_USER_KEY = 'tuh_duty_current_user_v1';
const SCHEDULE_PREFIX = 'tuh_duty_schedule_';

export function loadStaffList(): Staff[] {
  try {
    const raw = localStorage.getItem(STAFF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading staff list:', e);
  }
  // Initialize with default
  saveStaffList(INITIAL_STAFF);
  return INITIAL_STAFF;
}

export function saveStaffList(staffList: Staff[]): void {
  try {
    localStorage.setItem(STAFF_KEY, JSON.stringify(staffList));
    // Asynchronously sync to Firestore
    saveStaffListToFirestore(staffList).catch((err) => {
      console.warn('Background sync to Firestore failed:', err);
    });
  } catch (e) {
    console.error('Error saving staff list:', e);
  }
}

export function loadShiftDefs(): ShiftDefinition[] {
  try {
    const raw = localStorage.getItem(SHIFTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading shift defs:', e);
  }
  saveShiftDefs(INITIAL_SHIFTS);
  return INITIAL_SHIFTS;
}

export function saveShiftDefs(shifts: ShiftDefinition[]): void {
  try {
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
    // Asynchronously sync to Firestore
    saveShiftDefsToFirestore(shifts).catch((err) => {
      console.warn('Background sync to Firestore failed:', err);
    });
  } catch (e) {
    console.error('Error saving shift defs:', e);
  }
}

export function getScheduleStorageKey(year: number, month: number, room: RoomType | 'all' = 'all'): string {
  return `${SCHEDULE_PREFIX}${year}_${month}_${room}`;
}

export function loadMonthSchedule(
  year: number,
  month: number,
  room: RoomType | 'all' = 'all'
): { shifts: Record<string, string>; roomAssignments: Record<string, RoomType> } {
  try {
    const key = getScheduleStorageKey(year, month, room);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        shifts: parsed.shifts || {},
        roomAssignments: parsed.roomAssignments || {},
      };
    }
  } catch (e) {
    console.error('Error loading schedule:', e);
  }
  return { shifts: {}, roomAssignments: {} };
}

export function saveMonthSchedule(
  year: number,
  month: number,
  room: RoomType | 'all',
  shifts: Record<string, string>,
  roomAssignments: Record<string, RoomType> = {},
  updatedBy: string = 'alisa'
): void {
  try {
    const key = getScheduleStorageKey(year, month, room);
    localStorage.setItem(
      key,
      JSON.stringify({
        year,
        month,
        room,
        shifts,
        roomAssignments,
        updatedAt: new Date().toISOString(),
      })
    );
    // Asynchronously save to Firestore
    saveScheduleToFirestore(year, month, room, shifts, roomAssignments, updatedBy).catch((err) => {
      console.warn('Background sync to Firestore failed:', err);
    });
  } catch (e) {
    console.error('Error saving schedule:', e);
  }
}

export function loadCurrentUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading current user:', e);
  }
  const defaultUser: CurrentUser = {
    id: 'user-nichapa',
    username: SUPER_ADMIN_CREDENTIALS.username,
    name: 'ทนพญ.ณิชาภา เจียมจรรยา (หัวหน้างาน)',
    role: 'super_admin',
    staffId: 'staff-1',
    mustChangePassword: false,
  };
  saveCurrentUser(defaultUser);
  return defaultUser;
}

export function saveCurrentUser(user: CurrentUser | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (e) {
    console.error('Error saving current user:', e);
  }
}

/**
 * Initializes and synchronizes Firestore database with current app state
 */
export async function initializeFirestoreSync(): Promise<{
  connected: boolean;
  syncedStaffCount: number;
  syncedShiftCount: number;
}> {
  const isConnected = await testConnection();
  if (!isConnected) {
    return { connected: false, syncedStaffCount: 0, syncedShiftCount: 0 };
  }

  try {
    // 1. Check or initialize Staff in Firestore
    let remoteStaff = await fetchStaffListFromFirestore();
    const localStaff = loadStaffList();

    if (!remoteStaff || remoteStaff.length === 0) {
      // Bootstrap Firestore with current local staff
      await saveStaffListToFirestore(localStaff);
      remoteStaff = localStaff;
    } else {
      // Update local storage with remote Firestore data
      localStorage.setItem(STAFF_KEY, JSON.stringify(remoteStaff));
    }

    // 2. Check or initialize Shift Definitions in Firestore
    let remoteShifts = await fetchShiftDefsFromFirestore();
    const localShifts = loadShiftDefs();

    if (!remoteShifts || remoteShifts.length === 0) {
      await saveShiftDefsToFirestore(localShifts);
      remoteShifts = localShifts;
    } else {
      localStorage.setItem(SHIFTS_KEY, JSON.stringify(remoteShifts));
    }

    return {
      connected: true,
      syncedStaffCount: remoteStaff.length,
      syncedShiftCount: remoteShifts.length,
    };
  } catch (e) {
    console.error('Firestore initial sync error:', e);
    return { connected: true, syncedStaffCount: 0, syncedShiftCount: 0 };
  }
}

/**
 * Pushes entire local database to Firestore
 */
export async function pushAllToFirestore(
  year: number,
  month: number,
  room: RoomType | 'all',
  shifts: Record<string, string>,
  roomAssignments: Record<string, RoomType>
): Promise<boolean> {
  try {
    const staff = loadStaffList();
    const shiftDefs = loadShiftDefs();

    await Promise.all([
      saveStaffListToFirestore(staff),
      saveShiftDefsToFirestore(shiftDefs),
      saveScheduleToFirestore(year, month, room, shifts, roomAssignments),
    ]);
    return true;
  } catch (e) {
    console.error('Failed to push all to Firestore:', e);
    return false;
  }
}

/**
 * Pulls entire database from Firestore
 */
export async function pullAllFromFirestore(
  year: number,
  month: number,
  room: RoomType | 'all'
): Promise<{
  staff: Staff[] | null;
  shiftDefs: ShiftDefinition[] | null;
  schedule: { shifts: Record<string, string>; roomAssignments: Record<string, RoomType> } | null;
}> {
  try {
    const [staff, shiftDefs, schedule] = await Promise.all([
      fetchStaffListFromFirestore(),
      fetchShiftDefsFromFirestore(),
      fetchScheduleFromFirestore(year, month, room),
    ]);

    if (staff && staff.length > 0) {
      localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
    }
    if (shiftDefs && shiftDefs.length > 0) {
      localStorage.setItem(SHIFTS_KEY, JSON.stringify(shiftDefs));
    }
    if (schedule) {
      const key = getScheduleStorageKey(year, month, room);
      localStorage.setItem(
        key,
        JSON.stringify({
          year,
          month,
          room,
          shifts: schedule.shifts,
          roomAssignments: schedule.roomAssignments,
          updatedAt: new Date().toISOString(),
        })
      );
    }

    return { staff, shiftDefs, schedule };
  } catch (e) {
    console.error('Failed to pull from Firestore:', e);
    return { staff: null, shiftDefs: null, schedule: null };
  }
}

/**
 * Creates full JSON backup for saving to Google Drive / Firebase / local disk
 */
export function createFullBackupPayload(): string {
  const allData: Record<string, any> = {
    appName: 'Duty Schedule - Transfusion Medicine TUH',
    firebaseProject: 'duty-schedule-tm',
    exportDate: new Date().toISOString(),
    staffList: loadStaffList(),
    shiftDefs: loadShiftDefs(),
    schedules: {} as Record<string, any>,
  };

  // Grab all schedules from localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(SCHEDULE_PREFIX)) {
      try {
        const val = localStorage.getItem(key);
        if (val) {
          allData.schedules[key] = JSON.parse(val);
        }
      } catch (e) {
        // ignore
      }
    }
  }

  return JSON.stringify(allData, null, 2);
}

/**
 * Restores state from imported JSON backup
 */
export function restoreFromBackupPayload(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.staffList && Array.isArray(parsed.staffList)) {
      saveStaffList(parsed.staffList);
    }
    if (parsed.shiftDefs && Array.isArray(parsed.shiftDefs)) {
      saveShiftDefs(parsed.shiftDefs);
    }
    if (parsed.schedules && typeof parsed.schedules === 'object') {
      Object.entries(parsed.schedules).forEach(([key, val]) => {
        if (key.startsWith(SCHEDULE_PREFIX)) {
          localStorage.setItem(key, JSON.stringify(val));
        }
      });
    }
    return true;
  } catch (e) {
    console.error('Failed to restore backup:', e);
    return false;
  }
}
