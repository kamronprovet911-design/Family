import crypto from 'crypto';

/** Validates the HMAC specified by Telegram Web Apps, including freshness. */
export function validateTelegramInitData(initData: string, token = process.env.TELEGRAM_BOT_TOKEN!) {
  if (!initData || !token) return null;
  const params = new URLSearchParams(initData); const hash = params.get('hash');
  const authDate = Number(params.get('auth_date'));
  if (!hash || !authDate || Date.now() / 1000 - authDate > 86400) return null;
  params.delete('hash');
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const expected = crypto.createHmac('sha256', secret).update(check).digest('hex');
  if (expected.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash))) return null;
  try { return JSON.parse(params.get('user') || 'null') as { id: number; username?: string; first_name: string; last_name?: string; photo_url?: string } | null; } catch { return null; }
}
