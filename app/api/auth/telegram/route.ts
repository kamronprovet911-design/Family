import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase/server';
import { validateTelegramInitData } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const { initData } = await request.json(); const tg = validateTelegramInitData(initData);
  if (!tg) return NextResponse.json({ error: 'Неверные или устаревшие данные Telegram' }, { status: 401 });
  const db = adminSupabase(); const email = `tg-${tg.id}@telegram.local`;
  const { data: existing } = await db.auth.admin.listUsers({ perPage: 1 });
  let authUser = existing.users.find((u) => u.email === email);
  if (!authUser) {
    const created = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { telegram_id: tg.id } });
    if (created.error || !created.data.user) return NextResponse.json({ error: created.error?.message || 'Не удалось создать пользователя' }, { status: 500 });
    authUser = created.data.user;
  }
  await db.from('users').upsert({ id: authUser.id, telegram_id: String(tg.id), username: tg.username ?? null, display_name: [tg.first_name, tg.last_name].filter(Boolean).join(' ') || 'Участник', avatar_url: tg.photo_url ?? null, last_seen: new Date().toISOString(), online: true }, { onConflict: 'id' });
  const link = await db.auth.admin.generateLink({ type: 'magiclink', email });
  if (link.error) return NextResponse.json({ error: link.error.message }, { status: 500 });
  // The browser must receive no identity fields here: Supabase verifyOtp accepts only token_hash + type.
  return NextResponse.json({ token_hash: link.data.properties.hashed_token }, { headers: { 'Cache-Control': 'no-store' } });
}
