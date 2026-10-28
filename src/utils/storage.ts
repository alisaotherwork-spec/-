import { Staff, ShiftDefinition, CurrentUser, RoomType } from '../types';
import { INITIAL_STAFF, INITIAL_SHIFTS } from '../data/initialData';
import {
  testConnection,
  patchStaffInFirestore,
  saveStaffListToFirestore,
  fetchStaffListFromFirestore,
  patchShiftDefsInFirestore,
  saveShiftDefsToFirestore,
  fetchShiftDefsFromFirestore,
  patchScheduleCellsInFirestore,
  saveScheduleToFirestore,
  fetchScheduleFromFirestore,
} from './firebase';
import {
  diffStaffLists,
  diffShiftDefs,
  diffScheduleMaps,
  diffRoomAssignments,
  stripUndefined,
} from './deltaDiff';

const STAFF_KEY = 'tuh_duty_staff_list_v1';
const SHIFTS_KEY = 'tuh_duty_shift_defs_v1';
const CURRENT_USER_KEY = 'tuh_duty_current_user_v1';
const SCHEDULE_PREFIX = 'tuh_duty_schedule_';
const SCHEDULE_INIT_PREFIX = 'tuh_duty_schedule_init_';

function normalizeStaffRole(staffList: Staff[]): Staff[] {
  return staffList
    .map((s) => {
      if (s.id === 'staff-1') {
        return { ...s, role: 'head' as const };
      }
      return s;
    })
    .sort((a, b) => a.order - b.order);
}

/**
 * Pure read function for Staff list.
 * NEVER writes factory defaults to localStorage or Firestore on read,
 * preventing accidental overwrite of remote/custom settings.
 */
export function loadStaffList(): Staff[] {
  try {
    const raw = localStorage.getItem(STAFF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeStaffRole(parsed);
      }
    }
  } catch (e) {
    console.error('Error loading staff list:', e);
  }
  return normalizeStaffRole(INITIAL_STAFF.map((s) => ({ ...s })));
}

/**
 * Saves staff list by computing the exact diff against the previous state
 * and sending ONLY the modified fields of modified staff (and deleted IDs) to Firestore.
 */
export function saveStaffList(staffList: Staff[]): void {
  try {
    const prevStaff = loadStaffList();
    const normalizedNext = normalizeStaffRole(staffList);
    const { changedStaff, deletedIds } = diffStaffLists(prevStaff, normalizedNext);

    localStorage.setItem(STAFF_KEY, JSON.stringify(normalizedNext));

    if (changedStaff.length > 0 || deletedIds.length > 0) {
      patchStaffInFirestore(changedStaff, deletedIds).catch((err) => {
        console.warn('Background delta sync of staff to Firestore failed:', err);
      });
    }
  } catch (e) {
    console.error('Error saving staff list:', e);
  }
}

/**
 * Updates specific fields of a single staff member without touching any other staff records.
 */
export function updateSingleStaffFields(
  staffId: string,
  changes: Partial<Staff>
): Staff[] {
  const currentList = loadStaffList();
  const updatedList = normalizeStaffRole(
    currentList.map((s) => (s.id === staffId ? { ...s, ...changes } : s))
  );
  try {
    localStorage.setItem(STAFF_KEY, JSON.stringify(updatedList));
    const cleanedChanges = stripUndefined({ ...changes, id: staffId });
    patchStaffInFirestore([{ id: staffId, changes: cleanedChanges, isNew: false }], []).catch(
      (err) => {
        console.warn('Background single-staff delta sync failed:', err);
      }
    );
  } catch (e) {
    console.error('Error updating single staff fields:', e);
  }
  return updatedList;
}

/**
 * Pure read function for Shift definitions.
 * NEVER writes factory defaults to localStorage or Firestore on read.
 */
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
  return INITIAL_SHIFTS.map((d) => ({ ...d, rates: { ...d.rates } }));
}

/**
 * Saves shift definitions by computing the exact diff against previous definitions
 * and sending ONLY modified/added/deleted definitions to Firestore.
 */
export function saveShiftDefs(shifts: ShiftDefinition[]): void {
  try {
    const prevDefs = loadShiftDefs();
    const { changedDefs, deletedCodes } = diffShiftDefs(prevDefs, shifts);

    localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));

    if (changedDefs.length > 0 || deletedCodes.length > 0) {
      patchShiftDefsInFirestore(changedDefs, deletedCodes).catch((err) => {
        console.warn('Background delta sync of shift defs to Firestore failed:', err);
      });
    }
  } catch (e) {
    console.error('Error saving shift defs:', e);
  }
}

/**
 * Canonical schedule storage key is unified per (year, month) as `${year}_${month}_all`
 * so switching room filter tabs never splits or hides schedule data.
 */
export function getScheduleStorageKey(
  year: number,
  month: number,
  _room: RoomType | 'all' = 'all'
): string {
  return `${SCHEDULE_PREFIX}${year}_${month}_all`;
}

export function isMonthScheduleInitialized(year: number, month: number): boolean {
  try {
    const initKey = `${SCHEDULE_INIT_PREFIX}${year}_${month}`;
    if (localStorage.getItem(initKey) === '1') {
      return true;
    }
    const key = getScheduleStorageKey(year, month, 'all');
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.shifts === 'object') {
        return true;
      }
    }
  } catch (e) {
    // ignore
  }
  return false;
}

export function markMonthScheduleInitialized(year: number, month: number): void {
  try {
    localStorage.setItem(`${SCHEDULE_INIT_PREFIX}${year}_${month}`, '1');
  } catch (e) {
    // ignore
  }
}

export function loadMonthSchedule(
  year: number,
  month: number,
  _room: RoomType | 'all' = 'all'
): { shifts: Record<string, string>; roomAssignments: Record<string, RoomType> } {
  try {
    const canonicalKey = `${SCHEDULE_PREFIX}${year}_${month}_all`;
    const legacyLabKey = `${SCHEDULE_PREFIX}${year}_${month}_lab`;
    const legacyDonKey = `${SCHEDULE_PREFIX}${year}_${month}_donation`;

    let mergedShifts: Record<string, string> = {};
    let mergedRooms: Record<string, RoomType> = {};

    // Read legacy room-split keys first if present, then overlay canonical 'all' key
    for (const k of [legacyDonKey, legacyLabKey, canonicalKey]) {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.shifts) {
          mergedShifts = { ...mergedShifts, ...parsed.shifts };
        }
        if (parsed?.roomAssignments) {
          mergedRooms = { ...mergedRooms, ...parsed.roomAssignments };
        }
      }
    }

    return {
      shifts: mergedShifts,
      roomAssignments: mergedRooms,
    };
  } catch (e) {
    console.error('Error loading schedule:', e);
  }
  return { shifts: {}, roomAssignments: {} };
}

/**
 * Updates a SINGLE cell (`${staffId}_${day}`) in localStorage and patches ONLY that cell in Firestore.
 * Unrelated cells and staff settings are never touched.
 */
export function updateSingleShiftCell(
  year: number,
  month: number,
  staffId: string,
  day: number,
  newCode: string,
  updatedBy: string = 'alisa'
): Record<string, string> {
  const current = loadMonthSchedule(year, month, 'all');
  const cellKey = `${staffId}_${day}`;
  const trimmed = (newCode || '').trim();
  const prevVal = (current.shifts[cellKey] || '').trim();

  // If value did not change at all, do nothing
  if (prevVal === trimmed) {
    return current.shifts;
  }

  const nextShifts = { ...current.shifts };
  const cellDelta: Record<string, string | null> = {};

  if (trimmed === '') {
    delete nextShifts[cellKey];
    cellDelta[cellKey] = null;
  } else {
    nextShifts[cellKey] = trimmed;
    cellDelta[cellKey] = trimmed;
  }

  try {
    const key = getScheduleStorageKey(year, month, 'all');
    localStorage.setItem(
      key,
      JSON.stringify({
        year,
        month,
        room: 'all',
        shifts: nextShifts,
        roomAssignments: current.roomAssignments,
        updatedAt: new Date().toISOString(),
      })
    );
    markMonthScheduleInitialized(year, month);

    patchScheduleCellsInFirestore(year, month, 'all', cellDelta, {}, updatedBy).catch((err) => {
      console.warn('Background single-cell delta sync to Firestore failed:', err);
    });
  } catch (e) {
    console.error('Error saving single shift cell:', e);
  }

  return nextShifts;
}

/**
 * Saves monthly schedule by computing the cell-by-cell diff against the previous schedule
 * and patching ONLY the changed cells to Firestore.
 */
export function saveMonthSchedule(
  year: number,
  month: number,
  _room: RoomType | 'all',
  shifts: Record<string, string>,
  roomAssignments: Record<string, RoomType> = {},
  updatedBy: string = 'alisa'
): void {
  try {
    const prev = loadMonthSchedule(year, month, 'all');
    const cellDeltas = diffScheduleMaps(prev.shifts, shifts);
    const roomDeltas = diffRoomAssignments(prev.roomAssignments, roomAssignments);

    const key = getScheduleStorageKey(year, month, 'all');
    localStorage.setItem(
      key,
      JSON.stringify({
        year,
        month,
        room: 'all',
        shifts,
        roomAssignments,
        updatedAt: new Date().toISOString(),
      })
    );
    markMonthScheduleInitialized(year, month);

    if (Object.keys(cellDeltas).length > 0 || Object.keys(roomDeltas).length > 0) {
      patchScheduleCellsInFirestore(year, month, 'all', cellDeltas, roomDeltas, updatedBy).catch(
        (err) => {
          console.warn('Background delta sync of schedule to Firestore failed:', err);
        }
      );
    }
  } catch (e) {
    console.error('Error saving schedule:', e);
  }
}

export function loadCurrentUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) {
        // Enforce that Nichapa is 'head' and NOT super_admin
        if (parsed.staffId === 'staff-1' && parsed.role === 'super_admin') {
          parsed.role = 'head';
          parsed.name = 'ทนพญ.ณิชาภา เจียมจรรยา (หัวหน้าห้อง)';
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading current user:', e);
  }
  return null;
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
 * Synchronizes a specific (year, month) schedule with Firestore without overwriting existing local or remote shifts.
 */
export async function syncMonthScheduleWithFirestore(
  year: number,
  month: number
): Promise<{
  shifts: Record<string, string>;
  roomAssignments: Record<string, RoomType>;
  hasExistingData: boolean;
}> {
  const localData = loadMonthSchedule(year, month, 'all');
  const localHasBeenInit = isMonthScheduleInitialized(year, month);
  const localHasShifts = Object.keys(localData.shifts).length > 0;

  // If this browser already has initialized schedule data for this month, preserve it without reversion
  if (localHasBeenInit || localHasShifts) {
    markMonthScheduleInitialized(year, month);
    return {
      shifts: localData.shifts,
      roomAssignments: localData.roomAssignments,
      hasExistingData: true,
    };
  }

  try {
    const remoteData = await fetchScheduleFromFirestore(year, month, 'all');
    if (remoteData && Object.keys(remoteData.shifts).length > 0) {
      const key = getScheduleStorageKey(year, month, 'all');
      localStorage.setItem(
        key,
        JSON.stringify({
          year,
          month,
          room: 'all',
          shifts: remoteData.shifts,
          roomAssignments: remoteData.roomAssignments || {},
          updatedAt: new Date().toISOString(),
        })
      );
      markMonthScheduleInitialized(year, month);

      return {
        shifts: remoteData.shifts,
        roomAssignments: remoteData.roomAssignments || {},
        hasExistingData: true,
      };
    }
  } catch (e) {
    console.warn('Could not fetch remote schedule, using local state:', e);
  }

  return {
    shifts: localData.shifts,
    roomAssignments: localData.roomAssignments,
    hasExistingData: false,
  };
}

/**
 * Initializes and synchronizes Firestore database with current app state
 * without reverting customized local or remote data to factory defaults.
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
    const hadLocalStaff = localStorage.getItem(STAFF_KEY) !== null;
    const localStaff = loadStaffList();
    let remoteStaff = await fetchStaffListFromFirestore();

    if (!remoteStaff || remoteStaff.length === 0) {
      // Only bootstrap Firestore if the remote collection is genuinely empty
      await saveStaffListToFirestore(localStaff);
      localStorage.setItem(STAFF_KEY, JSON.stringify(localStaff));
      remoteStaff = localStaff;
    } else if (!hadLocalStaff) {
      // Fresh browser session with no local staff: adopt remote staff from Firestore
      const normalizedRemote = normalizeStaffRole(remoteStaff);
      localStorage.setItem(STAFF_KEY, JSON.stringify(normalizedRemote));
      remoteStaff = normalizedRemote;
    } else {
      // Local storage already has staff settings: preserve local customizations and patch only diffs to Firestore
      const normalizedRemote = normalizeStaffRole(remoteStaff);
      const { changedStaff, deletedIds } = diffStaffLists(normalizedRemote, localStaff);
      if (changedStaff.length > 0 || deletedIds.length > 0) {
        await patchStaffInFirestore(changedStaff, deletedIds);
      }
      remoteStaff = localStaff;
    }

    const hadLocalShifts = localStorage.getItem(SHIFTS_KEY) !== null;
    const localShifts = loadShiftDefs();
    let remoteShifts = await fetchShiftDefsFromFirestore();

    if (!remoteShifts || remoteShifts.length === 0) {
      await saveShiftDefsToFirestore(localShifts);
      localStorage.setItem(SHIFTS_KEY, JSON.stringify(localShifts));
      remoteShifts = localShifts;
    } else if (!hadLocalShifts) {
      localStorage.setItem(SHIFTS_KEY, JSON.stringify(remoteShifts));
    } else {
      const { changedDefs, deletedCodes } = diffShiftDefs(remoteShifts, localShifts);
      if (changedDefs.length > 0 || deletedCodes.length > 0) {
        await patchShiftDefsInFirestore(changedDefs, deletedCodes);
      }
      remoteShifts = localShifts;
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
 * Pushes entire local database to Firestore (merge-safe)
 */
export async function pushAllToFirestore(
  year: number,
  month: number,
  _room: RoomType | 'all',
  shifts: Record<string, string>,
  roomAssignments: Record<string, RoomType>
): Promise<boolean> {
  try {
    const staff = loadStaffList();
    const shiftDefs = loadShiftDefs();

    await Promise.all([
      saveStaffListToFirestore(staff),
      saveShiftDefsToFirestore(shiftDefs),
      saveScheduleToFirestore(year, month, 'all', shifts, roomAssignments),
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
  _room: RoomType | 'all'
): Promise<{
  staff: Staff[] | null;
  shiftDefs: ShiftDefinition[] | null;
  schedule: { shifts: Record<string, string>; roomAssignments: Record<string, RoomType> } | null;
}> {
  try {
    const [staff, shiftDefs, schedule] = await Promise.all([
      fetchStaffListFromFirestore(),
      fetchShiftDefsFromFirestore(),
      fetchScheduleFromFirestore(year, month, 'all'),
    ]);

    if (staff && staff.length > 0) {
      localStorage.setItem(STAFF_KEY, JSON.stringify(normalizeStaffRole(staff)));
    }
    if (shiftDefs && shiftDefs.length > 0) {
      localStorage.setItem(SHIFTS_KEY, JSON.stringify(shiftDefs));
    }
    if (schedule) {
      const key = getScheduleStorageKey(year, month, 'all');
      localStorage.setItem(
        key,
        JSON.stringify({
          year,
          month,
          room: 'all',
          shifts: schedule.shifts,
          roomAssignments: schedule.roomAssignments,
          updatedAt: new Date().toISOString(),
        })
      );
      markMonthScheduleInitialized(year, month);
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
    if (key && key.startsWith(SCHEDULE_PREFIX) && !key.startsWith(SCHEDULE_INIT_PREFIX)) {
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

