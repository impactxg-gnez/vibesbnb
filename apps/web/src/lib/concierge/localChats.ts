import type { ConciergeChatMessage, ConciergeChatSummary } from '@/lib/concierge/types';

const CHATS_KEY = 'vibebot-chats-v1';
const ACTIVE_KEY = 'vibebot-active-chat';
const LEGACY_KEY = 'vibebot-messages';

export type LocalVibeChat = ConciergeChatSummary & {
  messages: ConciergeChatMessage[];
};

function readAll(): LocalVibeChat[] {
  try {
    const raw = sessionStorage.getItem(CHATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalVibeChat[];
      if (Array.isArray(parsed)) return parsed;
    }
    const legacy = sessionStorage.getItem(LEGACY_KEY);
    if (!legacy) return [];
    const messages = JSON.parse(legacy) as ConciergeChatMessage[];
    if (!Array.isArray(messages) || messages.length === 0) return [];
    const last = messages[messages.length - 1];
    const firstUser = messages.find((m) => m.role === 'user');
    const chat: LocalVibeChat = {
      id: 'local-legacy',
      title: (firstUser?.body || 'Previous chat').slice(0, 80),
      lastMessage: last?.body || '',
      lastMessageAt: last?.createdAt || new Date().toISOString(),
      messages,
    };
    writeAll([chat]);
    return [chat];
  } catch {
    return [];
  }
}

function writeAll(chats: LocalVibeChat[]) {
  try {
    sessionStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch {
    /* ignore */
  }
}

export function listLocalChats(): ConciergeChatSummary[] {
  return readAll().map(({ messages: _m, ...summary }) => summary);
}

export function getLocalChat(id: string): LocalVibeChat | null {
  return readAll().find((c) => c.id === id) || null;
}

export function getActiveLocalChatId(): string | null {
  try {
    return sessionStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveLocalChatId(id: string | null) {
  try {
    if (id) sessionStorage.setItem(ACTIVE_KEY, id);
    else sessionStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

export function saveLocalChat(chat: LocalVibeChat) {
  const rest = readAll().filter((c) => c.id !== chat.id);
  writeAll([chat, ...rest]);
  setActiveLocalChatId(chat.id);
}

export function newLocalChatId(): string {
  return `local-${Date.now()}`;
}
