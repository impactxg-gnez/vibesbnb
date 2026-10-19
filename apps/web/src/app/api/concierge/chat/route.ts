import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { heuristicStaySearch } from '@/lib/concierge/heuristicSearch';
import { searchStays } from '@/lib/concierge/searchStays';
import type { ConciergeChatMessage, StayCard, StaySearchInput } from '@/lib/concierge/types';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const SYSTEM = `You are VibeBot, the VibesBNB traveler concierge.
Help guests find real listings on VibesBNB only.
When they mention place, dates, guest count, or budget, call search_stays.
Use YYYY-MM-DD for dates. "This month" means the current calendar month.
Guest nightly budget is the traveler-facing rate (not the host's payout).
Never invent property names or URLs. Only recommend stays returned by search_stays.
If dates or guest count are missing, ask one short question, then search.
Keep replies under 80 words plus the listings.
Do not share host phone numbers or emails.`;

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (token) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anon) {
      const supabase = createClient(url, anon, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data } = await supabase.auth.getUser(token);
      return data.user;
    }
  }
  const supabase = createServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

async function persist(
  userId: string,
  role: 'user' | 'assistant',
  body: string,
  listings?: StayCard[]
) {
  try {
    const service = createServiceClient();
    await service.from('vibe_bot_messages').insert({
      user_id: userId,
      role,
      body,
      listings: listings || null,
    });
    await service.from('vibe_bot_threads').upsert({
      user_id: userId,
      last_message: body.slice(0, 280),
      last_message_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[concierge] persist skipped', e);
  }
}

function asSearchInput(args: Record<string, unknown>): StaySearchInput {
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    area: str(args.area),
    checkIn: str(args.checkIn)?.slice(0, 10) || null,
    checkOut: str(args.checkOut)?.slice(0, 10) || null,
    guests: num(args.guests),
    maxNightly: num(args.maxNightly),
    cannabisFriendly:
      args.cannabisFriendly === true ? true : args.cannabisFriendly === false ? false : null,
  };
}

function searchTool() {
  return {
    functionDeclarations: [
      {
        name: 'search_stays',
        description:
          'Search live VibesBNB listings by area, dates, guest count, and max guest nightly budget.',
        parameters: {
          type: 'OBJECT',
          properties: {
            area: { type: 'STRING', description: 'City or neighborhood, e.g. North Miami' },
            checkIn: { type: 'STRING', description: 'YYYY-MM-DD' },
            checkOut: { type: 'STRING', description: 'YYYY-MM-DD' },
            guests: { type: 'NUMBER', description: 'Total guests including kids' },
            maxNightly: { type: 'NUMBER', description: 'Max guest-facing price per night in USD' },
            cannabisFriendly: { type: 'BOOLEAN' },
          },
        },
      },
    ],
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    const body = await request.json().catch(() => ({}));
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (user) {
      await persist(user.id, 'user', message);
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
    let reply = '';
    let listings: StayCard[] = [];

    if (!apiKey) {
      const result = await searchStays(heuristicStaySearch(message));
      listings = result.listings;
      reply = result.summary;
    } else {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: `${SYSTEM}\nToday is ${new Date().toISOString().slice(0, 10)}.`,
        tools: [searchTool() as never],
      });

      const prior = Array.isArray(body.history) ? body.history : [];
      const history: Array<{ role: string; parts: Array<{ text: string }> }> = prior
        .filter(
          (m: { role?: string; body?: string }) =>
            (m.role === 'user' || m.role === 'assistant') && typeof m.body === 'string'
        )
        .slice(-8)
        .map((m: { role: string; body: string }) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.body }],
        }));

      const chat = model.startChat({ history });
      let result = await chat.sendMessage(message);

      for (let i = 0; i < 3; i++) {
        const calls =
          typeof result.response.functionCalls === 'function'
            ? result.response.functionCalls()
            : [];
        if (!calls?.length) break;
        const outputs = [];
        for (const call of calls) {
          if (call.name === 'search_stays') {
            const args = (call.args || {}) as Record<string, unknown>;
            const found = await searchStays(asSearchInput(args));
            listings = found.listings;
            outputs.push({
              functionResponse: {
                name: 'search_stays',
                response: found,
              },
            });
          }
        }
        result = await chat.sendMessage(outputs);
      }

      reply = (result.response.text() || '').trim();
      if (!reply && listings.length) {
        const found = await searchStays(heuristicStaySearch(message));
        listings = found.listings;
        reply = found.summary;
      }
    }

    if (!reply) {
      reply =
        'Tell me a neighborhood, dates, how many guests, and a nightly budget. I will send matching VibesBNB links.';
    }

    if (user) {
      await persist(user.id, 'assistant', reply, listings);
    }

    const assistant: ConciergeChatMessage = {
      id: `local-${Date.now()}`,
      role: 'assistant',
      body: reply,
      listings,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ message: assistant });
  } catch (error: unknown) {
    console.error('[concierge/chat]', error);
    const message = error instanceof Error ? error.message : 'VibeBot could not reply';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
