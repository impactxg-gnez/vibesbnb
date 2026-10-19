import { GoogleGenerativeAI } from '@google/generative-ai';
import { asSearchInput } from '@/lib/concierge/asSearchInput';
import { looksLikeStayRequest } from '@/lib/concierge/heuristicSearch';
import { searchStays } from '@/lib/concierge/searchStays';
import { conciergeInstructions } from '@/lib/concierge/systemPrompt';
import type { ConciergeChatMessage, StayCard } from '@/lib/concierge/types';

function geminiSearchTool() {
  return {
    functionDeclarations: [
      {
        name: 'search_stays',
        description:
          'Search live VibesBNB listings. Call only when the latest user message is asking to find or change stays.',
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

export async function runGeminiConcierge(
  apiKey: string,
  message: string,
  historyIn: ConciergeChatMessage[]
): Promise<{ reply: string; listings: StayCard[] }> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: conciergeInstructions(),
    tools: [geminiSearchTool() as never],
  });

  const prior = historyIn.filter(
    (m) => (m.role === 'user' || m.role === 'assistant') && typeof m.body === 'string'
  );
  const last = prior[prior.length - 1];
  if (last?.role === 'user' && last.body.trim() === message.trim()) {
    prior.pop();
  }
  const history: Array<{ role: string; parts: Array<{ text: string }> }> = prior.slice(-8).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.body }],
  }));

  const chat = model.startChat({ history });
  let result = await chat.sendMessage(message);
  let listings: StayCard[] = [];
  const allowSearch = looksLikeStayRequest(message);

  for (let i = 0; i < 3; i++) {
    const calls =
      typeof result.response.functionCalls === 'function' ? result.response.functionCalls() : [];
    if (!calls?.length) break;
    const outputs = [];
    for (const call of calls) {
      if (call.name === 'search_stays') {
        if (!allowSearch) {
          outputs.push({
            functionResponse: {
              name: 'search_stays',
              response: {
                skipped: true,
                reason:
                  'The latest message is not a stay search. Answer that question in text. Do not list properties.',
              },
            },
          });
          continue;
        }
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
    if (!outputs.length) break;
    result = await chat.sendMessage(outputs);
  }

  return { reply: (result.response.text() || '').trim(), listings };
}
