import { NextRequest, NextResponse } from 'next/server';
export function GET(request:NextRequest) { const week=request.nextUrl.searchParams.get('week')||''; return NextResponse.redirect(new URL(/^\d{4}-\d{2}-\d{2}$/.test(week)?`/week/${week}`:'/',request.url)); }
