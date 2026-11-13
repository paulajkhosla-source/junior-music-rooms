import { pendingRequests } from '@/lib/requests';
import Link from 'next/link';
import { logout } from '@/app/actions';
import type { Session } from '@/lib/auth';
export async function Nav({session}:{session:Session}) { const count=session.role==='staff'?(await pendingRequests(session.name)).filter(r=>r.to_teacher===session.name && r.valid).length:0; return <header className="site-header no-print"><Link href="/" className="brand"><span className="brand-icon">♫</span><span>Junior Music <small>TEACHING ROOMS</small></span></Link><nav><Link href="/">Booking sheet{count>0&&<span className="request-badge" aria-label={`${count} swap ${count===1?'request':'requests'} waiting for your answer`}>{count}</span>}</Link><Link href="/rota">Regular rota</Link><Link href="/help">Help</Link>{session.role==='admin'&&<Link href="/admin">Admin</Link>}</nav><div className="account"><span>{session.name}</span><form action={logout}><button className="link-button">Log out</button></form></div></header>; }
