import type { Config } from 'tailwindcss';
export default { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { ink: '#162033', brand: '#377DFF' }, boxShadow: { card: '0 12px 35px rgba(22,32,51,.10)' } } }, plugins: [] } satisfies Config;
