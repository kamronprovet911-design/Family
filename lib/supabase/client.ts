'use client';
import { createBrowserClient } from '@supabase/ssr';
// Fallback makes CI/Vercel build phase independent from runtime secrets; real requests still require .env values.
export const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key');
