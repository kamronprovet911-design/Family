'use client';
import Link from 'next/link'; import { Map, MessageCircle, Users, User } from 'lucide-react'; import { usePathname } from 'next/navigation';
const items=[['/map','Карта',Map],['/chats','Чаты',MessageCircle],['/family','Семья',Users],['/profile','Профиль',User]] as const;
export function BottomNavigation(){const p=usePathname();return <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-[1000] mx-auto flex max-w-[680px] justify-around border-t border-slate-200/60 bg-[var(--tg-card)] px-2 pt-2">{items.map(([href,label,Icon])=><Link key={href} href={href} className={`flex min-w-16 flex-col items-center gap-1 px-3 py-2 text-xs ${p.startsWith(href)?'text-brand':'text-[var(--tg-muted)]'}`}><Icon size={22}/>{label}</Link>)}</nav>}
