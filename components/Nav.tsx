import Link from 'next/link';
import { logout } from '@/app/actions';
import type { Session } from '@/lib/auth';
export function Nav({session}:{session:Session}) { return <header className="site-header no-print"><Link href="/" className="brand"><span className="brand-icon">♫</span><span>Junior Music <small>TEACHING ROOMS</small></span></Link><nav><Link href="/">Booking sheet</Link><Link href="/rota">Regular rota</Link><Link href="/help">Help</Link>{session.role==='admin'&&<Link href="/admin">Admin</Link>}</nav><div className="account"><span>{session.name}</span><form action={logout}><button className="link-button">Log out</button></form></div></header>; }
