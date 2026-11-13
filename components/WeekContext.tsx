import type { SelectedWeek } from '@/lib/dates';
import { distinctLabel } from '@/lib/weeks';

export default function WeekContext({ week, label }: { week: SelectedWeek | null; label?: string | null }) {
  if (week) {
    const note = distinctLabel({ start_date: week.days[0].iso, label });
    return (
      <div className="week-context dated" role="region" aria-label="Selected week">
        <p className="eyebrow">SELECTED WEEK</p>
        <p className="week-context-range">{week.range}</p>
        {note ? <p className="week-context-note">{note}</p> : null}
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
