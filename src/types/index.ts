export type Position = 'MT' | 'AMT' | 'Office' | 'Service';

export type StaffSection = 'MT' | 'SUPPORT' | 'PART_TIME';

export type UserRole = 'super_admin' | 'head' | 'sub_admin' | 'staff';

export type RoomType = 'lab' | 'donation';

export interface Staff {
  id: string;
  name: string;
  englishName?: string;
  position: Position;
  section: StaffSection;
  order: number;
  role: UserRole;
  password?: string;
  mustChangePassword?: boolean;
  defaultRoom?: RoomType | 'both';
  isActive: boolean;
}

export interface MultiShiftAutoScheduleConfig {
  selectedShifts: string[]; // Shift codes e.g. ['บด', 'บ', 'ช']
  targetSection: 'ALL' | 'MT' | 'SUPPORT' | 'PART_TIME';
  targetRoom: RoomType | 'all';
  startStaffOrder: number;
  staggerMultipleShifts: boolean; // avoid double booking on the same day
  overwriteExisting: boolean;
  customStaffOrderIds?: string[]; // Custom sequence of staff IDs for auto-assignment
}

export interface ShiftDefinition {
  code: string; // 1-4 chars (e.g. ช, บ, ด, ชบ, บด, ชบด, OT1, OT2, OT3, OT4)
  name: string;
  isOt?: boolean;
  otHours?: number; // 1, 2, 3, 4
  rates: {
    MT: number;
    AMT: number;
    Office: number;
    Service: number;
  };
  applicablePositions?: Position[]; // e.g. ['MT', 'AMT', 'Office', 'Service']
  colorBg?: string;
  colorText?: string;
  colorBorder?: string;
}

export interface ShiftRecord {
  staffId: string;
  date: string; // YYYY-MM-DD
  room: RoomType;
  code: string; // shift code or empty
  notes?: string;
}

export interface ScheduleData {
  month: number; // 1 - 12
  year: number; // e.g. 2026
  room: RoomType | 'all';
  // Map of `staffId_day` -> shift code
  // Example: `staff-1_1`: "บด"
  shifts: Record<string, string>;
  // Map of `staffId_day` -> RoomType
  roomAssignments?: Record<string, RoomType>;
}

export interface CurrentUser {
  id: string;
  username?: string;
  name: string;
  role: UserRole;
  staffId?: string;
  mustChangePassword?: boolean;
}

export interface MonthlyStaffSummary {
  staffId: string;
  staff: Staff;
  regularShiftCount: number;
  regularShiftIncome: number;
  otCount: number;
  otHours: number;
  otIncome: number;
  totalIncome: number;
  shiftBreakdown: Record<string, number>;
}
