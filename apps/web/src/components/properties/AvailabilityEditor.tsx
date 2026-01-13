'use client';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

type AvailabilityStatus = 'available' | 'blocked' | 'booked';

interface AvailabilityEntry {
  id?: string;
  day: string;
  status: AvailabilityStatus;
  note?: string | null;
}

interface AvailabilityEditorProps {
  propertyId: string;
}

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

export function AvailabilityEditor({ propertyId }: AvailabilityEditorProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availabilityMap, setAvailabilityMap] = useState<
    Record<string, AvailabilityStatus>
  >({});
  const [initialBlockedDays, setInitialBlockedDays] = useState<Set<string>>(
    () => new Set()
  );
  const [removedDays, setRemovedDays] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const loadAvailability = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/host/properties/${propertyId}/availability`
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load availability');
        }

        const map: Record<string, AvailabilityStatus> = {};
        const blocked = new Set<string>();
        (data.availability || []).forEach((entry: AvailabilityEntry) => {
          map[entry.day] = entry.status;
          if (entry.status === 'blocked') {
            blocked.add(entry.day);
          }
        });

        setAvailabilityMap(map);
        setInitialBlockedDays(blocked);
        setRemovedDays(new Set());
      } catch (error: any) {
        console.error('[AvailabilityEditor] load error', error);
        toast.error(error.message || 'Failed to load availability');
      } finally {
        setLoading(false);
      }
    };

    loadAvailability();
  }, [propertyId]);

  const calendarDays = useMemo(() => {
    const days: (Date | null)[] = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startingWeekday = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < startingWeekday; i++) {
      days.push(null);
    }

    for (let day = 1; day <= totalDays; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [currentMonth]);

  const toggleDay = (date: Date | null) => {
    if (!date) return;
    const dayKey = formatDateKey(date);
    const current = availabilityMap[dayKey] || 'available';

    if (current === 'booked') {
      toast.error('Booked dates cannot be changed.');
      return;
    }

    setAvailabilityMap((prev) => {
      const updated = { ...prev };
      if (current === 'available') {
        updated[dayKey] = 'blocked';
        setRemovedDays((prevRemoved) => {
          const updatedRemoved = new Set(prevRemoved);
          updatedRemoved.delete(dayKey);
          return updatedRemoved;
        });
      } else if (current === 'blocked') {
        delete updated[dayKey];
        setRemovedDays((prevRemoved) => {
          const updatedRemoved = new Set(prevRemoved);
          if (initialBlockedDays.has(dayKey)) {
            updatedRemoved.add(dayKey);
          } else {
            updatedRemoved.delete(dayKey);
          }
          return updatedRemoved;
        });
      }
      return updated;
    });
  };

  const changeMonth = (direction: number) => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries: { day: string; status: 'available' | 'blocked' }[] = [];

      Object.entries(availabilityMap).forEach(([day, status]) => {
        if (status === 'blocked') {
          entries.push({ day, status: 'blocked' });
        }
      });

      removedDays.forEach((day) => {
        entries.push({ day, status: 'available' });
      });

      const response = await fetch(
        `/api/host/properties/${propertyId}/availability`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save availability');
      }

      toast.success('Availability updated');
      setRemovedDays(new Set());
      setInitialBlockedDays(
        new Set(
          Object.entries(availabilityMap)
            .filter(([, status]) => status === 'blocked')
            .map(([day]) => day)
        )
      );
    } catch (error: any) {
      console.error('[AvailabilityEditor] save error', error);
      toast.error(error.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const renderDayButton = (date: Date | null, index: number) => {
    if (!date) {
      return <div key={`empty-${index}`} className="h-16" />;
    }

    const dayKey = formatDateKey(date);
    const status = availabilityMap[dayKey] || 'available';

    const colors: Record<AvailabilityStatus, string> = {
      available:
        'bg-gray-900 hover:bg-gray-800 text-white border border-gray-800',
      blocked: 'bg-red-900/60 border border-red-500 text-red-100',
      booked: 'bg-emerald-900/60 border border-emerald-500 text-emerald-100',
    };

    const isPast =
      new Date(dayKey).setHours(0, 0, 0, 0) <
      new Date().setHours(0, 0, 0, 0);

    return (
      <button
        key={dayKey}
        type="button"
        disabled={isPast && status !== 'blocked' && status !== 'booked'}
        onClick={() => toggleDay(date)}
        className={`h-16 rounded-lg text-sm font-semibold transition ${
          colors[status]
        } ${isPast ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <div>{date.getDate()}</div>
        <div className="text-xs capitalize">{status}</div>
      </button>
    );
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6 mt-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Availability</h2>
          <p className="text-gray-400 text-sm">
            Click on a day to toggle between available and blocked. Booked days
            are locked.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="px-3 py-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700"
          >
            ‹
          </button>
          <div className="text-white font-semibold">
            {currentMonth.toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            })}
          </div>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="px-3 py-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700"
          >
            ›
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading availability...</div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-2 text-center text-gray-400 text-xs uppercase tracking-wide">
            {dayLabels.map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => renderDayButton(day, idx))}
          </div>
        </>
      )}

      <div className="flex items-center gap-6 text-sm text-gray-300">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-gray-800 border border-gray-700" />
          Available
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-red-900/60 border border-red-500" />
          Blocked
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-emerald-900/60 border border-emerald-500" />
          Booked
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Availability'}
        </button>
      </div>
    </div>
  );
}

export default AvailabilityEditor;

