import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { getCells,getWeeks } from '@/lib/data';
import { formatSelectedWeek } from '@/lib/dates';
import PrintSheet from '@/components/PrintSheet';
import PrintButton from '@/components/PrintButton';
export const dynamic='force-dynamic';
export default async function Print({params}:{params:Promise<{start:string}>}) { await requireSession(); const {start}=await params; const week=(await getWeeks()).find(w=>w.start_date===start); if(!week)notFound(); return <main className="print-page"><div className="print-toolbar no-print"><Link href={`/week/${start}`}>← Back to booking sheet</Link><PrintButton/></div><PrintSheet cells={await getCells(week.id)} weekStart={start} title={`JUNIOR MUSIC TEACHING ROOMS — ${formatSelectedWeek(start).range}${week.label?` · ${week.label}`:''}`}/></main>; }
