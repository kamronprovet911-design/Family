'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import type { Location } from '@/types/database';

type Group = { key: string; latitude: number; longitude: number; members: Location[] };
const VIEW_KEY = 'family-map-view';
function avatarIcon(members: Location[]) { const colors = ['#377DFF', '#ef6b73', '#7b61ff', '#30a46c']; const initials = members.slice(0, 3).map((m) => `<span style="background:${colors[members.indexOf(m) % colors.length]}">${(m.user?.display_name || '?')[0].toUpperCase()}</span>`).join(''); const rest = members.length > 3 ? `<i>+${members.length - 3}</i>` : ''; return L.divIcon({ className: '', html: `<div class="family-bubble ${members.length > 1 ? 'family-bubble--group' : ''}">${initials}${rest}</div>`, iconSize: [members.length > 1 ? 58 : 46, members.length > 1 ? 58 : 46], iconAnchor: [members.length > 1 ? 29 : 23, members.length > 1 ? 29 : 23] }); }
function PersistView() { const map = useMap(); useEffect(() => { const save = () => { const c = map.getCenter(); localStorage.setItem(VIEW_KEY, JSON.stringify({ lat: c.lat, lng: c.lng, zoom: map.getZoom() })); }; map.on('moveend', save); return () => { map.off('moveend', save); }; }, [map]); return null; }
function FitInitialLocations({ groups }: { groups: Group[] }) { const map = useMap(); useEffect(() => { if (!groups.length) return; const saved = localStorage.getItem(VIEW_KEY); if (saved) return; const points = groups.map((g) => [g.latitude, g.longitude] as [number, number]); if (points.length === 1) map.setView(points[0], 16); else map.fitBounds(points, { padding: [56, 56], maxZoom: 16 }); }, [groups, map]); return null; }
export function FamilyMap({ locations, onChat }: { locations: Location[]; onChat: (id: string) => void }) {
  const groups = useMemo(() => Object.values(locations.reduce<Record<string, Group>>((all, location) => { const key = `${location.latitude.toFixed(5)}:${location.longitude.toFixed(5)}`; (all[key] ||= { key, latitude: location.latitude, longitude: location.longitude, members: [] }).members.push(location); return all; }, {})), [locations]);
  const saved = typeof window === 'undefined' ? null : localStorage.getItem(VIEW_KEY); const initial = saved ? JSON.parse(saved) as { lat: number; lng: number; zoom: number } : null;
  return <MapContainer center={initial ? [initial.lat, initial.lng] : [20, 0]} zoom={initial?.zoom ?? 2} zoomControl={false} preferCanvas className="h-full">
    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><ZoomControl position="bottomright" /><PersistView /><FitInitialLocations groups={groups} />
    {groups.map((group) => <Marker key={group.key} position={[group.latitude, group.longitude]} icon={avatarIcon(group.members)}><Popup><div className="min-w-44"><b>{group.members.length > 1 ? `Вместе · ${group.members.length}` : group.members[0].user?.display_name}</b>{group.members.map((member) => <div className="mt-2 flex items-center justify-between gap-3" key={member.user_id}><span className="text-xs">{member.user?.online ? '🟢' : '⚪'} {member.user?.display_name}</span><button onClick={() => onChat(member.user_id)} className="rounded bg-blue-500 px-2 py-1 text-xs text-white">Чат</button></div>)}</div></Popup></Marker>)}
  </MapContainer>;
}
