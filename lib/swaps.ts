import { days, rooms, slots, lunchSlot, slotLabel, type Cell } from './constants';
import { weekdayDate } from './dates';
export type Coordinate = {day:string;room:string;slot:string};
const compare = (a:Coordinate,b:Coordinate) => days.indexOf(a.day)-days.indexOf(b.day) || rooms.indexOf(a.room)-rooms.indexOf(b.room) || slots.indexOf(a.slot)-slots.indexOf(b.slot);
export function bookingBlocks<T extends Coordinate & {name:string|null}>(cells:T[]):T[][] {
  const sorted=[...cells].filter(c=>c.name && c.slot!==lunchSlot).sort(compare);
  const blocks:T[][]=[];
  for(const cell of sorted) { const block=blocks.at(-1), last=block?.at(-1); if(last && last.day===cell.day && last.room===cell.room && last.name===cell.name && slots.indexOf(cell.slot)===slots.indexOf(last.slot)+1) block!.push(cell); else blocks.push([cell]); }
  return blocks;
}
export function describeRanges(cells:Coordinate[], weekStart?:string):string[] {
  const blocks=bookingBlocks(cells.map(c=>({...c,name:'booking'})));
  return blocks.map(block=>{ const first=block[0], last=block[block.length-1]; const day=weekStart ? new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(weekdayDate(weekStart,first.day)+'T12:00:00Z')) : first.day; return `${day} · ${first.room} · ${slotLabel(first.slot).split('–')[0]}–${slotLabel(last.slot).split('–')[1]}`; });
}
export function requestValid(from:Coordinate[], to:Coordinate[], fromName:string, toName:string, cells:Pick<Cell,'day'|'room'|'slot'|'name'>[]):boolean {
  return from.length>0 && to.length>0 && [...from.map(c=>[c,fromName] as const),...to.map(c=>[c,toName] as const)].every(([c,name])=>cells.some(x=>x.day===c.day&&x.room===c.room&&x.slot===c.slot&&x.name===name));
}
