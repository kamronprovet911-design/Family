import { registerPlugin } from '@capacitor/core';
export interface BackgroundLocationPlugin { start(options: { supabaseUrl: string; anonKey: string; accessToken: string; userId: string }): Promise<void>; stop(): Promise<void>; }
export const BackgroundLocation = registerPlugin<BackgroundLocationPlugin>('BackgroundLocation');
