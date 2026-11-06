import type { SelectedWeek } from '@/lib/dates';

export default function WeekContext({ week, label }: { week: SelectedWeek | null; label?: string | null }) {
  if (week) {
    return (
      <div className="week-context dated" role="region" aria-label="Selected week">
        <p className="eyebrow">SELECTED WEEK</p>
        <p className="week-context-range">{week.range}</p>
        {label ? <p className="week-context-note">{label}</p> : null}
      </div>
    );
  }
  return (
    <div className="week-context template" role="region" aria-label="Regular rota">
      <p className="eyebrow">REGULAR ROTA</p>
      <p className="week-context-range">Standard template — no calendar dates</p>
    </div>
  );
}
