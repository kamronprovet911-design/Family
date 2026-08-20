import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Моя семья', description: 'Семейная карта и чат', manifest: '/manifest.json' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru"><body>{children}</body></html>; }
