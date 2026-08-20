import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Нет сессии устройства' }, { status: 401 });
  const db = adminSupabase(); const { data: auth } = await db.auth.getUser(token);
  if (!auth.user) return NextResponse.json({ error: 'Сессия устройства недействительна' }, { status: 401 });
  const id = auth.user.id;
  const { error } = await db.from('users').upsert({ id, telegram_id: `android-${id}`, display_name: 'Новый участник', last_seen: new Date().toISOString(), online: true }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
