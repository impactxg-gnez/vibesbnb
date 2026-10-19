export const VIBEBOT_OPEN_EVENT = 'vibebot:open';
export const VIBEBOT_CONVERSATION_ID = 'vibebot';

export type VibeBotOpenDetail = { prefill?: string };

export function openVibeBot(prefill?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<VibeBotOpenDetail>(VIBEBOT_OPEN_EVENT, { detail: { prefill } })
  );
}
