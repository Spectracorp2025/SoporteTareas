/**
 * Utility helpers for Colombia / Weekly scheduling (Monday to Saturday)
 */

export interface WeekDetails {
  weekId: string; // Format: "YYYY-Www", e.g. "2026-W31"
  weekNum: number;
  year: number;
  label: string;
  startDateStr: string; // "28 Jul"
  endDateStr: string; // "02 Ago 2026"
  isCurrentWeek: boolean;
}

export function getWeekDetails(inputDate?: string | Date): WeekDetails {
  const d = inputDate ? new Date(inputDate) : new Date();
  
  // Calculate Monday of the current week
  const day = d.getDay(); // 0 is Sunday, 1 is Monday...
  // In Colombia business week: Mon(1) .. Sat(6), Sun(0) is payday for previous week
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(23, 59, 59, 999);

  // ISO Week calculation
  const tempDate = new Date(monday.getTime());
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const firstThursday = tempDate.getTime();
  tempDate.setMonth(0, 1);
  if (tempDate.getDay() !== 4) {
    tempDate.setMonth(0, 1 + ((4 - tempDate.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.round((firstThursday - tempDate.getTime()) / 604800000);
  const year = monday.getFullYear();
  const weekId = `${year}-W${String(weekNum).padStart(2, '0')}`;

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const startDateStr = `${monday.getDate()} ${months[monday.getMonth()]}`;
  const endDateStr = `${saturday.getDate()} ${months[saturday.getMonth()]} ${year}`;
  const label = `Semana ${weekNum} (${startDateStr} - ${endDateStr})`;

  const nowDetails = getWeekDetailsNow();
  const isCurrentWeek = nowDetails.weekId === weekId;

  return {
    weekId,
    weekNum,
    year,
    label,
    startDateStr,
    endDateStr,
    isCurrentWeek
  };
}

// Internal reference helper to prevent recursion
function getWeekDetailsNow(): { weekId: string } {
  const d = new Date();
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diffToMonday);
  
  const tempDate = new Date(monday.getTime());
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const firstThursday = tempDate.getTime();
  tempDate.setMonth(0, 1);
  if (tempDate.getDay() !== 4) {
    tempDate.setMonth(0, 1 + ((4 - tempDate.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.round((firstThursday - tempDate.getTime()) / 604800000);
  const year = monday.getFullYear();
  return { weekId: `${year}-W${String(weekNum).padStart(2, '0')}` };
}

/**
 * Returns a list of past N weeks up to current week for history selectors
 */
export function getRecentWeeksList(count: number = 8): WeekDetails[] {
  const list: WeekDetails[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const pastDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const details = getWeekDetails(pastDate);
    if (!list.some(w => w.weekId === details.weekId)) {
      list.push(details);
    }
  }
  return list;
}
