'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MessageCircle, Sparkles, X } from 'lucide-react';
import { VibeBotThread } from '@/components/concierge/VibeBotThread';
import {
  VIBEBOT_CONVERSATION_ID,
  VIBEBOT_OPEN_EVENT,
  type VibeBotOpenDetail,
} from '@/lib/concierge/openVibeBot';

const HIDDEN = [/^\/host\//, /^\/admin/, /^\/messages/, /^\/login/, /^\/signup/];

export function VibeBotLauncher() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<string | undefined>();

  const hidden = HIDDEN.some((re) => re.test(pathname));

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<VibeBotOpenDetail>).detail;
      if (pathname === '/messages' || pathname.startsWith('/messages?')) {
        router.push(`/messages?conversationId=${VIBEBOT_CONVERSATION_ID}`);
        return;
      }
      setPrefill(detail?.prefill);
      setOpen(true);
    };
    window.addEventListener(VIBEBOT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(VIBEBOT_OPEN_EVENT, onOpen);
  }, [pathname, router]);

  if (hidden) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed z-[60] right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 md:right-6 h-14 px-4 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 flex items-center gap-2 font-semibold hover:bg-emerald-500"
        aria-label="Ask VibeBot"
      >
        <Sparkles className="w-5 h-5" />
        <span className="hidden sm:inline">VibeBot</span>
        <MessageCircle className="w-5 h-5 sm:hidden" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-6 bg-black/50">
          <div className="relative w-full sm:max-w-md h-[min(86dvh,720px)] bg-gray-900 border border-gray-700 sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/40 text-gray-200 hover:text-white"
              aria-label="Close VibeBot"
            >
              <X className="w-4 h-4" />
            </button>
            <VibeBotThread embedded prefill={prefill} />
          </div>
        </div>
      ) : null}
    </>
  );
}
