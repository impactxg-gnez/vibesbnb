/** Design tokens aligned with apps/web/tailwind.config.js */
export const theme = {
  bg: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#2A2A2A',
  card: '#1A1A1A',
  border: 'rgba(255,255,255,0.08)',
  text: '#ffffff',
  muted: '#A0A0A0',
  primary: '#00E676',
  primaryDark: '#00C853',
  primaryMuted: 'rgba(0,230,118,0.15)',
  danger: '#ef4444',
  warning: '#f59e0b',
  radius: {
    sm: 10,
    md: 16,
    lg: 24,
    full: 9999,
  },
};

export function money(n: number): string {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
