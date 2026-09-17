/** PostgREST errors are plain objects, not Error instances. */
export function formatUnknownError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  if (error && typeof error === 'object') {
    const row = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
      error?: unknown;
    };
    const parts = [row.message, row.details, row.hint, row.code]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean);
    if (parts.length > 0) return parts.join(' — ');
    if (typeof row.error === 'string' && row.error.trim()) return row.error;
    try {
      const json = JSON.stringify(error);
      if (json && json !== '{}' && json !== 'null') return json.slice(0, 500);
    } catch {
      /* ignore */
    }
  }
  return 'Unknown calendar sync error';
}

export function isMissingRelationOrFunction(message: string): boolean {
  return /could not find the function|does not exist|schema cache|PGRST202|42P01|42883/i.test(
    message
  );
}

export function isUniqueViolation(error: unknown, message: string): boolean {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  return code === '23505' || /duplicate key|unique constraint/i.test(message);
}
