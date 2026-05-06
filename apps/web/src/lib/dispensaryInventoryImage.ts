/**
 * Default vector (SVG) artwork for dispensary inventory when the host uploads no image URL.
 * Resolved at display time so placeholders stay consistent app-wide without bloating the DB.
 */

const DEFAULT_GRADIENT = { from: '#0f172a', to: '#14532d' };

const CATEGORY_GRADIENT: Record<string, { from: string; to: string }> = {
  flower: { from: '#14532d', to: '#166534' },
  edibles: { from: '#713f12', to: '#a16207' },
  concentrates: { from: '#4c1d95', to: '#6d28d9' },
  vapes: { from: '#1e293b', to: '#334155' },
  'pre-rolls': { from: '#064e3b', to: '#047857' },
  'pre rolls': { from: '#064e3b', to: '#047857' },
  wellness: { from: '#134e4a', to: '#0f766e' },
};

function gradientForCategory(category: string): { from: string; to: string } {
  const key = category.trim().toLowerCase();
  return CATEGORY_GRADIENT[key] ?? DEFAULT_GRADIENT;
}

function escapeSvgText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * Inline SVG data URL — usable as `<img src>` (vector, scales crisply).
 */
export function defaultDispensaryItemVectorDataUrl(category: string, name: string): string {
  const { from, to } = gradientForCategory(category);
  const catLabel = escapeSvgText(truncate(category.trim() || 'Product', 22));
  const nameLabel = escapeSvgText(truncate(name.trim() || category.trim() || 'Item', 36));
  const aria = escapeSvgText(truncate(`${name.trim() || 'Product'} — ${category.trim() || 'category'}`, 80));

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" role="img" aria-label="${aria}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  <g fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3" stroke-linecap="round">
    <path d="M200 72 C 155 120, 140 175, 200 268 C 260 175, 245 120, 200 72 Z"/>
    <path d="M200 110 Q 168 175 200 240 Q 232 175 200 110"/>
  </g>
  <text x="200" y="320" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="20" font-weight="700">${nameLabel}</text>
  <text x="200" y="352" text-anchor="middle" fill="rgba(255,255,255,0.55)" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="13" font-weight="600" letter-spacing="0.12em">${catLabel.toUpperCase()}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Use the dispensary-provided image URL when present; otherwise the default category vector.
 */
export function resolveDispensaryItemImageUrl(
  image: string | null | undefined,
  category: string,
  name: string
): string {
  const trimmed = typeof image === 'string' ? image.trim() : '';
  if (trimmed.length > 0) return trimmed;
  return defaultDispensaryItemVectorDataUrl(category, name);
}
