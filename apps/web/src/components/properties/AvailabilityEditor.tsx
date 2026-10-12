'use client';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Calendar,
  Link2,
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  ExternalLink,
  SlidersHorizontal,
  X,
  Check,
  Tag,
} from 'lucide-react';

type AvailabilityStatus = 'available' | 'blocked' | 'booked';

interface ICalSource {
  id: string;
  name: string;
  ical_url: string;
  last_synced_at: string | null;
  last_hash?: string | null;
  sync_status?: string | null;
  sync_error: string | null;
  is_active: boolean;
  last_manual_sync_at?: string | null;
}

interface AvailabilityEntry {
  id?: string;
  day: string;
  status: AvailabilityStatus;
  price?: number | null;
  note?: string | null;
  room_id?: string | null;
  booking_id?: string | null;
}

interface AvailabilityEditorProps {
  propertyId: string;
  basePrice?: number;
}

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

export function AvailabilityEditor({ propertyId, basePrice }: AvailabilityEditorProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Property default base price (passed as prop or loaded from API)
  const [defaultBasePrice, setDefaultBasePrice] = useState<number>(() => Number(basePrice) || 0);

  // Status mapping: dayKey -> 'available' | 'blocked' | 'booked'
  const [statusMap, setStatusMap] = useState<Record<string, AvailabilityStatus>>({});

  // Custom price mapping: dayKey -> number (null when using default rate)
  const [priceMap, setPriceMap] = useState<Record<string, number | null>>({});

  // Baseline state tracking for diffing
  const [initialBlockedDays, setInitialBlockedDays] = useState<Set<string>>(() => new Set());
  const [initialPriceMap, setInitialPriceMap] = useState<Record<string, number | null>>({});
  const [bookedDays, setBookedDays] = useState<Set<string>>(() => new Set());
  const [removedDays, setRemovedDays] = useState<Set<string>>(() => new Set());

  // Single Day Editing modal
  const [editingDay, setEditingDay] = useState<Date | null>(null);
  const [editPriceInput, setEditPriceInput] = useState<string>('');
  const [editStatusInput, setEditStatusInput] = useState<AvailabilityStatus>('available');

  // Bulk Edit drawer / panel
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkPriceInput, setBulkPriceInput] = useState('');
  const [bulkStatusInput, setBulkStatusInput] = useState<'available' | 'blocked' | 'keep'>('available');
  const [bulkDayFilter, setBulkDayFilter] = useState<'all' | 'weekends' | 'weekdays'>('all');
  const [bulkResetPrice, setBulkResetPrice] = useState(false);

  // iCal sync panel
  const [showICalPanel, setShowICalPanel] = useState(false);
  const [icalSources, setIcalSources] = useState<ICalSource[]>([]);
  const [icalExportUrl, setIcalExportUrl] = useState('');
  const [loadingIcal, setLoadingIcal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [addingSource, setAddingSource] = useState(false);

  useEffect(() => {
    if (basePrice != null && Number(basePrice) > 0) {
      setDefaultBasePrice(Number(basePrice));
    }
  }, [basePrice]);

  useEffect(() => {
    const loadAvailability = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/host/properties/${propertyId}/availability`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load availability');
        }

        if (data.basePrice != null && (!basePrice || basePrice === 0)) {
          setDefaultBasePrice(Number(data.basePrice) || 0);
        }

        const statuses: Record<string, AvailabilityStatus> = {};
        const prices: Record<string, number | null> = {};
        const blocked = new Set<string>();
        const booked = new Set<string>();

        (data.availability || []).forEach((entry: AvailabilityEntry) => {
          if (entry.status === 'booked') {
            statuses[entry.day] = 'booked';
            booked.add(entry.day);
          } else if (entry.status === 'blocked') {
            statuses[entry.day] = 'blocked';
            blocked.add(entry.day);
          } else if (entry.status === 'available') {
            statuses[entry.day] = 'available';
          }

          if (entry.price != null && !isNaN(Number(entry.price)) && Number(entry.price) > 0) {
            prices[entry.day] = Number(entry.price);
          }
        });

        setStatusMap(statuses);
        setPriceMap(prices);
        setInitialBlockedDays(blocked);
        setInitialPriceMap({ ...prices });
        setBookedDays(booked);
        setRemovedDays(new Set());
      } catch (error: any) {
        console.error('[AvailabilityEditor] load error', error);
        toast.error(error.message || 'Failed to load availability');
      } finally {
        setLoading(false);
      }
    };

    loadAvailability();
  }, [propertyId, basePrice]);

  // Load iCal sources
  const loadICalData = async () => {
    setLoadingIcal(true);
    try {
      const response = await fetch(`/api/host/properties/${propertyId}/ical`);
      const data = await response.json();
      if (response.ok) {
        setIcalSources(data.sources || []);
        setIcalExportUrl(data.exportUrl || '');
      }
    } catch (error) {
      console.error('Failed to load iCal data:', error);
    } finally {
      setLoadingIcal(false);
    }
  };

  useEffect(() => {
    if (showICalPanel) {
      loadICalData();
    }
  }, [showICalPanel, propertyId]);

  // Deep link from dashboard: /host/properties/[id]/edit#availability-ical
  useEffect(() => {
    const syncFromHash = () => {
      if (typeof window === 'undefined') return;
      if (window.location.hash === '#availability-ical') {
        setShowICalPanel(true);
        requestAnimationFrame(() => {
          document
            .getElementById('host-availability-ical')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const handleAddICalSource = async () => {
    if (!newSourceName.trim() || !newSourceUrl.trim()) {
      toast.error('Please enter a name and URL');
      return;
    }

    setAddingSource(true);
    try {
      const response = await fetch(`/api/host/properties/${propertyId}/ical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSourceName.trim(),
          ical_url: newSourceUrl.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add source');
      }

      toast.success('Calendar source added and synced!');
      setNewSourceName('');
      setNewSourceUrl('');
      await loadICalData();

      // Reload availability to show newly blocked dates
      const availResponse = await fetch(`/api/host/properties/${propertyId}/availability`);
      const availData = await availResponse.json();
      if (availResponse.ok) {
        const statuses: Record<string, AvailabilityStatus> = {};
        const prices: Record<string, number | null> = {};
        const blocked = new Set<string>();
        const booked = new Set<string>();
        (availData.availability || []).forEach((entry: AvailabilityEntry) => {
          if (entry.status === 'booked') {
            statuses[entry.day] = 'booked';
            booked.add(entry.day);
          } else if (entry.status === 'blocked') {
            statuses[entry.day] = 'blocked';
            blocked.add(entry.day);
          }
          if (entry.price != null && Number(entry.price) > 0) {
            prices[entry.day] = Number(entry.price);
          }
        });
        setStatusMap((prev) => ({ ...prev, ...statuses }));
        setInitialBlockedDays(blocked);
        setBookedDays(booked);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add calendar source');
    } finally {
      setAddingSource(false);
    }
  };

  const handleDeleteICalSource = async (sourceId: string) => {
    if (
      !confirm(
        'Are you sure you want to remove this calendar source? Any blocked dates from this source will also be removed.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/host/properties/${propertyId}/ical?sourceId=${sourceId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete source');
      }

      toast.success('Calendar source removed');
      await loadICalData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove calendar source');
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`/api/host/properties/${propertyId}/ical/sync`, {
        method: 'POST',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync');
      }

      const successCount = data.results?.filter((r: any) => r.success).length || 0;
      const failCount = data.results?.filter((r: any) => !r.success).length || 0;

      if (failCount > 0) {
        toast.error(`Synced ${successCount} calendars, ${failCount} failed`);
      } else {
        toast.success(`Synced ${successCount} calendar${successCount !== 1 ? 's' : ''} successfully!`);
      }

      await loadICalData();

      // Reload availability
      const availResponse = await fetch(`/api/host/properties/${propertyId}/availability`);
      const availData = await availResponse.json();
      if (availResponse.ok) {
        const statuses: Record<string, AvailabilityStatus> = {};
        const blocked = new Set<string>();
        const booked = new Set<string>();
        (availData.availability || []).forEach((entry: AvailabilityEntry) => {
          if (entry.status === 'booked') {
            statuses[entry.day] = 'booked';
            booked.add(entry.day);
          } else if (entry.status === 'blocked') {
            statuses[entry.day] = 'blocked';
            blocked.add(entry.day);
          }
        });
        setStatusMap((prev) => ({ ...prev, ...statuses }));
        setInitialBlockedDays(blocked);
        setBookedDays(booked);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync calendars');
    } finally {
      setSyncing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

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

  const changeMonth = (direction: number) => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
  };

  const handleDayClick = (date: Date | null) => {
    if (!date) return;
    const dayKey = formatDateKey(date);
    const status = statusMap[dayKey] || 'available';

    // Prevent modifying booked dates (from guest bookings)
    if (status === 'booked' || bookedDays.has(dayKey)) {
      toast.error('Booked dates cannot be changed. Cancel the booking first.');
      return;
    }

    const currentPrice = priceMap[dayKey];
    setEditingDay(date);
    setEditStatusInput(status === 'blocked' ? 'blocked' : 'available');
    setEditPriceInput(currentPrice != null ? String(currentPrice) : '');
  };

  const handleApplyDayEdit = () => {
    if (!editingDay) return;
    const dayKey = formatDateKey(editingDay);

    const parsedPrice =
      editPriceInput.trim() !== '' ? Number(editPriceInput.trim()) : null;

    if (parsedPrice != null && (isNaN(parsedPrice) || parsedPrice < 0)) {
      toast.error('Please enter a valid price');
      return;
    }

    setStatusMap((prev) => {
      const next = { ...prev };
      if (editStatusInput === 'blocked') {
        next[dayKey] = 'blocked';
      } else {
        if (parsedPrice != null && parsedPrice > 0) {
          next[dayKey] = 'available';
        } else {
          delete next[dayKey];
        }
      }
      return next;
    });

    setPriceMap((prev) => {
      const next = { ...prev };
      if (parsedPrice != null && parsedPrice > 0) {
        next[dayKey] = parsedPrice;
      } else {
        delete next[dayKey];
      }
      return next;
    });

    setRemovedDays((prev) => {
      const next = new Set(prev);
      if (editStatusInput === 'available' && parsedPrice == null) {
        if (initialBlockedDays.has(dayKey) || initialPriceMap[dayKey] != null) {
          next.add(dayKey);
        } else {
          next.delete(dayKey);
        }
      } else {
        next.delete(dayKey);
      }
      return next;
    });

    setEditingDay(null);
    toast.success(
      `Updated ${editingDay.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`
    );
  };

  const handleApplyBulk = () => {
    if (!bulkStartDate || !bulkEndDate) {
      toast.error('Please specify both start and end dates');
      return;
    }
    if (bulkStartDate > bulkEndDate) {
      toast.error('Start date must be before or equal to end date');
      return;
    }

    const parsedPrice = bulkResetPrice
      ? null
      : bulkPriceInput.trim() !== ''
        ? Number(bulkPriceInput.trim())
        : null;

    if (
      !bulkResetPrice &&
      bulkPriceInput.trim() !== '' &&
      (isNaN(Number(parsedPrice)) || Number(parsedPrice) < 0)
    ) {
      toast.error('Please enter a valid price');
      return;
    }

    const start = new Date(bulkStartDate + 'T12:00:00');
    const end = new Date(bulkEndDate + 'T12:00:00');
    let updatedCount = 0;

    const newStatusMap = { ...statusMap };
    const newPriceMap = { ...priceMap };
    const newRemovedDays = new Set(removedDays);

    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const dayKey = cursor.toISOString().split('T')[0];

      // Skip past dates or booked dates
      const isPast =
        new Date(dayKey).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
      if (isPast || bookedDays.has(dayKey)) continue;

      const dayOfWeek = cursor.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
      if (bulkDayFilter === 'weekends' && dayOfWeek !== 5 && dayOfWeek !== 6) continue;
      if (bulkDayFilter === 'weekdays' && (dayOfWeek === 5 || dayOfWeek === 6)) continue;

      // Apply status if not 'keep'
      if (bulkStatusInput !== 'keep') {
        if (bulkStatusInput === 'blocked') {
          newStatusMap[dayKey] = 'blocked';
          newRemovedDays.delete(dayKey);
        } else {
          // available
          if (parsedPrice != null && parsedPrice > 0) {
            newStatusMap[dayKey] = 'available';
            newRemovedDays.delete(dayKey);
          } else {
            delete newStatusMap[dayKey];
            if (initialBlockedDays.has(dayKey) || initialPriceMap[dayKey] != null) {
              newRemovedDays.add(dayKey);
            }
          }
        }
      }

      // Apply price
      if (bulkResetPrice) {
        delete newPriceMap[dayKey];
        if (
          newStatusMap[dayKey] !== 'blocked' &&
          (initialBlockedDays.has(dayKey) || initialPriceMap[dayKey] != null)
        ) {
          newRemovedDays.add(dayKey);
        }
      } else if (parsedPrice != null && parsedPrice > 0) {
        newPriceMap[dayKey] = parsedPrice;
        newRemovedDays.delete(dayKey);
        if (newStatusMap[dayKey] !== 'blocked') {
          newStatusMap[dayKey] = 'available';
        }
      }

      updatedCount++;
    }

    if (updatedCount === 0) {
      toast.error('No matching dates in the selected range could be updated.');
      return;
    }

    setStatusMap(newStatusMap);
    setPriceMap(newPriceMap);
    setRemovedDays(newRemovedDays);
    setShowBulkPanel(false);
    toast.success(`Updated ${updatedCount} day${updatedCount === 1 ? '' : 's'}!`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries: {
        day: string;
        status: 'available' | 'blocked';
        price?: number | null;
      }[] = [];

      // All blocked days:
      Object.entries(statusMap).forEach(([day, status]) => {
        if (status === 'blocked') {
          entries.push({
            day,
            status: 'blocked',
            price: priceMap[day] ?? null,
          });
        }
      });

      // All available days with custom price:
      Object.entries(priceMap).forEach(([day, price]) => {
        if (price != null && price > 0 && statusMap[day] !== 'blocked' && !bookedDays.has(day)) {
          entries.push({
            day,
            status: 'available',
            price,
          });
        }
      });

      // Days reset back to default available without price override:
      removedDays.forEach((day) => {
        if (statusMap[day] !== 'blocked' && !priceMap[day]) {
          entries.push({
            day,
            status: 'available',
            price: null,
          });
        }
      });

      const response = await fetch(`/api/host/properties/${propertyId}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save availability');
      }

      toast.success('Calendar pricing and availability saved!');
      setRemovedDays(new Set());
      setInitialBlockedDays(
        new Set(
          Object.entries(statusMap)
            .filter(([, status]) => status === 'blocked')
            .map(([day]) => day)
        )
      );
      setInitialPriceMap({ ...priceMap });
    } catch (error: any) {
      console.error('[AvailabilityEditor] save error', error);
      toast.error(error.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const renderDayButton = (date: Date | null, index: number) => {
    if (!date) {
      return <div key={`empty-${index}`} className="h-20" />;
    }

    const dayKey = formatDateKey(date);
    const status = statusMap[dayKey] || 'available';
    const customPrice = priceMap[dayKey];
    const isBooked = status === 'booked' || bookedDays.has(dayKey);
    const isBlocked = status === 'blocked';
    const hasCustomPrice = customPrice != null && customPrice > 0;
    const effectivePrice = hasCustomPrice ? customPrice : defaultBasePrice;

    const isPast =
      new Date(dayKey).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

    const isDisabled = isPast || isBooked;

    let tileBg = 'bg-gray-900 hover:bg-gray-800 text-white border-gray-800 hover:border-gray-700';
    if (isBooked) {
      tileBg = 'bg-emerald-950/40 border-emerald-500/60 text-emerald-100 cursor-not-allowed';
    } else if (isBlocked) {
      tileBg = 'bg-red-950/40 border-red-500/60 text-red-100 hover:border-red-400';
    } else if (hasCustomPrice) {
      tileBg = 'bg-amber-950/30 border-amber-500/50 text-white hover:border-amber-400';
    }

    return (
      <button
        key={dayKey}
        type="button"
        disabled={isDisabled}
        onClick={() => handleDayClick(date)}
        className={`h-20 rounded-xl p-2.5 flex flex-col justify-between text-left transition border ${tileBg} ${
          isPast ? 'opacity-40 cursor-not-allowed' : ''
        }`}
        title={
          isBooked
            ? 'Guest booking — cannot be changed'
            : isPast
              ? 'Past date'
              : 'Click to edit price and availability'
        }
      >
        <div className="flex items-center justify-between w-full">
          <span className="font-semibold text-sm">{date.getDate()}</span>
          {isBooked ? (
            <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
              Booked
            </span>
          ) : isBlocked ? (
            <span className="text-[10px] px-1 py-0.5 rounded bg-red-500/20 text-red-300 font-medium">
              Blocked
            </span>
          ) : hasCustomPrice ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold flex items-center gap-0.5">
              ★ ${customPrice}
            </span>
          ) : null}
        </div>

        <div className="mt-auto">
          {isBooked ? (
            <div className="text-[11px] text-emerald-300 flex items-center gap-1 font-medium">
              <span>🔒</span> Reserved
            </div>
          ) : isBlocked ? (
            <div className="text-[11px] text-red-400 font-medium">Blocked</div>
          ) : (
            <div className="flex items-baseline justify-between gap-1">
              <span
                className={`text-xs font-bold ${
                  hasCustomPrice ? 'text-amber-400' : 'text-gray-200'
                }`}
              >
                ${effectivePrice > 0 ? effectivePrice : '—'}
              </span>
              <span className="text-[10px] text-gray-400">Available</span>
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div
      id="host-availability-ical"
      className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6 mt-8 scroll-mt-24"
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="text-emerald-400" size={24} />
            Availability & custom pricing
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Click any date to set a custom nightly rate or block dates. Or use Bulk Edit to apply prices across date ranges.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {defaultBasePrice > 0 && (
            <div className="px-3 py-1.5 bg-gray-800/80 border border-gray-700 rounded-lg text-xs text-gray-300 flex items-center gap-1.5">
              <Tag size={13} className="text-emerald-400" />
              Base Rate: <strong className="text-white">${defaultBasePrice}</strong>/night
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowBulkPanel(!showBulkPanel)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              showBulkPanel
                ? 'bg-amber-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <SlidersHorizontal size={14} />
            Bulk Edit Rates
          </button>

          <button
            type="button"
            onClick={() => setShowICalPanel(!showICalPanel)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              showICalPanel
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Link2 size={14} />
            iCal Sync
          </button>

          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="px-3 py-1.5 bg-gray-800 rounded-lg text-white hover:bg-gray-700 text-sm"
          >
            ‹
          </button>
          <div className="text-white font-semibold min-w-[130px] text-center text-sm">
            {currentMonth.toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            })}
          </div>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="px-3 py-1.5 bg-gray-800 rounded-lg text-white hover:bg-gray-700 text-sm"
          >
            ›
          </button>
        </div>
      </div>

      {/* Bulk Pricing Panel */}
      {showBulkPanel && (
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-amber-400" />
              Bulk Set Rates & Availability
            </h3>
            <button
              type="button"
              onClick={() => setShowBulkPanel(false)}
              className="text-gray-400 hover:text-white p-1 rounded-lg"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">From Date</label>
              <input
                type="date"
                value={bulkStartDate}
                onChange={(e) => setBulkStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">To Date</label>
              <input
                type="date"
                value={bulkEndDate}
                onChange={(e) => setBulkEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Days of Week</label>
              <select
                value={bulkDayFilter}
                onChange={(e) => setBulkDayFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">All Days</option>
                <option value="weekends">Weekends (Fri & Sat)</option>
                <option value="weekdays">Weekdays (Sun - Thu)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Status</label>
              <select
                value={bulkStatusInput}
                onChange={(e) => setBulkStatusInput(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs focus:border-emerald-500 focus:outline-none"
              >
                <option value="available">Set Available</option>
                <option value="blocked">Set Blocked</option>
                <option value="keep">Keep Current Status</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-gray-700/60">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-300">Custom Price:</label>
              <div className="relative w-36">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">$</span>
                <input
                  type="number"
                  min="1"
                  disabled={bulkResetPrice}
                  placeholder={defaultBasePrice > 0 ? String(defaultBasePrice) : 'Price'}
                  value={bulkPriceInput}
                  onChange={(e) => setBulkPriceInput(e.target.value)}
                  className="w-full pl-6 pr-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs focus:border-emerald-500 focus:outline-none disabled:opacity-40"
                />
              </div>
            </div>

            {defaultBasePrice > 0 && (
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkResetPrice}
                  onChange={(e) => setBulkResetPrice(e.target.checked)}
                  className="rounded border-gray-700 text-emerald-600 focus:ring-emerald-500"
                />
                Reset to default rate (${defaultBasePrice})
              </label>
            )}

            <button
              type="button"
              onClick={handleApplyBulk}
              className="ml-auto px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow transition"
            >
              Apply to Selected Range
            </button>
          </div>
        </div>
      )}

      {/* iCal Sync Panel */}
      {showICalPanel && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar size={20} className="text-blue-400" />
              Calendar Sync
            </h3>
            {icalSources.length > 0 && (
              <button
                type="button"
                onClick={handleSyncAll}
                disabled={syncing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
              >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync All'}
              </button>
            )}
          </div>

          {/* Export URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Your Calendar Export URL</label>
            <p className="text-xs text-gray-500">
              Share this URL with other platforms (Airbnb, VRBO, etc.) to sync your VibesBNB bookings to them.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={icalExportUrl || 'Loading...'}
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 text-sm"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(icalExportUrl)}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                title="Copy URL"
              >
                <Copy size={18} />
              </button>
              <a
                href={icalExportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                title="Open iCal file"
              >
                <ExternalLink size={18} />
              </a>
            </div>
          </div>

          {/* Import Sources */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Import from External Calendars</label>
            <p className="text-xs text-gray-500">
              Add iCal URLs from Airbnb, VRBO, or other platforms to auto-block those dates here.
            </p>

            {/* Add new source */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Source name (e.g., Airbnb)"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm flex-1 sm:max-w-[200px]"
              />
              <input
                type="url"
                placeholder="iCal URL (https://...)"
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm flex-1"
              />
              <button
                type="button"
                onClick={handleAddICalSource}
                disabled={addingSource}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2 text-sm font-medium whitespace-nowrap"
              >
                <Plus size={18} />
                {addingSource ? 'Adding...' : 'Add Source'}
              </button>
            </div>

            {/* Existing sources */}
            {loadingIcal ? (
              <p className="text-gray-500 text-sm">Loading sources...</p>
            ) : icalSources.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No external calendars connected yet.</p>
            ) : (
              <div className="space-y-2">
                {icalSources.map((source) => (
                  <div
                    key={source.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      source.sync_error
                        ? 'bg-red-900/20 border-red-500/50'
                        : 'bg-gray-900/50 border-gray-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{source.name}</span>
                        {source.sync_status && (
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              source.sync_status === 'failed'
                                ? 'bg-red-500/25 text-red-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {source.sync_status}
                          </span>
                        )}
                        {source.sync_error && (
                          <span className="text-xs text-red-400">⚠ Sync error</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate" title={source.ical_url}>
                        {source.ical_url}
                      </p>
                      {source.last_synced_at && !source.sync_error && (
                        <p className="text-xs text-gray-500">
                          Last synced: {new Date(source.last_synced_at).toLocaleString()}
                        </p>
                      )}
                      {source.sync_error && (
                        <p className="text-xs text-red-400 mt-1">
                          {typeof source.sync_error === 'string'
                            ? source.sync_error
                            : JSON.stringify(source.sync_error)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteICalSource(source.id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition"
                      title="Remove source"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 py-8 text-center">Loading calendar availability & rates...</div>
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

      {/* Legend */}
      <div className="flex items-center flex-wrap gap-6 text-sm text-gray-300 pt-2">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-gray-900 border border-gray-700" />
          Available {defaultBasePrice > 0 && <span className="text-xs text-gray-400">(${defaultBasePrice} base)</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-amber-950/40 border border-amber-500/50" />
          Custom Price <span className="text-xs text-amber-400 font-medium">(★ Override)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-red-950/60 border border-red-500" />
          Blocked
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-emerald-950/60 border border-emerald-500" />
          Booked 🔒
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-emerald-900/30 flex items-center gap-2"
        >
          {saving && <RefreshCw size={16} className="animate-spin" />}
          {saving ? 'Saving...' : 'Save Availability & Pricing'}
        </button>
      </div>

      {/* Single Day Edit Modal */}
      {editingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar size={18} className="text-emerald-400" />
                  {editingDay.toLocaleDateString('default', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Set a custom nightly price or change availability status
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDay(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Status Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Availability Status
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEditStatusInput('available')}
                  className={`py-2.5 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition ${
                    editStatusInput === 'available'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/30'
                      : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Check
                    size={16}
                    className={editStatusInput === 'available' ? 'opacity-100' : 'opacity-0'}
                  />
                  Available
                </button>
                <button
                  type="button"
                  onClick={() => setEditStatusInput('blocked')}
                  className={`py-2.5 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition ${
                    editStatusInput === 'blocked'
                      ? 'bg-red-950/60 border-red-500 text-red-200 ring-2 ring-red-500/30'
                      : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <X
                    size={16}
                    className={editStatusInput === 'blocked' ? 'opacity-100' : 'opacity-0'}
                  />
                  Blocked
                </button>
              </div>
            </div>

            {/* Custom Price Setting */}
            {editStatusInput === 'available' && (
              <div className="space-y-2 pt-2 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Nightly Price
                  </label>
                  {defaultBasePrice > 0 && (
                    <span className="text-xs text-gray-400">
                      Default: <strong className="text-white">${defaultBasePrice}</strong>
                    </span>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-lg">
                    $
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder={defaultBasePrice > 0 ? String(defaultBasePrice) : 'Enter price'}
                    value={editPriceInput}
                    onChange={(e) => setEditPriceInput(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-gray-950 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-white font-semibold text-lg placeholder-gray-600 focus:outline-none transition"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-gray-400">
                    {editPriceInput.trim() !== '' && Number(editPriceInput) !== defaultBasePrice ? (
                      <span className="text-amber-300 font-medium">★ Custom price will apply to this night</span>
                    ) : (
                      'Leave empty to use listing base price.'
                    )}
                  </p>
                  {editPriceInput.trim() !== '' && defaultBasePrice > 0 && (
                    <button
                      type="button"
                      onClick={() => setEditPriceInput('')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium"
                    >
                      Reset to base (${defaultBasePrice})
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setEditingDay(null)}
                className="px-4 py-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyDayEdit}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-900/40 transition"
              >
                Apply to Date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AvailabilityEditor;
