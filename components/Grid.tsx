'use client';
import { useLayoutEffect, useRef, useState, useTransition } from 'react';
import { changeCells, editRota, proposeSwap, adminSwap } from '@/app/actions';
import { bookingBlocks } from '@/lib/swaps';
import WeekContext from '@/components/WeekContext';
import { days, dayNames, rooms, slots, labels, lunchSlot, slotLabel, key, owns, type Cell } from '@/lib/constants';
import { formatSelectedWeek } from '@/lib/dates';
import type { Session } from '@/lib/auth';

function OfferPicker({blocks, count, dayText, initial=0}:{blocks:Cell[][]; count:number; dayText:(day:string)=>string; initial?:number}) {
  const [index,setIndex]=useState(initial), [from,setFrom]=useState(0), [through,setThrough]=useState(Math.min(count,blocks[initial].length)-1);
  const block=blocks[index];
  return <><label>Offer in exchange<select value={index} onChange={e=>{const n=Number(e.target.value);setIndex(n);setFrom(0);setThrough(Math.min(count,blocks[n].length)-1)}}>{blocks.map((b,i)=><option key={key(b[0].day,b[0].room,b[0].slot)} value={i}>{dayText(b[0].day)} · {b[0].room} · {slotLabel(b[0].slot).split('–')[0]}–{slotLabel(b.at(-1)!.slot).split('–')[1]}</option>)}</select></label><input type="hidden" name="offer" value={JSON.stringify(block.map(({day,room,slot})=>({day,room,slot})))}/><label>Offer from<select name="offerStart" value={from} onChange={e=>{const n=Number(e.target.value);setFrom(n);setThrough(Math.max(n,through))}}>{block.map((c,i)=><option key={c.slot} value={i}>{slotLabel(c.slot)}</option>)}</select></label><label>Offer through<select name="offerEnd" value={through} onChange={e=>setThrough(Number(e.target.value))}>{block.map((c,i)=>i>=from&&<option key={c.slot} value={i}>{slotLabel(c.slot)}</option>)}</select></label></>;
}

export default function Grid({ cells, session, week, teachers, initialDay, weekStart, weekLabel, readOnly=false }: { cells: Cell[]; session: Session; week?: number; teachers: string[]; initialDay: string; weekStart?: string; weekLabel?: string | null; readOnly?: boolean }) {
  const [day, setDay] = useState(initialDay);
  const [selected, setSelected] = useState<Cell | null>(null);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const [swap, setSwap] = useState(false);
  const [adminTarget, setAdminTarget] = useState('');
  const [adminTeacher, setAdminTeacher] = useState('');
  const [targetEnd, setTargetEnd] = useState('');
  const [target, setTarget] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const dated = weekStart ? formatSelectedWeek(weekStart) : null;
  const dayText = (dayCode: string) => dated?.days.find(item => item.day === dayCode)?.heading ?? dayNames[dayCode];
  const map = new Map(cells.map(cell => [key(cell.day, cell.room, cell.slot), cell]));
  const mine = cells.filter(cell => owns(cell.name, session.name) && cell.slot !== lunchSlot);
  const offers = bookingBlocks(cells.filter(cell => cell.name === session.name));
  const adminBlocks = bookingBlocks(cells.filter(c=>!!c.name && teachers.includes(c.name) && !labels.includes(c.name) && !c.name.includes('/') && c.name!==selected?.name));
  const adminTeachers = [...new Set(adminBlocks.map(b=>b[0].name!))].sort((a,b)=>a.localeCompare(b));
  const other = cells.filter(cell => cell.name && !cell.name.includes('/') && cell.name !== session.name && teachers.includes(cell.name) && !labels.includes(cell.name) && cell.slot !== lunchSlot);
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
                                <button onClick={() => { setSelected(cell); setError(''); setSwap(false); setTarget(''); setTargetEnd(cell.slot); }} aria-label={`${dayText(code)}, ${room}, ${slotLabel(slot)}: ${cell.name || 'Free'}${cell.overridden ? ', changed this week' : ''}`}>
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
            {readOnly ? <p>Archived – read only.</p> : (!week && session.role === 'staff') ? <p>The regular rota is managed by music admin.</p> : week && session.role === 'staff' && selected.name && !owns(selected.name, session.name) ? <><p>Booked by {selected.name}.</p>{selected.name.includes('/') || labels.includes(selected.name) || !teachers.includes(selected.name) ? <p>Shared bookings and labels cannot be swapped.</p> : !offers.length ? <p>You need a booking in this week to offer in exchange.</p> : <form action={form=>submit(proposeSwap,form)}><input type="hidden" name="week" value={week}/><input type="hidden" name="target" value={key(selected.day,selected.room,selected.slot)}/><label>Their slots through<select name="targetEnd" value={targetEnd} onChange={e=>setTargetEnd(e.target.value)}>{slots.slice(slots.indexOf(selected.slot)).filter((slot, index, all)=>all.slice(0,index+1).every(s=>map.get(key(selected.day,selected.room,s))?.name===selected.name && s!==lunchSlot)).map(slot=><option key={slot} value={slot}>{slotLabel(slot)}</option>)}</select></label><OfferPicker key={targetEnd} blocks={offers} count={slots.indexOf(targetEnd)-slots.indexOf(selected.slot)+1} dayText={dayText}/><label>Note <small>(optional)</small><input name="note"/></label><button className="primary" disabled={pending}>Ask {selected.name} to swap</button></form>}</> : (
              <form action={form => submit(!week ? editRota : swap ? (session.role==='admin' ? adminSwap : proposeSwap) : changeCells, form)}>
                <input type="hidden" name="day" value={selected.day} />
                <input type="hidden" name="room" value={selected.room} />
                <input type="hidden" name="slot" value={selected.slot} />
                {week && <input type="hidden" name="week" value={week} />}
                {!(swap && session.role==='staff') && <label>To slot<select name="end" defaultValue={selected.slot}>{slots.slice(slots.indexOf(selected.slot)).filter(slot => slot !== lunchSlot && !(selected.slot < lunchSlot && slot > lunchSlot)).map(slot => <option key={slot} value={slot}>{slotLabel(slot)}</option>)}</select></label>}
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
                    {swap ? <><input type="hidden" name="first" value={selected.name || ''}/><input type="hidden" name="second" value={adminTeacher}/><label>Teacher<select required value={adminTeacher} onChange={event=>{setAdminTeacher(event.target.value);setAdminTarget('')}}><option value="" disabled>Choose a teacher</option>{adminTeachers.map(name=><option key={name}>{name}</option>)}</select></label>{adminTeacher && <label>Their booking<select name="other" required value={adminTarget} onChange={event=>setAdminTarget(event.target.value)}><option value="" disabled>Choose a booking</option>{adminBlocks.filter(block=>block[0].name===adminTeacher).map(block=><option key={key(block[0].day,block[0].room,block[0].slot)} value={JSON.stringify(block)}>{dayText(block[0].day)} · {block[0].room} · {slotLabel(block[0].slot).split('–')[0]}–{slotLabel(block.at(-1)!.slot).split('–')[1]}</option>)}</select></label>}{adminTarget && <label>Their slots through<select name="otherEnd" key={adminTarget}>{(JSON.parse(adminTarget) as Cell[]).map(c=><option key={c.slot} value={c.slot}>{slotLabel(c.slot)}</option>)}</select></label>}<div className="dialog-actions"><button className="primary" disabled={pending}>Swap these bookings</button><button type="button" onClick={()=>setSwap(false)}>Back</button></div></> : <><label>Booking name <small>(leave blank for free)</small><input name="name" list="names" defaultValue={selected.name || ''} /></label>
                    <datalist id="names">{[...teachers, ...labels].map(name => <option key={name} value={name} />)}</datalist>
                    <div className="dialog-actions">
                      <button className="primary" name="operation" value="admin" disabled={pending}>Save for this week</button>
                      <button name="operation" value="reset" disabled={pending}>Reset to regular rota</button>{selected.name && teachers.includes(selected.name) && !labels.includes(selected.name) && !selected.name.includes('/') && <button type="button" onClick={()=>{setAdminTarget(''); setAdminTeacher(''); setSwap(true)}}>Swap with another booking</button>}
                    </div></>}
                  </>
                ) : swap ? (
                  <>
                    <label>Swap with<select name="target" required value={target} onChange={event => {setTarget(event.target.value); setTargetEnd(event.target.value.split('|')[2])}}><option value="" disabled>Choose another teacher’s booking</option>{other.map(cell => <option key={key(cell.day, cell.room, cell.slot)} value={key(cell.day, cell.room, cell.slot)}>{cell.name} · {dayText(cell.day)} · {cell.room} · {slotLabel(cell.slot)}</option>)}</select></label>
                    {target && <label>Swap through<select name="targetEnd" value={targetEnd} onChange={e=>setTargetEnd(e.target.value)}>{slots.slice(slots.indexOf(target.split('|')[2])).filter((slot,index,all) => all.slice(0,index+1).every(s => s !== lunchSlot && map.get(key(target.split('|')[0],target.split('|')[1],s))?.name === map.get(target)?.name)).map(slot => <option key={slot} value={slot}>{slotLabel(slot)}</option>)}</select></label>}
                    {offers.length>0 && <OfferPicker key={target+'|'+targetEnd} blocks={offers} initial={Math.max(0,offers.findIndex(b=>b.some(c=>key(c.day,c.room,c.slot)===key(selected.day,selected.room,selected.slot))))} count={target ? slots.indexOf(targetEnd)-slots.indexOf(target.split('|')[2])+1 : 1} dayText={dayText}/>}
                    <label>Note <small>(optional)</small><input name="note" /></label>
                    <button className="primary" disabled={pending}>Send swap request</button>
                    <button type="button" onClick={() => setSwap(false)}>Back</button>
                  </>
                ) : (
                  <div className="dialog-actions">
                    {owns(selected.name, session.name) ? (
                      <>
                        <button className="primary" name="operation" value="release" disabled={pending}>Release this slot for this week</button>
                        {selected.name===session.name && <button type="button" onClick={() => setSwap(true)}>Propose swap</button>}
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
