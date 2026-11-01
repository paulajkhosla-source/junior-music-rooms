import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { getCells,getTeachers } from '@/lib/data';
import { Nav } from '@/components/Nav';
import Grid from '@/components/Grid';
export const dynamic='force-dynamic';
export default async function Rota(){const session=await requireSession(); const [cells,teachers]=await Promise.all([getCells(),getTeachers(true)]); return <><Nav session={session}/><main className="page"><div className="page-top"><div><p className="eyebrow">THE STANDARD SCHEDULE</p><h1>Regular rota</h1><p className="subtitle">Changes to the regular rota apply to every week, except slots that have been changed for a particular week.</p></div><Link className="button" href="/rota/print">↗ &nbsp;Print</Link></div><Grid cells={cells} session={session} teachers={teachers.map(t=>t.name)} initialDay="MON"/></main></>}
