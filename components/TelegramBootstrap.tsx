'use client';
import Script from 'next/script'; import { useEffect } from 'react';
export function TelegramBootstrap() { useEffect(() => { const webApp = window.Telegram?.WebApp; webApp?.ready(); webApp?.expand(); }, []); return <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />; }
declare global { interface Window { Telegram?: { WebApp: { initData: string; colorScheme?: string; ready(): void; expand(): void; HapticFeedback?: { impactOccurred(style: string): void } } } } }
