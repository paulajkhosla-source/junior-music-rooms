import { db } from './db';
import { getCells, getWeeks } from './data';
import { hiddenFromStaff } from './weeks';
import { todayLondon } from './constants';
import { requestValid, type Coordinate } from './swaps';
export type SwapRequest = {id:number;week_id:number;start_date:string;from_teacher:string;to_teacher:string;from_cells:Coordinate[];to_cells:Coordinate[];note:string|null;valid:boolean};
export async function pendingRequests(name?:string):Promise<SwapRequest[]> {
 const sql=db(); const weeks=await getWeeks(); const visible=weeks.filter(w=>!hiddenFromStaff(w,todayLondon()));
 const rows=await sql`SELECT r.id,r.week_id,w.start_date::text,r.from_teacher,r.to_teacher,r.from_cells,r.to_cells,r.note FROM swap_requests r JOIN weeks w ON w.id=r.week_id WHERE r.status='pending' AND (${name??null}::text IS NULL OR r.from_teacher=${name??null} OR r.to_teacher=${name??null}) ORDER BY r.created_at` as Omit<SwapRequest,'valid'>[];
 const selected=rows.filter(r=>visible.some(w=>w.id===r.week_id)); const cellSets=new Map(await Promise.all([...new Set(selected.map(r=>r.week_id))].map(async id=>[id,await getCells(id)] as const)));
 return selected.map(r=>({...r,valid:requestValid(r.from_cells,r.to_cells,r.from_teacher,r.to_teacher,cellSets.get(r.week_id)!)}));
}
