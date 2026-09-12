/** Design tokens aligned with the 420BNB light palette (apps/web). */
export const theme = {
  bg: '#ECD5BB',
  surface: '#F4E6D4',
  surfaceLight: '#FAF3EA',
  card: '#F4E6D4',
  border: 'rgba(81,55,43,0.16)',
  text: '#51372B',
  muted: '#6B5346',
  primary: '#193F25',
  primaryDark: '#122B1A',
  primaryMuted: 'rgba(25,63,37,0.12)',
  gold: '#B78438',
  sand: '#B8A487',
  cream: '#ECD5BB',
  espresso: '#51372B',
  danger: '#b42318',
  warning: '#B78438',
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
