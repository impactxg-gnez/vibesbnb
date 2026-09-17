const ICS_FETCH_MS = 25_000;

const ICS_FETCH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/calendar, text/plain, application/ics, */*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export function looksLikeIcs(text: string): boolean {
  const normalized = text.replace(/^\uFEFF/, '').trim();
  return /BEGIN\s*:\s*VCALENDAR/i.test(normalized) || /BEGIN\s*:\s*VEVENT/i.test(normalized);
}

function snippet(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 120);
}

/**
 * Download a remote ICS feed. Airbnb/VRBO reject custom bot user-agents and
 * sometimes return an HTML page with HTTP 200 when the token is invalid.
 */
export async function fetchIcsBody(url: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error('Invalid iCal URL');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('iCal URL must start with https://');
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ICS_FETCH_MS);
  let res: Response;
  try {
    res = await fetch(parsed.toString(), {
      headers: ICS_FETCH_HEADERS,
      redirect: 'follow',
      signal: ctl.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Timed out fetching the calendar URL (25s).');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const body = await res.text();
  if (!res.ok) {
    const extra = snippet(body);
    throw new Error(
      extra ? `ICS HTTP ${res.status}: ${extra}` : `ICS HTTP ${res.status}`
    );
  }

  if (!looksLikeIcs(body)) {
    throw new Error(
      'The URL did not return an iCal calendar. Airbnb may have blocked the request, or the export link expired. Copy a fresh calendar URL from Airbnb → Availability → Export calendar.'
    );
  }

  return body;
}
