import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { getWeeks } from '@/lib/data';
import { hiddenFromStaff } from '@/lib/weeks';
import { todayLondon } from '@/lib/constants';
export const dynamic='force-dynamic';
export default async function Home({searchParams}:{searchParams:Promise<{notice?:string}>}) { const {notice}=await searchParams; const session=await requireSession(); const today=todayLondon(); const weeks=(await getWeeks()).filter(w=>session.role==='admin' ? !w.archived_at : !hiddenFromStaff(w,today)); const week=weeks.filter(w=>w.start_date<=today).at(-1)??weeks[0]; if(week) redirect(`/week/${week.start_date}${notice==='hidden'?'?notice=hidden':''}`); redirect('/admin'); }
