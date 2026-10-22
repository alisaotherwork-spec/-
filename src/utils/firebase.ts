import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  collection,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Staff, ShiftDefinition, RoomType } from '../types';

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
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is offline or connecting...');
      return false;
    }
    // Document not existing is a normal successful connection response
    return true;
  }
}

/**
 * Syncs staff list to Firestore
 */
export async function saveStaffListToFirestore(staffList: Staff[]): Promise<void> {
  const path = 'staff';
  try {
    const batch = writeBatch(db);
    staffList.forEach((staff) => {
      const ref = doc(db, path, staff.id);
      batch.set(ref, staff);
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
 * Syncs shift definitions to Firestore
 */
export async function saveShiftDefsToFirestore(shiftDefs: ShiftDefinition[]): Promise<void> {
  const path = 'shiftDefinitions';
  try {
    const batch = writeBatch(db);
    shiftDefs.forEach((shift) => {
      // Use encoded code for safe Firestore doc ID
      const safeId = encodeURIComponent(shift.code);
      const ref = doc(db, path, safeId);
      batch.set(ref, shift);
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
 * Syncs a monthly schedule to Firestore
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
    await setDoc(ref, {
      year,
      month,
      room,
      shifts,
      roomAssignments,
      updatedAt: new Date().toISOString(),
      updatedBy,
    });
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
