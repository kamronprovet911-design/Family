'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Location } from '@/types/database';

const icon = (name: string, color: string) => L.divIcon({ className: '', html: `<div class="map-pin" style="width:44px;height:44px;background:${color};display:grid;place-items:center;color:#fff;font-weight:bold">${name.slice(0, 1).toUpperCase()}</div>`, iconSize: [44, 44], iconAnchor: [22, 22] });
function Recenter({ locations }: { locations: Location[] }) { const map = useMap(); useEffect(() => { if (locations[0]) map.flyTo([locations[0].latitude, locations[0].longitude], Math.max(map.getZoom(), 14), { animate: true }); }, [locations, map]); return null; }
export function FamilyMap({ locations, onChat }: { locations: Location[]; onChat: (id: string) => void }) {
  const center: [number, number] = locations[0] ? [locations[0].latitude, locations[0].longitude] : [20, 0];
  return <MapContainer center={center} zoom={locations.length ? 14 : 2} scrollWheelZoom className="h-full" zoomControl={false}>
    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <Recenter locations={locations} />
    {locations.map((location, index) => <Marker key={location.user_id} position={[location.latitude, location.longitude]} icon={icon(location.user?.display_name || '?', ['#377DFF', '#ef6b73', '#7b61ff', '#30a46c'][index % 4])}>
      <Popup><div className="min-w-40"><b>{location.user?.display_name}</b><p className="my-1 text-xs">{location.user?.online ? '🟢 Онлайн' : '⚪ Не в сети'}</p><p className="text-xs">Обновлено {new Date(location.updated_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</p><button onClick={() => onChat(location.user_id)} className="mt-2 rounded bg-blue-500 px-2 py-1 text-xs text-white">Написать</button></div></Popup>
    </Marker>)}
  </MapContainer>;
}
