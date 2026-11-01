import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { getWeeks } from '@/lib/data';
import { todayLondon } from '@/lib/constants';
export const dynamic='force-dynamic';
export default async function Home() { await requireSession(); const weeks=await getWeeks(); const today=todayLondon(); const week=weeks.filter(w=>w.start_date<=today).at(-1)??weeks[0]; if(week) redirect(`/week/${week.start_date}`); redirect('/admin'); }
