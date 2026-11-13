'use client';
import { useState, useTransition } from 'react';
import { decideSwap } from '@/app/actions';
import { describeRanges } from '@/lib/swaps';
import type { SwapRequest } from '@/lib/requests';

export default function SwapRequests({requests,name,admin=false}:{requests:SwapRequest[];name:string;admin?:boolean}) {
 const [error,setError]=useState(''); const [pending,start]=useTransition();
 if(!requests.length)return null;
 const ranges=(cells:SwapRequest['from_cells'],week:string)=><span className="swap-ranges">{describeRanges(cells,week).map(line=><span key={line}>{line}</span>)}</span>;
 const item=(r:SwapRequest)=>{ const incoming=r.to_teacher===name; const week=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(r.start_date+'T12:00:00Z')); return <div key={r.id} className="swap-item"><div><strong>Week of {week}</strong>{!r.valid?<p>Bookings have changed – this swap can no longer go ahead.</p>:admin?<p><strong>{r.from_teacher}</strong> offered {ranges(r.from_cells,r.start_date)} for <strong>{r.to_teacher}</strong>&apos;s {ranges(r.to_cells,r.start_date)}</p>:incoming?<p><strong>{r.from_teacher}</strong> would like to swap.<br/>You give: {ranges(r.to_cells,r.start_date)}<br/>You get: {ranges(r.from_cells,r.start_date)}</p>:<p>Waiting for <strong>{r.to_teacher}</strong> to answer.<br/>You give: {ranges(r.from_cells,r.start_date)}<br/>You get: {ranges(r.to_cells,r.start_date)}</p>}{r.note&&<p>Note: {r.note}</p>}</div><form className="swap-actions" action={f=>{f.set('id',String(r.id));start(async()=>{try{await decideSwap(f);setError('')}catch(e){setError(e instanceof Error?e.message:'Unable to update request')}})}}>{admin?<button name="operation" value="cancel" disabled={pending}>Cancel</button>:incoming?<>{r.valid&&<button className="primary" name="operation" value="accept" disabled={pending}>Accept</button>}<button name="operation" value="decline" disabled={pending}>{r.valid?'Decline':'Dismiss'}</button></>:<button name="operation" value="cancel" disabled={pending}>Cancel</button>}</form></div> };
 const incoming=requests.filter(r=>r.to_teacher===name), outgoing=requests.filter(r=>r.from_teacher===name);
 return <section className="swap-banner">{admin?requests.map(item):<>{incoming.length>0&&<><h2>Waiting for your answer</h2>{incoming.map(item)}</>}{outgoing.length>0&&<><h2>Your requests</h2>{outgoing.map(item)}</>}</>}{error&&<p className="error" role="alert">{error}</p>}</section>;
}
