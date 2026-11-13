import { addCivilDays } from './dates';
import { dateLabel } from './constants';
export type VisibilityWeek = { start_date:string; archived_at?:string|null; restored_at?:string|null };
export function hiddenFromStaff(week:VisibilityWeek, today:string):boolean {
  return !!week.archived_at || (!week.restored_at && addCivilDays(week.start_date, 6) < today);
}

export function distinctLabel(week:{start_date:string; label?:string|null}):string|null {
  const defaultTitle=`Week beginning ${dateLabel(week.start_date)}`;
  const label=week.label?.trim();
  return !label || label.toLocaleLowerCase('en-GB').includes(defaultTitle.toLocaleLowerCase('en-GB')) ? null : label;
}

export function weekTitle(week:{start_date:string; label?:string|null}):string {
  const label=distinctLabel(week);
  return label ? `${label} · ${dateLabel(week.start_date,false)}` : `Week beginning ${dateLabel(week.start_date)}`;
}
