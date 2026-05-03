/**
 * Allows only same-origin relative paths (rejects protocol-relative URLs).
 */
export function safeInternalReturnPath(raw: string | null | undefined): string | null {
  if (raw == null || raw === '') return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}
