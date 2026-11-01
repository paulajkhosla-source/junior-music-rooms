import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHmac, timingSafeEqual } from 'node:crypto';
export type Session = {role:'staff'|'admin';name:string;exp:number};
const cookieName='jmr_session';
function secret() { if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is not configured'); return process.env.SESSION_SECRET; }
function signature(value:string) { return createHmac('sha256',secret()).update(value).digest('base64url'); }
export function equal(a:string,b:string) { const x=Buffer.from(a.trim().toLowerCase()), y=Buffer.from(b.trim().toLowerCase()); const hx=createHmac('sha256',secret()).update(x).digest(), hy=createHmac('sha256',secret()).update(y).digest(); return timingSafeEqual(hx,hy); }
export async function setSession(role:'staff'|'admin',name:string) { const exp=Math.floor(Date.now()/1000)+120*86400; const value=Buffer.from(JSON.stringify({role,name,exp})).toString('base64url'); (await cookies()).set(cookieName,`${value}.${signature(value)}`,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:120*86400}); }
export async function getSession():Promise<Session|null> { const raw=(await cookies()).get(cookieName)?.value; if (!raw) return null; const [value,sig,...rest]=raw.split('.'); if (!value||!sig||rest.length) return null; const expected=signature(value); const a=Buffer.from(sig), b=Buffer.from(expected); if(a.length!==b.length||!timingSafeEqual(a,b)) return null; try { const s=JSON.parse(Buffer.from(value,'base64url').toString()) as Session; return (s.role==='staff'||s.role==='admin')&&typeof s.name==='string'&&s.exp>Date.now()/1000?s:null; } catch { return null; } }
export async function requireSession() { const s=await getSession(); if(!s) redirect('/login'); return s; }
export async function requireAdmin() { const s=await requireSession(); if(s.role!=='admin') throw new Error('Music admin access required'); return s; }
export async function clearSession() { (await cookies()).delete(cookieName); }
