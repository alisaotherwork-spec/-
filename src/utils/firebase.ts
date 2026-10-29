import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteField,
  collection,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Staff, ShiftDefinition, RoomType } from '../types';
import { StaffDelta, stripUndefined } from './deltaDiff';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// CRITICAL: Must use firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

/**
 * Tests connection to Firestore
 */
export async function testConnection(): Promise<boolean> {
  try {
    const snap = await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    // If document doesn't exist on server, getDocFromServer returns empty doc snapshot, but if error is thrown check details
    if (error?.code === 'not-found') {
      return true;
    }
    if (
      error?.code === 'unavailable' ||
      error?.code === 'permission-denied' ||
      error?.code === 'failed-precondition' ||
      (error instanceof Error && (error.message.includes('offline') || error.message.includes('network')))
    ) {
      console.warn('Firestore connection check notice:', error?.message || error);
      return false;
    }
    console.warn('Firestore connection warning:', error);
    return false;
  }
}

/**
 * Patches ONLY modified staff fields and deletes removed staff in Firestore
 */
export async function patchStaffInFirestore(
  staffUpdates: StaffDelta[],
  deletedIds: string[] = []
): Promise<void> {
  if (staffUpdates.length === 0 && deletedIds.length === 0) {
    return;
  }
  const path = 'staff';
  try {
    const batch = writeBatch(db);
    staffUpdates.forEach((delta) => {
      const ref = doc(db, path, delta.id);
      batch.set(ref, stripUndefined(delta.changes), { merge: true });
    });
    deletedIds.forEach((delId) => {
      const ref = doc(db, path, delId);
      batch.delete(ref);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Syncs staff list to Firestore (merge-safe)
 */
export async function saveStaffListToFirestore(staffList: Staff[]): Promise<void> {
  const path = 'staff';
  try {
    const batch = writeBatch(db);
    staffList.forEach((staff) => {
      const ref = doc(db, path, staff.id);
      batch.set(ref, stripUndefined({ ...staff }), { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches staff list from Firestore
 */
export async function fetchStaffListFromFirestore(): Promise<Staff[] | null> {
  const path = 'staff';
  try {
    const snap = await getDocs(collection(db, path));
    if (!snap.empty) {
      const list: Staff[] = [];
      snap.forEach((d) => {
        list.push(d.data() as Staff);
      });
      return list.sort((a, b) => a.order - b.order);
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Patches ONLY modified shift definitions and deletes removed ones in Firestore
 */
export async function patchShiftDefsInFirestore(
  changedDefs: ShiftDefinition[],
  deletedCodes: string[] = []
): Promise<void> {
  if (changedDefs.length === 0 && deletedCodes.length === 0) {
    return;
  }
  const path = 'shiftDefinitions';
  try {
    const batch = writeBatch(db);
    changedDefs.forEach((shift) => {
      const safeId = encodeURIComponent(shift.code);
      const ref = doc(db, path, safeId);
      batch.set(ref, stripUndefined({ ...shift }), { merge: true });
    });
    deletedCodes.forEach((code) => {
      const safeId = encodeURIComponent(code);
      const ref = doc(db, path, safeId);
      batch.delete(ref);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Syncs shift definitions to Firestore (merge-safe)
 */
export async function saveShiftDefsToFirestore(shiftDefs: ShiftDefinition[]): Promise<void> {
  const path = 'shiftDefinitions';
  try {
    const batch = writeBatch(db);
    shiftDefs.forEach((shift) => {
      // Use encoded code for safe Firestore doc ID
      const safeId = encodeURIComponent(shift.code);
      const ref = doc(db, path, safeId);
      batch.set(ref, stripUndefined({ ...shift }), { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches shift definitions from Firestore
 */
export async function fetchShiftDefsFromFirestore(): Promise<ShiftDefinition[] | null> {
  const path = 'shiftDefinitions';
  try {
    const snap = await getDocs(collection(db, path));
    if (!snap.empty) {
      const list: ShiftDefinition[] = [];
      snap.forEach((d) => {
        list.push(d.data() as ShiftDefinition);
      });
      return list;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Patches ONLY modified schedule cells and room assignments to Firestore using setDoc(..., { merge: true })
 * Cleared cells (null or '') use deleteField() so unrelated shift cells are never disturbed.
 */
export async function patchScheduleCellsInFirestore(
  year: number,
  month: number,
  room: RoomType | 'all',
  cellDeltas: Record<string, string | null>,
  roomAssignmentDeltas: Record<string, RoomType | null> = {},
  updatedBy: string = 'alisa'
): Promise<void> {
  const cellKeys = Object.keys(cellDeltas);
  const roomKeys = Object.keys(roomAssignmentDeltas);
  if (cellKeys.length === 0 && roomKeys.length === 0) {
    return;
  }

  const scheduleId = `${year}_${month}_${room}`;
  const path = `schedules/${scheduleId}`;
  try {
    const ref = doc(db, 'schedules', scheduleId);
    const firestoreShiftsDelta: Record<string, any> = {};
    for (const [key, val] of Object.entries(cellDeltas)) {
      if (val === null || val.trim() === '') {
        firestoreShiftsDelta[key] = deleteField();
      } else {
        firestoreShiftsDelta[key] = val.trim();
      }
    }

    const firestoreRoomsDelta: Record<string, any> = {};
    for (const [key, val] of Object.entries(roomAssignmentDeltas)) {
      if (val === null) {
        firestoreRoomsDelta[key] = deleteField();
      } else {
        firestoreRoomsDelta[key] = val;
      }
    }

    const payload: Record<string, any> = {
      year,
      month,
      room,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    if (cellKeys.length > 0) {
      payload.shifts = firestoreShiftsDelta;
    }
    if (roomKeys.length > 0) {
      payload.roomAssignments = firestoreRoomsDelta;
    }

    await setDoc(ref, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Syncs a monthly schedule to Firestore (merge-safe)
 */
export async function saveScheduleToFirestore(
  year: number,
  month: number,
  room: RoomType | 'all',
  shifts: Record<string, string>,
  roomAssignments: Record<string, RoomType> = {},
  updatedBy: string = 'alisa'
): Promise<void> {
  const scheduleId = `${year}_${month}_${room}`;
  const path = `schedules/${scheduleId}`;
  try {
    const ref = doc(db, 'schedules', scheduleId);
    await setDoc(
      ref,
      {
        year,
        month,
        room,
        shifts,
        roomAssignments,
        updatedAt: new Date().toISOString(),
        updatedBy,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches a monthly schedule from Firestore
 */
export async function fetchScheduleFromFirestore(
  year: number,
  month: number,
  room: RoomType | 'all'
): Promise<{ shifts: Record<string, string>; roomAssignments: Record<string, RoomType> } | null> {
  const scheduleId = `${year}_${month}_${room}`;
  const path = `schedules/${scheduleId}`;
  try {
    const ref = doc(db, 'schedules', scheduleId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return {
        shifts: data.shifts || {},
        roomAssignments: data.roomAssignments || {},
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

