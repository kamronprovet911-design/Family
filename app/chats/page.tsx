'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { AppUser } from '@/types/database';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Chat } from '@/components/Chat';

function ChatsInner() { const [me, setMe] = useState<AppUser | null>(null); const [users, setUsers] = useState<AppUser[]>([]); const id = useSearchParams().get('user');
  useEffect(() => { const load = async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) return; const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single(); setMe(profile as AppUser); if (profile?.family_id) { const { data } = await supabase.from('users').select('*').eq('family_id', profile.family_id).neq('id', user.id).order('display_name'); setUsers((data || []) as AppUser[]); } }; void load(); const channel = supabase.channel('family-members').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, load).subscribe(); return () => { void supabase.removeChannel(channel); }; }, []);
  if (!me) return null; const peer = users.find((user) => user.id === id); if (peer) return <main className="app-shell"><Chat me={me} peer={peer} /><BottomNavigation /></main>;
  return <main className="app-shell p-4"><h1 className="text-2xl font-bold">Чаты</h1><p className="mt-1 text-sm text-[var(--tg-muted)]">Личные сообщения членов семьи</p><div className="mt-5 space-y-2">{users.map((user) => <Link href={`/chats?user=${user.id}`} key={user.id} className="flex items-center gap-3 rounded-2xl bg-[var(--tg-card)] p-4 shadow-card"><div className="grid h-11 w-11 place-items-center rounded-full bg-brand font-bold text-white">{user.display_name[0]}</div><div className="flex-1"><b>{user.display_name}</b><p className="text-xs text-[var(--tg-muted)]">{user.online ? '🟢 Онлайн' : '⚪ Не в сети'}</p></div></Link>)}{!users.length && <div className="rounded-2xl bg-[var(--tg-card)] p-4 text-sm text-[var(--tg-muted)] shadow-card">Других участников пока нет. Пусть близкие откроют Mini App и введут код приглашения из раздела «Семья».</div>}</div><BottomNavigation /></main>; }
export default function Chats() { return <Suspense fallback={<main className="app-shell" />}><ChatsInner /></Suspense>; }
