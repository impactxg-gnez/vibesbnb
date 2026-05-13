type PerfFields = Record<string, string | number | boolean | null | undefined>;

/**
 * Structured performance log (stdout only — no Supabase writes).
 * Wire external log drains (Datadog, Axiom, etc.) in your host if needed.
 */
export function logApiPerf(
  route: string,
  ms: number,
  extra: PerfFields = {}
): void {
  const row = {
    ts: new Date().toISOString(),
    kind: 'api_perf',
    route,
    ms,
    ...extra,
  };
  const line = JSON.stringify(row);
  if (ms > 2000) {
    console.warn(line);
  } else {
    console.log(line);
  }
}
