'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, Upload } from 'lucide-react';
import {
  guestIdSlotLabel,
  requiredGuestIdCount,
  type GuestIdDocument,
} from '@/lib/guestIdDocuments';

type Props = {
  adults: number;
  kids: number;
  documents: GuestIdDocument[];
  onChange: (next: GuestIdDocument[]) => void;
};

export function GuestPartyIdUploads({ adults, kids, documents, onChange }: Props) {
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const need = requiredGuestIdCount(adults, kids);
  const slots = useMemo(() => Array.from({ length: need }, (_, i) => i), [need]);

  const bySlot = useMemo(() => {
    const map = new Map<number, GuestIdDocument>();
    documents.forEach((d) => map.set(d.slot, d));
    return map;
  }, [documents]);

  const upload = async (slot: number, file: File | undefined) => {
    if (!file) return;
    setBusySlot(slot);
    try {
      const body = new FormData();
      body.set('slot', String(slot));
      body.set('file', file);
      const res = await fetch('/api/bookings/guest-ids', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const next = documents.filter((d) => d.slot !== slot);
      next.push({
        slot,
        storage_path: String(data.storage_path),
        file_name: String(data.file_name || file.name),
      });
      onChange(next.sort((a, b) => a.slot - b.slot));
      toast.success(`ID saved for ${guestIdSlotLabel(slot, adults)}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setBusySlot(null);
    }
  };

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-4">
      <div className="flex items-start gap-2">
        <ShieldCheck size={20} className="text-amber-300 shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-200 font-semibold">Photo ID for every guest</p>
          <p className="text-sm text-gray-400 mt-1">
            Upload a government ID for each person on this stay. Check-in instructions are sent only
            after every guest ID is on file.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {slots.map((slot) => {
          const doc = bySlot.get(slot);
          return (
            <label
              key={slot}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-3 cursor-pointer"
            >
              <span className="text-sm text-gray-200">{guestIdSlotLabel(slot, adults)}</span>
              <span className="flex items-center gap-2 text-sm">
                {doc ? (
                  <span className="text-emerald-400 truncate max-w-[180px]">{doc.file_name}</span>
                ) : (
                  <span className="text-gray-500">No file yet</span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-800 text-gray-200">
                  <Upload size={14} />
                  {busySlot === slot ? 'Uploading…' : doc ? 'Replace' : 'Upload'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="sr-only"
                  disabled={busySlot != null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    void upload(slot, file);
                  }}
                />
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
