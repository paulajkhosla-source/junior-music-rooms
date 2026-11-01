import seed from '@/data/seed.json';
export const { days, rooms, slots, labels, lunchSlot } = seed;
export const dayNames: Record<string,string> = {MON:'Monday',TUE:'Tuesday',WED:'Wednesday',THU:'Thursday',FRI:'Friday'};
export type Cell = {day:string; room:string; slot:string; name:string|null; template:string|null; overridden:boolean; updated_by:string|null};
export type Week = {id:number; start_date:string; label:string|null; overrides?:number};
export function key(day:string,room:string,slot:string) { return `${day}|${room}|${slot}`; }
export function owns(name:string|null, teacher:string) { return !!name && name.split('/').map(s=>s.trim()).includes(teacher); }
export function slotLabel(slot:string) { const [h,m]=slot.split(':').map(Number); const end=h*60+m+30; const fmt=(n:number)=>`${Math.floor(n/60)%12||12}.${String(n%60).padStart(2,'0')}`; return `${fmt(h*60+m)}–${fmt(end)}`; }
export function dateLabel(date:string, weekday=true) { return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',...(weekday?{weekday:'long' as const}:{}),day:'numeric',month:'long',year:'numeric'}).format(new Date(date+'T12:00:00Z')); }
export function todayLondon() { return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
export function validCell(day:string,room:string,slot:string) { return days.includes(day)&&rooms.includes(room)&&slots.includes(slot)&&slot!==lunchSlot; }
