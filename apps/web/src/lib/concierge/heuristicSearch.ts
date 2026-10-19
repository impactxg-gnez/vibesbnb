import { todayLocalYmd } from '@/lib/dateUtils';
import type { StaySearchInput } from '@/lib/concierge/types';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function ymdThisMonth(day: number): string {
  const today = todayLocalYmd();
  const [y, m] = today.split('-');
  const dim = new Date(Number(y), Number(m), 0).getDate();
  const d = Math.min(Math.max(1, day), dim);
  return `${y}-${m}-${pad(d)}`;
}

/** Best-effort parse when Gemini is unavailable. */
export function heuristicStaySearch(text: string): StaySearchInput {
  const guestsMatch = text.match(
    /(\d+)\s*(?:people|guests|travellers|travelers|adults|of us)\b/i
  );
  const budgetMatch = text.match(
    /\$\s*(\d{2,4})|(\d{2,4})\s*(?:usd)?\s*(?:\/\s*)?(?:a |per )?night/i
  );
  const inMatch = text.match(
    /\bin\s+([A-Za-z][A-Za-z\s]{1,40}?)(?=\s+from|\s+for|\s+with|\s+between|\s*,|\s*$)/i
  );
  const range = text.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s*(?:to|-|–|through)\s*(\d{1,2})(?:st|nd|rd|th)?/i
  );

  let checkIn: string | null = null;
  let checkOut: string | null = null;
  if (range) {
    checkIn = ymdThisMonth(parseInt(range[1], 10));
    checkOut = ymdThisMonth(parseInt(range[2], 10));
  }

  const maxNightly = budgetMatch
    ? Number(budgetMatch[1] || budgetMatch[2])
    : null;

  return {
    area: inMatch?.[1]?.trim() || null,
    guests: guestsMatch ? parseInt(guestsMatch[1], 10) : null,
    maxNightly: Number.isFinite(maxNightly as number) ? maxNightly : null,
    checkIn,
    checkOut,
    cannabisFriendly: /\b(420|cannabis|weed|smoke-?friendly)\b/i.test(text) ? true : null,
  };
}
