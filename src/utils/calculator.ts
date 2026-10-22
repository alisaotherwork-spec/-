import { Staff, ShiftDefinition, MonthlyStaffSummary, Position } from '../types';

/**
 * Returns the pay rate for a given shift code and position
 */
export function getRateForShiftAndPosition(
  shiftCode: string,
  position: Position,
  shiftDefs: ShiftDefinition[]
): { rate: number; isOt: boolean; otHours: number } {
  if (!shiftCode || shiftCode.trim() === '') {
    return { rate: 0, isOt: false, otHours: 0 };
  }

  const normalizedCode = shiftCode.trim();
  const def = shiftDefs.find((s) => s.code.toLowerCase() === normalizedCode.toLowerCase());

  if (!def) {
    // Fallback detection for OT patterns if custom code is typed
    if (/^OT(\d+)$/i.test(normalizedCode)) {
      const hours = parseInt(normalizedCode.replace(/^OT/i, ''), 10) || 1;
      const baseRates: Record<Position, number> = {
        MT: 175,
        AMT: 80,
        Office: 80,
        Service: 55,
      };
      return {
        rate: (baseRates[position] || 80) * hours,
        isOt: true,
        otHours: hours,
      };
    }
    return { rate: 0, isOt: false, otHours: 0 };
  }

  const rate = def.rates[position] ?? 0;
  const isOt = !!def.isOt;
  const otHours = def.otHours ?? (isOt && /^OT(\d+)$/i.test(def.code) ? parseInt(def.code.replace(/^OT/i, ''), 10) : 0);

  return { rate, isOt, otHours };
}

/**
 * Calculates monthly summary for a single staff member
 */
export function calculateStaffMonthlySummary(
  staff: Staff,
  daysInMonth: number,
  shiftsMap: Record<string, string>,
  shiftDefs: ShiftDefinition[]
): MonthlyStaffSummary {
  let regularShiftCount = 0;
  let regularShiftIncome = 0;
  let otCount = 0;
  let otHours = 0;
  let otIncome = 0;
  const shiftBreakdown: Record<string, number> = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${staff.id}_${day}`;
    const code = shiftsMap[key];
    if (!code || code.trim() === '') continue;

    const trimmedCode = code.trim();
    shiftBreakdown[trimmedCode] = (shiftBreakdown[trimmedCode] || 0) + 1;

    const { rate, isOt, otHours: hours } = getRateForShiftAndPosition(
      trimmedCode,
      staff.position,
      shiftDefs
    );

    if (isOt) {
      otCount += 1;
      otHours += hours;
      otIncome += rate;
    } else {
      regularShiftCount += 1;
      regularShiftIncome += rate;
    }
  }

  return {
    staffId: staff.id,
    staff,
    regularShiftCount,
    regularShiftIncome,
    otCount,
    otHours,
    otIncome,
    totalIncome: regularShiftIncome + otIncome,
    shiftBreakdown,
  };
}

/**
 * Calculates monthly summaries for all staff in a list
 */
export function calculateAllStaffMonthlySummaries(
  staffList: Staff[],
  daysInMonth: number,
  shiftsMap: Record<string, string>,
  shiftDefs: ShiftDefinition[]
): MonthlyStaffSummary[] {
  return staffList.map((staff) =>
    calculateStaffMonthlySummary(staff, daysInMonth, shiftsMap, shiftDefs)
  );
}

/**
 * Formats a currency amount into Thai Baht string with 2 decimals or whole baht
 */
export function formatBaht(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
