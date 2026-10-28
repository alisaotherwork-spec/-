import { Staff, ShiftDefinition, RoomType } from '../types';

export interface StaffDelta {
  id: string;
  changes: Partial<Staff>;
  isNew: boolean;
}

export interface StaffDiffResult {
  changedStaff: StaffDelta[];
  deletedIds: string[];
}

export interface ShiftDefsDiffResult {
  changedDefs: ShiftDefinition[];
  deletedCodes: string[];
}

/**
 * Strips undefined properties from an object so Firestore never rejects writes
 */
export function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      cleaned[k] = v;
    }
  }
  return cleaned as T;
}

/**
 * Computes the exact per-staff and per-field delta between two Staff arrays.
 * Unmodified staff members are completely excluded.
 * Modified staff members only include the exact fields that changed.
 */
export function diffStaffLists(prevList: Staff[], nextList: Staff[]): StaffDiffResult {
  const prevMap = new Map<string, Staff>();
  for (const s of prevList) {
    prevMap.set(s.id, s);
  }

  const nextIds = new Set<string>();
  const changedStaff: StaffDelta[] = [];

  const keysToCompare: (keyof Staff)[] = [
    'name',
    'englishName',
    'position',
    'section',
    'order',
    'role',
    'password',
    'mustChangePassword',
    'defaultRoom',
    'isActive',
  ];

  for (const nextItem of nextList) {
    nextIds.add(nextItem.id);
    const prevItem = prevMap.get(nextItem.id);

    if (!prevItem) {
      changedStaff.push({
        id: nextItem.id,
        changes: stripUndefined({ ...nextItem }),
        isNew: true,
      });
      continue;
    }

    const fieldChanges: Partial<Staff> = {};
    let hasChange = false;

    for (const key of keysToCompare) {
      const prevVal = prevItem[key];
      const nextVal = nextItem[key];
      if (prevVal !== nextVal) {
        if (nextVal !== undefined) {
          (fieldChanges as any)[key] = nextVal;
          hasChange = true;
        }
      }
    }

    if (hasChange) {
      fieldChanges.id = nextItem.id;
      changedStaff.push({
        id: nextItem.id,
        changes: stripUndefined(fieldChanges),
        isNew: false,
      });
    }
  }

  const deletedIds: string[] = [];
  for (const prevItem of prevList) {
    if (!nextIds.has(prevItem.id)) {
      deletedIds.push(prevItem.id);
    }
  }

  return { changedStaff, deletedIds };
}

/**
 * Computes the exact delta between two ShiftDefinition arrays.
 * Unmodified shift definitions are excluded.
 */
export function diffShiftDefs(
  prevDefs: ShiftDefinition[],
  nextDefs: ShiftDefinition[]
): ShiftDefsDiffResult {
  const prevMap = new Map<string, ShiftDefinition>();
  for (const d of prevDefs) {
    prevMap.set(d.code, d);
  }

  const nextCodes = new Set<string>();
  const changedDefs: ShiftDefinition[] = [];

  for (const nextDef of nextDefs) {
    nextCodes.add(nextDef.code);
    const prevDef = prevMap.get(nextDef.code);

    if (!prevDef) {
      changedDefs.push(stripUndefined({ ...nextDef }));
      continue;
    }

    const prevPosJson = JSON.stringify(prevDef.applicablePositions || []);
    const nextPosJson = JSON.stringify(nextDef.applicablePositions || []);

    const isSame =
      prevDef.name === nextDef.name &&
      prevDef.isOt === nextDef.isOt &&
      (prevDef.otHours ?? null) === (nextDef.otHours ?? null) &&
      prevDef.rates.MT === nextDef.rates.MT &&
      prevDef.rates.AMT === nextDef.rates.AMT &&
      prevDef.rates.Office === nextDef.rates.Office &&
      prevDef.rates.Service === nextDef.rates.Service &&
      prevDef.colorBg === nextDef.colorBg &&
      prevDef.colorText === nextDef.colorText &&
      prevDef.colorBorder === nextDef.colorBorder &&
      prevPosJson === nextPosJson;

    if (!isSame) {
      changedDefs.push(stripUndefined({ ...nextDef }));
    }
  }

  const deletedCodes: string[] = [];
  for (const prevDef of prevDefs) {
    if (!nextCodes.has(prevDef.code)) {
      deletedCodes.push(prevDef.code);
    }
  }

  return { changedDefs, deletedCodes };
}

/**
 * Computes the exact cell-level delta between two schedule shift maps.
 * Returns a map where:
 *  - key -> non-empty string means the shift cell was added or updated
 *  - key -> null means the shift cell was cleared/deleted
 *  - unchanged cells are omitted completely
 */
export function diffScheduleMaps(
  prevShifts: Record<string, string>,
  nextShifts: Record<string, string>
): Record<string, string | null> {
  const deltas: Record<string, string | null> = {};
  const allKeys = new Set([...Object.keys(prevShifts), ...Object.keys(nextShifts)]);

  for (const key of allKeys) {
    const prevVal = (prevShifts[key] || '').trim();
    const nextVal = (nextShifts[key] || '').trim();

    if (prevVal === nextVal) {
      continue;
    }

    if (nextVal === '') {
      deltas[key] = null;
    } else {
      deltas[key] = nextVal;
    }
  }

  return deltas;
}

/**
 * Applies cell deltas onto an existing shifts map without mutating unrelated keys.
 */
export function applyScheduleDeltas(
  baseShifts: Record<string, string>,
  deltas: Record<string, string | null>
): Record<string, string> {
  const updated: Record<string, string> = { ...baseShifts };
  for (const [key, val] of Object.entries(deltas)) {
    if (val === null || val.trim() === '') {
      delete updated[key];
    } else {
      updated[key] = val.trim();
    }
  }
  return updated;
}

/**
 * Computes delta for roomAssignments map.
 */
export function diffRoomAssignments(
  prevRooms: Record<string, RoomType>,
  nextRooms: Record<string, RoomType>
): Record<string, RoomType | null> {
  const deltas: Record<string, RoomType | null> = {};
  const allKeys = new Set([...Object.keys(prevRooms), ...Object.keys(nextRooms)]);

  for (const key of allKeys) {
    const prevVal = prevRooms[key];
    const nextVal = nextRooms[key];
    if (prevVal === nextVal) continue;
    deltas[key] = nextVal ?? null;
  }

  return deltas;
}
