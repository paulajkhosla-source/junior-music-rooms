import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { distinctLabel, hiddenFromStaff } from '@/lib/weeks';
import { todayLondon } from '@/lib/constants';
import { formatSelectedWeek } from '@/lib/dates';
import { requireSession } from '@/lib/auth';
import { getCells,getWeeks } from '@/lib/data';
import PrintSheet from '@/components/PrintSheet';
import PrintButton from '@/components/PrintButton';
export const dynamic='force-dynamic';
export default async function Print({params}:{params:Promise<{start:string}>}) { const session=await requireSession(); const {start}=await params; const week=(await getWeeks()).find(w=>w.start_date===start); if(!week)notFound(); if(session.role==='staff' && hiddenFromStaff(week,todayLondon()))redirect('/?notice=hidden'); return <main className="print-page"><div className="print-toolbar no-print"><Link href={`/week/${start}`}>← Back to booking sheet</Link><PrintButton/></div><PrintSheet cells={await getCells(week.id)} weekStart={start} title={`JUNIOR MUSIC TEACHING ROOMS — ${formatSelectedWeek(start).range}${distinctLabel(week) ? ` · ${distinctLabel(week)}` : ''}`}/></main>; }
