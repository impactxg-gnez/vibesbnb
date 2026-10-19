import { NextRequest, NextResponse } from 'next/server';
import { runGeminiConcierge } from '@/lib/concierge/geminiConcierge';
import { heuristicStaySearch, looksLikeStayRequest } from '@/lib/concierge/heuristicSearch';
import { runMuseConcierge } from '@/lib/concierge/museSpark';
import { searchStays } from '@/lib/concierge/searchStays';
import { persistConciergeTurn } from '@/lib/concierge/persistConcierge';
import type { ConciergeChatMessage, StayCard } from '@/lib/concierge/types';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

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


function asHistory(raw: unknown): ConciergeChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is ConciergeChatMessage =>
      !!m &&
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.body === 'string'
  );
}

const CHAT_FALLBACK =
  'I am VibeBot, the VibesBNB concierge. Ask me a question, or tell me a neighborhood, dates, guests, and budget if you want listing links.';

async function runHeuristic(message: string): Promise<{ reply: string; listings: StayCard[] }> {
  if (!looksLikeStayRequest(message)) {
    return { reply: CHAT_FALLBACK, listings: [] };
  }
  const found = await searchStays(heuristicStaySearch(message));
  return { reply: found.summary, listings: found.listings };
}

async function runConcierge(
  message: string,
  history: ConciergeChatMessage[]
): Promise<{ reply: string; listings: StayCard[] }> {
  const provider = (process.env.CONCIERGE_PROVIDER || '').trim().toLowerCase();
  const museKey = process.env.MODEL_API_KEY?.trim();
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  const preferMuse = provider === 'muse' && Boolean(museKey);

  if (preferMuse && museKey) {
    try {
      const result = await runMuseConcierge(museKey, message, history);
      if (result.reply || result.listings.length) return result;
    } catch (error) {
      console.error('[concierge] Muse failed, falling back', error);
    }
  }

  if (geminiKey) {
    try {
      const result = await runGeminiConcierge(geminiKey, message, history);
      if (result.reply || result.listings.length) return result;
    } catch (error) {
      if (preferMuse) {
        console.error('[concierge] Gemini fallback failed', error);
      } else {
        throw error;
      }
    }
  }

  return runHeuristic(message);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    const body = await request.json().catch(() => ({}));
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let conversationId =
      typeof body.conversationId === 'string' && body.conversationId.trim()
        ? body.conversationId.trim()
        : null;

    if (user) {
      try {
        conversationId = await persistConciergeTurn({
          userId: user.id,
          role: 'user',
          body: message,
          conversationId,
        });
      } catch (e) {
        console.warn('[concierge] persist skipped', e);
      }
    }

    let { reply, listings } = await runConcierge(message, asHistory(body.history));

    if (!looksLikeStayRequest(message)) {
      listings = [];
    }

    if (!reply && listings.length) {
      const found = await runHeuristic(message);
      listings = found.listings;
      reply = found.reply;
    }

    if (!reply) {
      reply = looksLikeStayRequest(message)
        ? 'Tell me a neighborhood, dates, how many guests, and a nightly budget. I will send matching VibesBNB links.'
        : CHAT_FALLBACK;
    }

    if (user) {
      try {
        conversationId = await persistConciergeTurn({
          userId: user.id,
          role: 'assistant',
          body: reply,
          listings,
          conversationId,
        });
      } catch (e) {
        console.warn('[concierge] persist skipped', e);
      }
    }

    const assistant: ConciergeChatMessage = {
      id: `local-${Date.now()}`,
      role: 'assistant',
      body: reply,
      listings,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ message: assistant, conversationId });
  } catch (error: unknown) {
    console.error('[concierge/chat]', error);
    const err = error instanceof Error ? error.message : 'VibeBot could not reply';
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
