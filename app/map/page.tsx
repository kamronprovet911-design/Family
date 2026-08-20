'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin, ShieldCheck, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { AppUser, Location } from '@/types/database';
import { BottomNavigation } from '@/components/BottomNavigation';
import { FamilySetup } from '@/components/FamilySetup';
import { AuthGate } from '@/components/AuthGate';
import { TelegramBootstrap } from '@/components/TelegramBootstrap';

const FamilyMap = dynamic(() => import('@/components/FamilyMap').then((x) => x.FamilyMap), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-[var(--tg-muted)]">Загрузка карты…</div>,
});

type GeoStatus = 'off' | 'locating' | 'active' | 'denied' | 'error';
const LOCATION_KEY = 'family-location-tracking-enabled';

function MapScreen() {
  const [me, setMe] = useState<AppUser | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [sharing, setSharing] = useState(false);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('off');
  const [geoError, setGeoError] = useState('');
  const lastSentAt = useRef(0);
  const watchId = useRef<number | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (!profile) return;
    setMe(profile as AppUser);
    const shouldTrack = profile.location_sharing_enabled && localStorage.getItem(LOCATION_KEY) === 'true';
    setSharing(shouldTrack);
    setGeoStatus(shouldTrack ? 'active' : 'off');
    if (profile.family_id) {
      const { data } = await supabase.from('locations').select('*, user:users(*)').order('updated_at', { ascending: false });
      setLocations(((data || []) as Location[]).filter((location) => location.user?.location_sharing_enabled));
    }
  }, []);

  const savePosition = useCallback(async (position: GeolocationPosition, userId: string) => {
    if (Date.now() - lastSentAt.current < 30_000) return;
    lastSentAt.current = Date.now();
    const { error } = await supabase.from('locations').upsert({
      user_id: userId,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) setGeoError('Не удалось сохранить координаты. Повторите попытку.');
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase.channel('family-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, load)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, load)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  useEffect(() => {
    if (!me || !sharing || !navigator.geolocation) return;
    watchId.current = navigator.geolocation.watchPosition(
      (position) => { setGeoStatus('active'); void savePosition(position, me.id); },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoStatus('denied');
          setGeoError('Доступ к геолокации запрещён в настройках Telegram или телефона.');
          localStorage.removeItem(LOCATION_KEY);
        } else { setGeoStatus('error'); setGeoError('Не удалось определить координаты. Проверьте GPS и интернет.'); }
      },
      { enableHighAccuracy: true, maximumAge: 20_000, timeout: 20_000 },
    );
    return () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); watchId.current = null; };
  }, [me?.id, sharing, savePosition]);

  async function enableLocation() {
    if (!me || !navigator.geolocation) { setGeoError('Геолокация не поддерживается этим устройством.'); return; }
    setGeoStatus('locating'); setGeoError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        localStorage.setItem(LOCATION_KEY, 'true');
        await supabase.from('users').update({ location_sharing_enabled: true, online: true, last_seen: new Date().toISOString() }).eq('id', me.id);
        await savePosition(position, me.id);
        setSharing(true); setGeoStatus('active');
      },
      (error) => {
        setGeoStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'error');
        setGeoError(error.code === error.PERMISSION_DENIED ? 'Разреши геолокацию для Telegram в настройках телефона.' : 'GPS пока недоступен. Попробуй выйти на улицу и повторить.');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    );
  }

  async function disableLocation() {
    localStorage.removeItem(LOCATION_KEY); setSharing(false); setGeoStatus('off'); setGeoError('');
    if (me) await supabase.from('users').update({ location_sharing_enabled: false }).eq('id', me.id);
  }

  if (!me) return null;
  if (!me.family_id) return <FamilySetup onDone={load} />;

  return <main className="app-shell relative isolate overflow-hidden">
    <div className="h-[100dvh]"><FamilyMap locations={locations} onChat={(id) => router.push(`/chats?user=${id}`)} /></div>
    <header className="absolute left-3 right-3 top-[max(12px,env(safe-area-inset-top))] z-[1200] flex items-center justify-between rounded-2xl bg-white/95 p-3 text-ink shadow-card backdrop-blur">
      <div><p className="text-xs text-slate-500">Моя семья</p><h1 className="font-bold">Карта близких</h1></div>
      <div className="rounded-xl bg-blue-50 p-2 text-brand"><Users size={20} /></div>
    </header>
    <section className="absolute bottom-[104px] left-3 right-3 z-[1200] rounded-2xl bg-white/95 p-3 text-ink shadow-card backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div><p className="flex items-center gap-2 text-sm font-semibold"><MapPin size={18} className="text-brand" />Передача геолокации</p><p className="mt-1 text-xs text-slate-500">{geoStatus === 'active' ? 'Включена · обновление до 30 сек.' : geoStatus === 'locating' ? 'Определяем координаты…' : 'Выключена'}</p></div>
        {sharing ? <button onClick={disableLocation} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold">Выключить</button> : <button onClick={enableLocation} disabled={geoStatus === 'locating'} className="flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white"><LocateFixed size={17} />Включить</button>}
      </div>
      {geoError && <p className="mt-2 text-xs text-red-500">{geoError}</p>}
      {geoStatus === 'denied' && <p className="mt-2 flex gap-1 text-xs text-slate-500"><ShieldCheck size={14} />После разрешения нажми «Включить» ещё раз.</p>}
    </section>
    <BottomNavigation />
  </main>;
}

export default function Page() { return <><TelegramBootstrap /><AuthGate><MapScreen /></AuthGate></>; }
