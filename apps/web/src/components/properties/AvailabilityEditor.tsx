'use client';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Link2, Plus, RefreshCw, Trash2, Copy, ExternalLink } from 'lucide-react';

type AvailabilityStatus = 'available' | 'blocked' | 'booked';

interface ICalSource {
  id: string;
  name: string;
  ical_url: string;
  last_synced_at: string | null;
  sync_error: string | null;
  is_active: boolean;
}

interface AvailabilityEntry {
  id?: string;
  day: string;
  status: AvailabilityStatus;
  note?: string | null;
  room_id?: string | null;
  booking_id?: string | null;
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
  const [bookedDays, setBookedDays] = useState<Set<string>>(() => new Set());
  const [removedDays, setRemovedDays] = useState<Set<string>>(() => new Set());
  
  // iCal sync state
  const [showICalPanel, setShowICalPanel] = useState(false);
  const [icalSources, setIcalSources] = useState<ICalSource[]>([]);
  const [icalExportUrl, setIcalExportUrl] = useState('');
  const [loadingIcal, setLoadingIcal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [addingSource, setAddingSource] = useState(false);

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
        const booked = new Set<string>();
        (data.availability || []).forEach((entry: AvailabilityEntry) => {
          // For simplicity, we show property-wide status
          // In future, we could show per-room status
          if (!map[entry.day] || entry.status === 'booked') {
            map[entry.day] = entry.status;
          }
          if (entry.status === 'blocked') {
            blocked.add(entry.day);
          }
          if (entry.status === 'booked') {
            booked.add(entry.day);
          }
        });

        setAvailabilityMap(map);
        setInitialBlockedDays(blocked);
        setRemovedDays(new Set());
        // Store booked days in state (they can't be modified)
        setBookedDays(booked);
      } catch (error: any) {
        console.error('[AvailabilityEditor] load error', error);
        toast.error(error.message || 'Failed to load availability');
      } finally {
        setLoading(false);
      }
    };

    loadAvailability();
  }, [propertyId]);

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
        const map: Record<string, AvailabilityStatus> = {};
        const blocked = new Set<string>();
        const booked = new Set<string>();
        (availData.availability || []).forEach((entry: AvailabilityEntry) => {
          if (!map[entry.day] || entry.status === 'booked') {
            map[entry.day] = entry.status;
          }
          if (entry.status === 'blocked') blocked.add(entry.day);
          if (entry.status === 'booked') booked.add(entry.day);
        });
        setAvailabilityMap(map);
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
    if (!confirm('Are you sure you want to remove this calendar source? Any blocked dates from this source will also be removed.')) {
      return;
    }

    try {
      const response = await fetch(`/api/host/properties/${propertyId}/ical?sourceId=${sourceId}`, {
        method: 'DELETE',
      });

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
        const map: Record<string, AvailabilityStatus> = {};
        const blocked = new Set<string>();
        const booked = new Set<string>();
        (availData.availability || []).forEach((entry: AvailabilityEntry) => {
          if (!map[entry.day] || entry.status === 'booked') {
            map[entry.day] = entry.status;
          }
          if (entry.status === 'blocked') blocked.add(entry.day);
          if (entry.status === 'booked') booked.add(entry.day);
        });
        setAvailabilityMap(map);
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

  const toggleDay = (date: Date | null) => {
    if (!date) return;
    const dayKey = formatDateKey(date);
    const current = availabilityMap[dayKey] || 'available';

    // Prevent modifying booked dates (from guest bookings)
    if (current === 'booked' || bookedDays.has(dayKey)) {
      toast.error('Booked dates cannot be changed. Cancel the booking first.');
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
    const isBooked = status === 'booked' || bookedDays.has(dayKey);

    const colors: Record<AvailabilityStatus, string> = {
      available:
        'bg-gray-900 hover:bg-gray-800 text-white border border-gray-800',
      blocked: 'bg-red-900/60 border border-red-500 text-red-100',
      booked: 'bg-emerald-900/60 border border-emerald-500 text-emerald-100 cursor-not-allowed',
    };

    const isPast =
      new Date(dayKey).setHours(0, 0, 0, 0) <
      new Date().setHours(0, 0, 0, 0);

    const isDisabled = isPast || isBooked;

    return (
      <button
        key={dayKey}
        type="button"
        disabled={isDisabled}
        onClick={() => toggleDay(date)}
        className={`h-16 rounded-lg text-sm font-semibold transition ${
          colors[status]
        } ${isPast ? 'opacity-40' : ''} ${isDisabled ? 'cursor-not-allowed' : ''}`}
        title={isBooked ? 'Guest booking - cannot be changed' : undefined}
      >
        <div>{date.getDate()}</div>
        <div className="text-xs capitalize flex items-center justify-center gap-1">
          {isBooked && <span>🔒</span>}
          {status}
        </div>
      </button>
    );
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6 mt-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Availability</h2>
          <p className="text-gray-400 text-sm">
            Click on a day to toggle between available and blocked. Booked days
            are locked.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowICalPanel(!showICalPanel)}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition ${
              showICalPanel 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Link2 size={18} />
            iCal Sync
          </button>
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="px-3 py-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700"
          >
            ‹
          </button>
          <div className="text-white font-semibold min-w-[140px] text-center">
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
            <p className="text-xs text-gray-500">Share this URL with other platforms (Airbnb, VRBO, etc.) to sync your VibesBNB bookings to them.</p>
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
            <p className="text-xs text-gray-500">Add iCal URLs from Airbnb, VRBO, or other platforms to auto-block those dates here.</p>
            
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
                        <p className="text-xs text-red-400 mt-1">{source.sync_error}</p>
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

