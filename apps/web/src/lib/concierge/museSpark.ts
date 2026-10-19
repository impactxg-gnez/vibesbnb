import { asSearchInput } from '@/lib/concierge/asSearchInput';
import { looksLikeStayRequest } from '@/lib/concierge/heuristicSearch';
import { searchStays } from '@/lib/concierge/searchStays';
import { conciergeInstructions } from '@/lib/concierge/systemPrompt';
import type { ConciergeChatMessage, StayCard, StaySearchResult } from '@/lib/concierge/types';

const MUSE_URL = 'https://api.meta.ai/v1/responses';
const MUSE_MODEL = process.env.CONCIERGE_MUSE_MODEL?.trim() || 'muse-spark-1.3';

const SEARCH_STAYS_TOOL = {
  type: 'function' as const,
  name: 'search_stays',
  description:
    'Search live VibesBNB listings. Call only when the latest user message is asking to find or change stays. Do not call for identity, Muse/model questions, or other chit-chat.',
  parameters: {
    type: 'object',
    properties: {
      area: { type: 'string', description: 'City or neighborhood, e.g. North Miami' },
      checkIn: { type: 'string', description: 'YYYY-MM-DD' },
      checkOut: { type: 'string', description: 'YYYY-MM-DD' },
      guests: { type: 'number', description: 'Total guests including kids' },
      maxNightly: { type: 'number', description: 'Max guest-facing price per night in USD' },
      cannabisFriendly: { type: 'boolean' },
    },
  },
};

type MuseContentPart = { type?: string; text?: string };

type MuseOutputItem = {
  type?: string;
  name?: string;
  arguments?: string;
  call_id?: string;
  content?: MuseContentPart[] | string;
};

type MuseResponse = {
  id?: string;
  status?: string;
  output_text?: string;
  output?: MuseOutputItem[];
  error?: { message?: string } | string;
};

function priorTurns(historyIn: ConciergeChatMessage[], message: string) {
  const rows = historyIn.filter(
    (m) => (m.role === 'user' || m.role === 'assistant') && typeof m.body === 'string'
  );
  const last = rows[rows.length - 1];
  if (last?.role === 'user' && last.body.trim() === message.trim()) {
    rows.pop();
  }
  return rows.slice(-8).map((m) =>
      m.role === 'assistant'
        ? {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: m.body }],
          }
        : {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: m.body }],
          }
    );
}

function outputText(res: MuseResponse): string {
  if (typeof res.output_text === 'string' && res.output_text.trim()) {
    return res.output_text.trim();
  }
  const parts: string[] = [];
  for (const item of res.output || []) {
    if (item.type !== 'message') continue;
    if (typeof item.content === 'string' && item.content.trim()) {
      parts.push(item.content);
      continue;
    }
    if (!Array.isArray(item.content)) continue;
    for (const block of item.content) {
      if ((block.type === 'output_text' || block.type === 'text') && block.text) {
        parts.push(block.text);
      }
    }
  }
  return parts.join('\n').trim();
}

function functionCalls(res: MuseResponse): Array<{ name: string; call_id: string; args: Record<string, unknown> }> {
  const calls: Array<{ name: string; call_id: string; args: Record<string, unknown> }> = [];
  for (const item of res.output || []) {
    if (item.type !== 'function_call' || !item.call_id || !item.name) continue;
    let args: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(item.arguments || '{}');
      if (parsed && typeof parsed === 'object') args = parsed as Record<string, unknown>;
    } catch {
      args = {};
    }
    calls.push({ name: item.name, call_id: item.call_id, args });
  }
  return calls;
}

async function museCreate(
  apiKey: string,
  body: Record<string, unknown>
): Promise<MuseResponse> {
  const response = await fetch(MUSE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MUSE_MODEL,
      instructions: conciergeInstructions(),
      tools: [SEARCH_STAYS_TOOL],
      tool_choice: 'auto',
      store: true,
      ...body,
    }),
  });
  const data = (await response.json().catch(() => ({}))) as MuseResponse;
  if (!response.ok) {
    const err =
      typeof data.error === 'string'
        ? data.error
        : data.error?.message || `Muse request failed (${response.status})`;
    throw new Error(err);
  }
  return data;
}

function slimSearchResult(found: StaySearchResult) {
  return {
    summary: found.summary,
    relaxed: found.relaxed,
    listings: found.listings.map((listing) => ({
      id: listing.id,
      name: listing.name,
      location: listing.location,
      guestNightly: listing.guestNightly,
      guests: listing.guests,
      href: listing.href,
      matchNotes: listing.matchNotes.slice(0, 2),
    })),
  };
}

export async function runMuseConcierge(
  apiKey: string,
  message: string,
  historyIn: ConciergeChatMessage[]
): Promise<{ reply: string; listings: StayCard[] }> {
  let res = await museCreate(apiKey, {
    input: [
      ...priorTurns(historyIn, message),
      {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: message }],
      },
    ],
  });

  let listings: StayCard[] = [];
  const allowSearch = looksLikeStayRequest(message);

  for (let i = 0; i < 3; i++) {
    const calls = functionCalls(res);
    if (!calls.length || !res.id) break;
    const outputs = [];
    for (const call of calls) {
      if (call.name === 'search_stays') {
        if (!allowSearch) {
          outputs.push({
            type: 'function_call_output',
            call_id: call.call_id,
            output: JSON.stringify({
              skipped: true,
              reason:
                'The latest message is not a stay search. Answer that question in text. Do not list properties.',
            }),
          });
          continue;
        }
        const found = await searchStays(asSearchInput(call.args));
        listings = found.listings;
        outputs.push({
          type: 'function_call_output',
          call_id: call.call_id,
          output: JSON.stringify(slimSearchResult(found)),
        });
      } else {
        outputs.push({
          type: 'function_call_output',
          call_id: call.call_id,
          output: JSON.stringify({ error: `Unknown tool ${call.name}` }),
        });
      }
    }
    res = await museCreate(apiKey, {
      previous_response_id: res.id,
      input: outputs,
    });
  }

  return { reply: outputText(res), listings };
}
