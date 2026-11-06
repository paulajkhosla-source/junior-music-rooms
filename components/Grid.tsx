'use client';
import { useLayoutEffect, useRef, useState, useTransition } from 'react';
import { changeCells, editRota, proposeSwap } from '@/app/actions';
import WeekContext from '@/components/WeekContext';
import { days, dayNames, rooms, slots, labels, lunchSlot, slotLabel, key, owns, type Cell } from '@/lib/constants';
import { formatSelectedWeek } from '@/lib/dates';
import type { Session } from '@/lib/auth';

export default function Grid({ cells, session, week, teachers, initialDay, weekStart, weekLabel }: { cells: Cell[]; session: Session; week?: number; teachers: string[]; initialDay: string; weekStart?: string; weekLabel?: string | null }) {
  const [day, setDay] = useState(initialDay);
  const [selected, setSelected] = useState<Cell | null>(null);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const [swap, setSwap] = useState(false);
  const [target, setTarget] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const dated = weekStart ? formatSelectedWeek(weekStart) : null;
  const dayText = (dayCode: string) => dated?.days.find(item => item.day === dayCode)?.heading ?? dayNames[dayCode];
  const map = new Map(cells.map(cell => [key(cell.day, cell.room, cell.slot), cell]));
  const mine = cells.filter(cell => owns(cell.name, session.name) && cell.slot !== lunchSlot);
  const other = cells.filter(cell => cell.name && !cell.name.includes('/') && cell.name !== session.name && teachers.includes(cell.name) && cell.slot !== lunchSlot);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const sticky = stickyRef.current;
    if (!root || !sticky) return;
    const apply = () => {
      const height = Math.ceil(sticky.getBoundingClientRect().height);
      root.style.setProperty('--sticky-offset', `${height}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(sticky);
    return () => observer.disconnect();
  }, [weekStart, weekLabel, dated?.range]);
  function submit(action: (form: FormData) => Promise<void>, form: FormData) {
    setError('');
    start(async () => {
      try {
        await action(form);
        setSelected(null);
        setSwap(false);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Something went wrong. Please try again.');
      }
    });
  }
  return (
    <div className="timetable" ref={rootRef}>
      <div className="timetable-sticky" ref={stickyRef}>
        <WeekContext week={dated} label={weekLabel} />
        <div className="day-tabs no-print" aria-label="Choose a day">
          {days.map(code => {
            const info = dated?.days.find(item => item.day === code);
            return (
              <button type="button" key={code} className={day === code ? 'active' : ''} aria-pressed={day === code} onClick={() => setDay(code)}>
                {dayNames[code].slice(0, 3)}
                {info && <small>{info.dayOfMonth}</small>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid-stack">
        {days.map(code => {
          const info = dated?.days.find(item => item.day === code);
          return (
            <section key={code} className={`day-block ${code} ${day === code ? 'chosen' : ''}`}>
              <div className="day-heading">
                <h2>{info ? <><span className="day-name">{dayNames[code]}</span><span className="day-date">{info.dateLabel}</span></> : dayNames[code]}</h2>
                <span>TEACHING ROOMS</span>
              </div>
              <div className="table-scroll">
                <table className="booking-table">
                  <thead><tr><th>Time</th>{rooms.map(room => <th key={room}>{room}</th>)}</tr></thead>
                  <tbody>
                    {slots.map(slot => (
                      <tr key={slot} className={slot === lunchSlot ? 'lunch' : ''}>
                        <th>{slotLabel(slot)}</th>
                        {rooms.map(room => {
                          const cell = map.get(key(code, room, slot))!;
                          const own = owns(cell.name, session.name);
                          return (
                            <td key={room} className={`${!cell.name ? 'free' : ''} ${own ? 'own' : ''} ${cell.name && labels.includes(cell.name) ? 'label-cell' : ''} ${cell.overridden ? 'changed' : ''}`}>
                              {slot === lunchSlot ? <span>{room === rooms[3] ? 'Lunch' : ''}</span> : (
                                <button onClick={() => { setSelected(cell); setError(''); setSwap(false); }} aria-label={`${dayText(code)}, ${room}, ${slotLabel(slot)}: ${cell.name || 'Free'}${cell.overridden ? ', changed this week' : ''}`}>
                                  {cell.name || 'Free'}{cell.overridden && <span className="dot" title="Changed this week"> •</span>}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
      {week && session.role === 'staff' && (
        <details className="my-week">
          <summary>My week <span>{mine.length} bookings</span></summary>
          <p>Select the slots you no longer need, then release them together.</p>
          <form action={form => submit(changeCells, form)}>
            <input type="hidden" name="week" value={week} />
            <input type="hidden" name="operation" value="release" />
            <div className="booking-list">
              {mine.map(cell => (
                <label key={key(cell.day, cell.room, cell.slot)}>
                  <input type="checkbox" name="selected" value={key(cell.day, cell.room, cell.slot)} />
                  {dayText(cell.day)} · {cell.room} · {slotLabel(cell.slot)}
                </label>
              ))}
            </div>
            <button className="primary" disabled={pending}>Release selected</button>
          </form>
          {error && !selected && <p className="error" role="alert">{error}</p>}
        </details>
      )}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onClick={event => event.stopPropagation()}>
            <button className="close" onClick={() => setSelected(null)} aria-label="Close">×</button>
            <p className="eyebrow">{week ? 'WEEKLY BOOKING' : 'REGULAR ROTA'}</p>
            <h2 id="dialog-title">{dayText(selected.day)} · {selected.room}</h2>
            <p>{slotLabel(selected.slot)} <strong> / {selected.name || 'Free'}</strong></p>
            {error && <p className="error" role="alert">{error}</p>}
            {(!week && session.role === 'staff') ? <p>The regular rota is managed by music admin.</p> : week && session.role === 'staff' && selected.name && !owns(selected.name, session.name) ? <p>This room is booked by {selected.name}.</p> : (
              <form action={form => submit(!week ? editRota : swap ? proposeSwap : changeCells, form)}>
                <input type="hidden" name="day" value={selected.day} />
                <input type="hidden" name="room" value={selected.room} />
                <input type="hidden" name="slot" value={selected.slot} />
                {week && <input type="hidden" name="week" value={week} />}
                <label>To slot<select name="end" defaultValue={selected.slot}>{slots.slice(slots.indexOf(selected.slot)).filter(slot => slot !== lunchSlot && !(selected.slot < lunchSlot && slot > lunchSlot)).map(slot => <option key={slot} value={slot}>{slotLabel(slot)}</option>)}</select></label>
                {!week ? (
                  <>
                    <label>Name<input name="name" list="names" defaultValue={selected.name?.split('/')[0] || ''} /></label>
                    <label>Second name <small>(optional, for a shared room)</small><input name="second" list="names" defaultValue={selected.name?.split('/')[1] || ''} /></label>
                    <datalist id="names">{[...teachers, ...labels].map(name => <option key={name} value={name} />)}</datalist>
                    <div className="dialog-actions">
                      <button className="primary" name="operation" value="apply" disabled={pending}>Apply to regular rota</button>
                      <button name="operation" value="clear" disabled={pending}>Clear these slots</button>
                    </div>
                  </>
                ) : session.role === 'admin' ? (
                  <>
                    <label>Booking name <small>(leave blank for free)</small><input name="name" list="names" defaultValue={selected.name || ''} /></label>
                    <datalist id="names">{[...teachers, ...labels].map(name => <option key={name} value={name} />)}</datalist>
                    <div className="dialog-actions">
                      <button className="primary" name="operation" value="admin" disabled={pending}>Save for this week</button>
                      <button name="operation" value="reset" disabled={pending}>Reset to regular rota</button>
                    </div>
                  </>
                ) : swap ? (
                  <>
                    <label>Swap with<select name="target" required value={target} onChange={event => setTarget(event.target.value)}><option value="" disabled>Choose another teacher’s booking</option>{other.map(cell => <option key={key(cell.day, cell.room, cell.slot)} value={key(cell.day, cell.room, cell.slot)}>{cell.name} · {dayText(cell.day)} · {cell.room} · {slotLabel(cell.slot)}</option>)}</select></label>
                    {target && <label>Swap through<select name="targetEnd" defaultValue={target.split('|')[2]}>{slots.slice(slots.indexOf(target.split('|')[2])).filter(slot => slot !== lunchSlot && !(target.split('|')[2] < lunchSlot && slot > lunchSlot)).map(slot => <option key={slot} value={slot}>{slotLabel(slot)}</option>)}</select></label>}
                    <label>Note <small>(optional)</small><input name="note" /></label>
                    <button className="primary" disabled={pending}>Send swap request</button>
                    <button type="button" onClick={() => setSwap(false)}>Back</button>
                  </>
                ) : (
                  <div className="dialog-actions">
                    {owns(selected.name, session.name) ? (
                      <>
                        <button className="primary" name="operation" value="release" disabled={pending}>Release this slot for this week</button>
                        <button type="button" onClick={() => setSwap(true)}>Propose swap</button>
                      </>
                    ) : !selected.name && <button className="primary" name="operation" value="claim" disabled={pending}>Claim for this week</button>}
                    {selected.overridden && (owns(selected.template, session.name) || selected.updated_by === session.name) && <button name="operation" value="reset" disabled={pending}>Restore regular booking</button>}
                  </div>
                )}
              </form>
            )}
            {week && session.role === 'staff' && owns(selected.name, session.name) && !swap && (
              <form action={form => submit(changeCells, form)}>
                <input type="hidden" name="week" value={week} />
                <input type="hidden" name="operation" value="release" />
                {mine.filter(cell => cell.day === selected.day).map(cell => <input key={key(cell.day, cell.room, cell.slot)} type="hidden" name="selected" value={key(cell.day, cell.room, cell.slot)} />)}
                <button className="text-action" disabled={pending}>Release my whole day</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
