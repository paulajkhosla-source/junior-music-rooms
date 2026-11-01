import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { getCells } from '@/lib/data';
import PrintSheet from '@/components/PrintSheet';
import PrintButton from '@/components/PrintButton';
export const dynamic='force-dynamic';
export default async function Print(){await requireSession();return <main className="print-page"><div className="print-toolbar no-print"><Link href="/rota">← Back to regular rota</Link><PrintButton/></div><PrintSheet cells={await getCells()} title="JUNIOR MUSIC TEACHING ROOMS — Regular rota"/></main>}
