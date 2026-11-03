import { requireAdmin } from '@/lib/auth';
import { getTeachers,getWeeks } from '@/lib/data';
import { dateLabel, dayNames, slotLabel } from '@/lib/constants';
import { db } from '@/lib/db';
import { adminAction } from '@/app/actions';
import { Nav } from '@/components/Nav';
import { ConfirmDelete } from '@/components/ConfirmDelete';

type Details = {week?:number; cells?:{day:string;room:string;slot:string}[]; name?:string|null; request?:number; [k:string]:unknown};
function describe(d:Details, weeks:{id:number;start_date:string}[]):string {
  const parts:string[]=[];
  if (d.week!==undefined) { const w=weeks.find(x=>x.id===d.week); parts.push(w?`Week of ${new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(w.start_date+'T00:00:00Z'))}`:`Week ${d.week}`); }
  if (Array.isArray(d.cells) && d.cells.length) {
    const byGroup=new Map<string,string[]>();
    for (const c of d.cells) { const k=`${dayNames[c.day]??c.day} ${c.room}`; byGroup.set(k,[...(byGroup.get(k)??[]),c.slot]); }
    for (const [k,sl] of byGroup) { sl.sort(); const first=slotLabel(sl[0]).split('–')[0]; const last=slotLabel(sl[sl.length-1]).split('–')[1]; parts.push(`${k} ${first}–${last}`); }
  }
  if ('name' in d) parts.push(d.name?`→ ${d.name}`:'→ free');
  if (d.request!==undefined) parts.push(`swap request #${d.request}`);
  const fmt=(cells:unknown)=>Array.isArray(cells)?describe({cells} as Details,weeks):'';
  if (d.from) parts.push(`offers ${fmt(d.from)}`);
  if (d.to) parts.push(`for ${fmt(d.to)}`);
  if (d.teacher) parts.push(`with ${String(d.teacher)}`);
  for (const [k,v] of Object.entries(d)) if (!['week','cells','name','request','from','to','teacher'].includes(k)) parts.push(`${k}: ${typeof v==='object'?JSON.stringify(v):String(v)}`);
  return parts.join(' · ');
}
export const dynamic='force-dynamic';
export default async function Admin(){const session=await requireAdmin(); const [weeks,teachers,logs]=await Promise.all([getWeeks(),getTeachers(),db()`SELECT id,at,actor,action,details FROM audit_log ORDER BY at DESC LIMIT 300`]); return <><Nav session={session}/><main className="page narrow"><p className="eyebrow">MUSIC DEPARTMENT</p><h1>Administration</h1><p className="subtitle">Manage weeks, teachers and recent activity.</p><section className="content-card"><h2>Create a week</h2><p>Choose any date in the week; it will be moved back to Monday.</p><form action={adminAction} className="inline-form"><input type="hidden" name="operation" value="createWeek"/><label>Date<input type="date" name="date" required/></label><label>Label <small>(optional)</small><input name="label"/></label><button className="primary">Create week</button></form><h3>Available weeks</h3>{weeks.map(w=><div className="admin-row" key={w.id}><span>{w.label||`Week beginning ${dateLabel(w.start_date)}`} <small>· {w.overrides} changes</small></span><form action={adminAction}><input type="hidden" name="id" value={w.id}/><ConfirmDelete week={w.label?`“${w.label}” (week beginning ${dateLabel(w.start_date)})`:`week beginning ${dateLabel(w.start_date)}`} changes={Number(w.overrides)}/></form></div>)}</section><section className="content-card"><h2>Teachers</h2><form action={adminAction} className="inline-form"><input type="hidden" name="operation" value="addTeacher"/><label>Add a teacher<input name="name" required/></label><button className="primary">Add teacher</button></form>{teachers.map(t=><div className="admin-row" key={t.id}><form action={adminAction} className="teacher-form"><input type="hidden" name="id" value={t.id}/><input type="hidden" name="old" value={t.name}/><input name="name" defaultValue={t.name} aria-label={`Name for ${t.name}`} required/><span>{t.active?'Active':'Inactive'}</span><button name="operation" value="rename">Rename</button>{t.active&&<button name="operation" value="deactivate">Deactivate</button>}</form></div>)}</section><section className="content-card"><h2>Recent activity</h2><div className="table-scroll"><table className="audit"><thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th></tr></thead><tbody>{logs.map(l=><tr key={l.id}><td>{new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'}).format(new Date(l.at))}</td><td>{l.actor}</td><td>{l.action}</td><td>{describe(l.details as Details, weeks)}</td></tr>)}</tbody></table></div></section></main></>}
