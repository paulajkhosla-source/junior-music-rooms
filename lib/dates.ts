const LONDON = 'Europe/London';
const DAY_INDEX: Record<string, number> = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4 };

export type SelectedWeekDay = {
  day: string;
  iso: string;
  dateLabel: string;
  heading: string;
  dayOfMonth: number;
};

export type SelectedWeek = {
  range: string;
  days: SelectedWeekDay[];
};

function parseCivilDate(iso: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error('Invalid date');
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== m - 1 || utc.getUTCDate() !== d) throw new Error('Invalid date');
  return { y, m, d };
}

/** Add calendar days without using the machine timezone. */
export function addCivilDays(iso: string, days: number): string {
  const { y, m, d } = parseCivilDate(iso);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const month = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc.getUTCDate()).padStart(2, '0');
  return `${utc.getUTCFullYear()}-${month}-${day}`;
}

/** Monday of the civil week that contains `iso`, using the same Monday rule as week creation. */
export function mondayOf(iso: string): string {
  const { y, m, d } = parseCivilDate(iso);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addCivilDays(iso, -((weekday + 6) % 7));
}

export function weekdayDate(weekStart: string, day: string): string {
  const offset = DAY_INDEX[day];
  if (offset === undefined) throw new Error('Invalid day');
  return addCivilDays(mondayOf(weekStart), offset);
}

function londonNoon(iso: string): Date {
  const { y, m, d } = parseCivilDate(iso);
  // Noon UTC stays on the same civil date in London (GMT or BST).
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function formatWeekdayName(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: LONDON, weekday: 'long' }).format(londonNoon(iso));
}

export function formatDayMonth(iso: string, withYear = false): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON,
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' as const } : {}),
  }).format(londonNoon(iso));
}

/** British heading such as "Monday 9 November", without a comma. */
export function formatWeekdayDate(iso: string, withYear = false): string {
  return `${formatWeekdayName(iso)} ${formatDayMonth(iso, withYear)}`;
}

export function formatSelectedWeek(weekStart: string): SelectedWeek {
  const order = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  const isos = order.map(day => ({ day, iso: weekdayDate(weekStart, day) }));
  const crossYear = isos[0].iso.slice(0, 4) !== isos[4].iso.slice(0, 4);
  const days = isos.map(item => {
    const withYear = crossYear && item.iso.slice(0, 4) !== isos[0].iso.slice(0, 4);
    const dateLabel = formatDayMonth(item.iso, withYear);
    return {
      ...item,
      dateLabel,
      heading: `${formatWeekdayName(item.iso)} ${dateLabel}`,
      dayOfMonth: Number(item.iso.slice(8, 10)),
    };
  });
  const range = crossYear
    ? `${formatWeekdayDate(isos[0].iso, true)} – ${formatWeekdayDate(isos[4].iso, true)}`
    : `${formatWeekdayDate(isos[0].iso)} – ${formatWeekdayDate(isos[4].iso, true)}`;
  return { range, days };
}
