'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Search, X, Building2 } from 'lucide-react';

export type PropertyNameSearchModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Suggestion = { id: string; name: string; location: string };

export function PropertyNameSearchModal({ open, onOpenChange }: PropertyNameSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setLoading(false);
    setSearched(false);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;

    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 1) {
      setSuggestions([]);
      setLoading(false);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(false);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/properties/suggest?q=${encodeURIComponent(q)}&limit=12`);
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        if (!res.ok) {
          setSuggestions([]);
        } else {
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, query]);

  const goToSearch = useCallback(
    (locationParam: string) => {
      const params = new URLSearchParams();
      params.set('location', locationParam);
      onOpenChange(false);
      router.push(`/search?${params.toString()}`);
    },
    [onOpenChange, router]
  );

  const goToListing = useCallback(
    (id: string) => {
      onOpenChange(false);
      router.push(`/listings/${id}`);
    },
    [onOpenChange, router]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const qTrim = query.trim();
  const showEmpty = searched && !loading && qTrim.length >= 1 && suggestions.length === 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[max(4rem,12vh)] px-4 pb-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="property-name-search-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close search"
        onClick={() => onOpenChange(false)}
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-gray-950 shadow-[0_24px_80px_rgba(0,0,0,0.55)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-5 h-5 text-primary-500 shrink-0" aria-hidden />
            <h2 id="property-name-search-title" className="text-lg font-bold text-white truncate">
              Search by property name
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-xl text-muted hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && qTrim.length > 0) {
                  e.preventDefault();
                  goToSearch(qTrim);
                }
              }}
              placeholder="Type a property name, nickname, or area…"
              className="w-full pl-4 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {loading && <p className="text-muted text-sm px-1">Searching listings…</p>}

          {!loading && suggestions.length > 0 && (
            <ul className="max-h-72 overflow-y-auto rounded-xl border border-white/5 divide-y divide-white/5" role="listbox">
              {suggestions.map((s) => (
                <li key={s.id} role="option">
                  <button
                    type="button"
                    onClick={() => goToListing(s.id)}
                    className="w-full text-left px-4 py-3 hover:bg-primary-500/15 flex items-start gap-3 transition-colors group"
                  >
                    <Building2 className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-white group-hover:text-primary-400 transition-colors line-clamp-2">
                        {s.name}
                      </span>
                      {s.location ? (
                        <span className="flex items-center gap-1.5 text-sm text-muted mt-0.5 line-clamp-1">
                          <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" aria-hidden />
                          {s.location}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {showEmpty && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center space-y-3">
              <p className="text-white font-medium">No properties match &ldquo;{qTrim}&rdquo;</p>
              <p className="text-muted text-sm">
                Try another spelling, search by city in the main search bar, or browse everything we have.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
                <button
                  type="button"
                  onClick={() => goToSearch(qTrim)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/15 transition-colors"
                >
                  Search anyway
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    router.push('/search');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-primary-500 text-black text-sm font-bold hover:bg-primary-400 transition-colors"
                >
                  Browse all stays
                </button>
              </div>
            </div>
          )}

          {qTrim.length > 0 && !loading && suggestions.length > 0 && (
            <p className="text-xs text-muted px-1">
              Tip: select a listing to open it, or press Enter to run a full search with filters.
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-white/5 bg-black/20 flex justify-end gap-2">
          <button
            type="button"
            disabled={qTrim.length === 0}
            onClick={() => goToSearch(qTrim)}
            className="px-5 py-2.5 rounded-xl bg-primary-500 text-black font-bold text-sm hover:bg-primary-400 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
