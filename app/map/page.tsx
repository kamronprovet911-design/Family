'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { AppUser, Location } from '@/types/database';
import { BottomNavigation } from '@/components/BottomNavigation';
import { FamilySetup } from '@/components/FamilySetup';
import { AuthGate } from '@/components/AuthGate';
import { TelegramBootstrap } from '@/components/TelegramBootstrap';

const FamilyMap = dynamic(() => import('@/components/FamilyMap').then((x) => x.FamilyMap), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-[var(--tg-muted)]">Загрузка карты…</div> });
const INTERVAL_MS = 30_000;

function MapScreen() {
  const [me, setMe] = useState<AppUser | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationError, setLocationError] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentAt = useRef(0);
  const router = useRouter();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (!profile) return;
    setMe(profile as AppUser);
    if (profile.family_id) {
      const { data } = await supabase.from('locations').select('*, user:users(*)').order('updated_at', { ascending: false });
      setLocations(((data || []) as Location[]).filter((location) => location.user?.location_sharing_enabled));
    }
  }, []);

  const updateLocation = useCallback(async (user: AppUser, force = false) => {
    if (!user.location_sharing_enabled || !navigator.geolocation || document.visibilityState !== 'visible') return;
    if (!force && Date.now() - lastSentAt.current < INTERVAL_MS - 500) return;
    navigator.geolocation.getCurrentPosition(async (position) => {
      lastSentAt.current = Date.now(); setLocationError('');
      const { error } = await supabase.from('locations').upsert({ user_id: user.id, latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) setLocationError('Координаты не удалось сохранить.');
      await supabase.from('users').update({ online: true, last_seen: new Date().toISOString() }).eq('id', user.id);
    }, (error) => {
      if (error.code === error.PERMISSION_DENIED) setLocationError('Разреши доступ к геолокации для Telegram в настройках телефона.');
      else setLocationError('GPS временно недоступен. Проверь геолокацию и интернет.');
    }, { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 });
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase.channel('family-live').on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, load).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, load).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  useEffect(() => {
    if (!me) return;
    void updateLocation(me, true);
    timer.current = setInterval(() => { void updateLocation(me); }, INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void updateLocation(me, true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { if (timer.current) clearInterval(timer.current); document.removeEventListener('visibilitychange', onVisible); };
  }, [me?.id, me?.location_sharing_enabled, updateLocation]);

  if (!me) return null;
  if (!me.family_id) return <FamilySetup onDone={load} />;
  return <main className="app-shell relative isolate overflow-hidden">
    <div className="h-[100dvh]"><FamilyMap locations={locations} onChat={(id) => router.push(`/chats?user=${id}`)} /></div>
    <header className="absolute left-3 right-3 top-[max(12px,env(safe-area-inset-top))] z-[1200] flex items-center justify-between rounded-2xl bg-white/95 p-3 text-ink shadow-card backdrop-blur"><div><p className="text-xs text-slate-500">Моя семья</p><h1 className="font-bold">Карта близких</h1></div><div className="rounded-xl bg-blue-50 p-2 text-brand"><Users size={20} /></div></header>
    {locationError && <p className="absolute bottom-[92px] left-3 right-3 z-[1200] rounded-xl bg-red-50 p-3 text-center text-xs text-red-600 shadow-card">{locationError}</p>}
    <BottomNavigation />
  </main>;
}
export default function Page() { return <><TelegramBootstrap /><AuthGate><MapScreen /></AuthGate></>; }
