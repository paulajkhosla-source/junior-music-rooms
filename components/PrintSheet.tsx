import { days, dayNames, rooms, slots, lunchSlot, slotLabel, key, type Cell } from '@/lib/constants';
import { formatSelectedWeek } from '@/lib/dates';

export default function PrintSheet({ cells, title, weekStart }: { cells: Cell[]; title: string; weekStart?: string }) {
  const map = new Map(cells.map(cell => [key(cell.day, cell.room, cell.slot), cell]));
  const dated = weekStart ? formatSelectedWeek(weekStart) : null;
  const block = (day: string) => {
    const heading = dated?.days.find(item => item.day === day)?.heading ?? dayNames[day];
    return (
      <section className={`print-day ${day}`} key={day}>
        <h2>{heading}</h2>
        <table>
          <thead><tr><th>Time</th>{rooms.map(room => <th key={room}>{room}</th>)}</tr></thead>
          <tbody>
            {slots.map(slot => (
              <tr key={slot} className={slot === lunchSlot ? 'lunch' : ''}>
                <th>{slotLabel(slot)}</th>
                {rooms.map(room => <td key={room}>{slot === lunchSlot ? '' : map.get(key(day, room, slot))?.name}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  };
  return (
    <div className="print-sheet">
      <h1>{title}</h1>
      <div className="print-columns"><div>{days.slice(0, 3).map(block)}</div><div>{days.slice(3).map(block)}</div></div>
    </div>
  );
}
