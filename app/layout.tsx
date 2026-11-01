import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Junior Music Teaching Rooms',description:'Junior music room bookings'};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en-GB"><body>{children}</body></html>; }
