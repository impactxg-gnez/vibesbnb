'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Users, ArrowLeft, CreditCard, FileText, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { PayPalBookingButtons } from '@/components/payments/PayPalBookingButtons';
import {
  enumerateStayNightsYmd,
  nightsBetweenYmd,
  parseCalendarDate,
  startOfTodayLocal,
  todayLocalYmd,
} from '@/lib/dateUtils';
import { buildGuestAgreementNotice } from '@/lib/guestAgreementCopy';
import { PROPERTY_DETAIL_PUBLIC_COLUMNS } from '@/lib/propertyPublicSelect';
import { minNightsLabel, normalizeMinBookingNights } from '@/lib/minBookingNights';
import {
  clearWellnessCartForBooking,
  loadWellnessCartForBooking,
  type WellnessBookingLineItem,
} from '@/lib/wellnessBookingCart';
import { buildBookingQuoteFromProperty } from '@/lib/bookingQuote';
import { ReservationQuote } from '@/components/booking/ReservationQuote';
import { travellerNeedsPhoneVerification } from '@/lib/auth/hasVerifiedPhone';
import type { HostBadge } from '@/lib/hostBadge';

interface Property {
  id: string;
  name: string;
  location: string;
  price: number;
  images: string[];
  guests: number;
  host_id?: string;
  hostName?: string;
  hostImage?: string;
  hostJoinedYear?: string;
  cleaningFee?: number;
  refundableDeposit?: number;
  allowExtraGuests?: boolean;
  extraGuestPrice?: number;
  minBookingNights?: number | null;
  allowDirectBooking?: boolean;
  /** Host-uploaded PDF URL (optional); snapshot stored on booking */
  guest_agreement_url?: string | null;
  smoking_inside_allowed?: boolean;
  rooms?: Array<{
    id: string;
    name: string;
    price: number;
    guests: number;
  }>;
}

export default function NewBookingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = searchParams.get('propertyId');
  const selectedUnitsParam = searchParams.get('selectedUnits');
  const [selectedUnits, setSelectedUnits] = useState<any[]>([]);

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState<Record<string, string[]>>({});
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementSignerName, setAgreementSignerName] = useState('');
  const [checkoutBookingId, setCheckoutBookingId] = useState<string | null>(null);

  // Initialize with URL params if available
  const initialCheckIn = searchParams.get('checkIn') || '';
  const initialCheckOut = searchParams.get('checkOut') || '';
  const initialGuests = Math.max(1, parseInt(searchParams.get('guests') || '1', 10) || 1);
  const initialKids = Math.max(0, parseInt(searchParams.get('kids') || '0', 10) || 0);
  const initialPets = Math.max(0, parseInt(searchParams.get('pets') || '0', 10) || 0);

  const [formData, setFormData] = useState({
    checkIn: initialCheckIn,
    checkOut: initialCheckOut,
    guests: initialGuests,
    kids: initialKids,
    pets: initialPets,
    specialRequests: '',
  });
  const [wellnessLineItems, setWellnessLineItems] = useState<WellnessBookingLineItem[]>([]);
  const [hostDisplayBadge, setHostDisplayBadge] = useState<HostBadge | null>(null);
  const bookingPropertyReloadRef = useRef<string | null>(null);
  const agreementSignerSeedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setWellnessLineItems([]);
      return;
    }
    setWellnessLineItems(loadWellnessCartForBooking(propertyId));
  }, [propertyId]);

  useEffect(() => {
    if (authLoading) return;
    const qs = searchParams.toString();
    const nextPath = `/bookings/new${qs ? `?${qs}` : ''}`;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }
    if (travellerNeedsPhoneVerification(user)) {
      router.replace(`/verify-phone?next=${encodeURIComponent(nextPath)}`);
    }
  }, [user, authLoading, router, searchParams]);

  useEffect(() => {
    if (!user?.id) return;
    if (agreementSignerSeedRef.current === user.id) return;
    agreementSignerSeedRef.current = user.id;
    const meta = user.user_metadata as { full_name?: string } | undefined;
    if (meta?.full_name) {
      setAgreementSignerName(String(meta.full_name));
    } else if (user.email) {
      setAgreementSignerName(user.email.split('@')[0]);
    }
  }, [user?.id]);

  const loadProperty = async () => {
    setLoading(true);
    setHostDisplayBadge(null);
    try {
      const supabase = createClient();
      const { data: rawProperty, error } = await supabase
        .from('properties')
        .select(PROPERTY_DETAIL_PUBLIC_COLUMNS)
        .eq('id', propertyId)
        .eq('status', 'active')
        .single();

      if (error || !rawProperty) {
        toast.error('Property not found');
        router.push('/search');
        return;
      }

      const propertyRow = rawProperty as unknown as Record<string, unknown>;
      const hostId =
        propertyRow.host_id != null ? String(propertyRow.host_id) : undefined;
      const defaultHostName = 'Property Host';
      const defaultHostImage = `https://api.dicebear.com/7.x/initials/svg?seed=${hostId || 'host'}`;

      let hostName = defaultHostName;
      let hostImage = defaultHostImage;
      let hostJoinedYear: string | undefined;

      if (hostId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, created_at')
          .eq('id', hostId)
          .maybeSingle();
        if (profile?.full_name) hostName = String(profile.full_name);
        if (profile?.avatar_url) hostImage = String(profile.avatar_url);
        if (profile?.created_at) {
          hostJoinedYear = new Date(String(profile.created_at)).getFullYear().toString();
        }

        fetch('/api/hosts/badge-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostId }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((payload) => {
            if (payload?.badge === 'superbud' || payload?.badge === 'vibesetter') {
              setHostDisplayBadge(payload.badge);
            } else {
              setHostDisplayBadge(null);
            }
          })
          .catch(() => setHostDisplayBadge(null));
      } else {
        setHostDisplayBadge(null);
      }

      setProperty({
        id: String(propertyRow.id),
        name: String(propertyRow.name ?? propertyRow.title ?? 'Untitled Property'),
        location: String(propertyRow.location ?? ''),
        price: propertyRow.price != null ? Number(propertyRow.price) : 0,
        images: Array.isArray(propertyRow.images) ? (propertyRow.images as string[]) : [],
        guests: Number(propertyRow.guests ?? 1) || 1,
        host_id: hostId,
        hostName,
        hostImage,
        hostJoinedYear,
        guest_agreement_url:
          typeof propertyRow.guest_agreement_url === 'string'
            ? propertyRow.guest_agreement_url
            : null,
        smoking_inside_allowed: propertyRow.smoking_inside_allowed === true,
        cleaningFee:
          propertyRow.cleaning_fee != null
            ? Number(propertyRow.cleaning_fee)
            : propertyRow.cleaningFee != null
              ? Number(propertyRow.cleaningFee)
              : 0,
        refundableDeposit:
          propertyRow.refundable_deposit != null ? Number(propertyRow.refundable_deposit) : 0,
        allowExtraGuests: propertyRow.allow_extra_guests === true,
        extraGuestPrice:
          propertyRow.extra_guest_price != null ? Number(propertyRow.extra_guest_price) : 0,
        rooms: Array.isArray(propertyRow.rooms) ? propertyRow.rooms : [],
        minBookingNights: normalizeMinBookingNights(propertyRow.min_booking_nights),
        allowDirectBooking: propertyRow.allow_direct_booking === true,
      });

      // If units were selected, filter them
      if (selectedUnitsParam && propertyRow.rooms) {
        const selectedIds = selectedUnitsParam.split(',');
        const rooms = propertyRow.rooms as { id: string }[];
        const filtered = rooms.filter((r) => selectedIds.includes(r.id));
        setSelectedUnits(filtered);
      }

      const maxGuests = Number(propertyRow.guests ?? 1) || 1;
      setFormData((prev) => ({
        ...prev,
        guests: Math.min(Math.max(prev.guests, 1), maxGuests),
      }));

      await loadAvailability(String(propertyRow.id));
    } catch (error) {
      console.error('Error loading property:', error);
      toast.error('Failed to load property');
      router.push('/search');
    } finally {
      setLoading(false);
    }
  };

  const loadPropertyRef = useRef(loadProperty);
  loadPropertyRef.current = loadProperty;

  useEffect(() => {
    if (!propertyId) {
      bookingPropertyReloadRef.current = null;
      return;
    }
    if (!user) return;
    const key = `${propertyId}:${user.id}`;
    if (bookingPropertyReloadRef.current === key) return;
    bookingPropertyReloadRef.current = key;
    void loadPropertyRef.current();
  }, [propertyId, user?.id]);

  const loadAvailability = async (id: string) => {
    try {
      const response = await fetch(`/api/properties/${id}/availability`);
      if (!response.ok) return;
      const data = await response.json();
      const map: Record<string, string[]> = {};
      (data.availability || []).forEach((entry: { day: string; status: string; room_id?: string | null }) => {
        if (!map[entry.day]) map[entry.day] = [];
        // If room_id is null, the whole property is blocked
        map[entry.day].push(entry.room_id || 'PROPERTY_WIDE');
      });
      setAvailability(map);
    } catch (error) {
      console.warn('Failed to load availability', error);
    }
  };

  const bookingQuote =
    property && formData.checkIn && formData.checkOut
      ? buildBookingQuoteFromProperty({
          property: {
            price: property.price,
            cleaning_fee: property.cleaningFee,
            guests: property.guests,
            allow_extra_guests: property.allowExtraGuests,
            extra_guest_price: property.extraGuestPrice,
            refundable_deposit: property.refundableDeposit,
          },
          checkInYmd: formData.checkIn,
          checkOutYmd: formData.checkOut,
          selectedUnits,
          adults: formData.guests,
          kids: formData.kids,
          pets: formData.pets,
          wellnessLineItems: wellnessLineItems,
          applyCardFee: property.allowDirectBooking === true,
        })
      : null;

  const validateBookingForm = (): boolean => {
    if (!user || !property) return false;

    if (property.host_id && String(property.host_id) === String(user.id)) {
      toast.error('Hosts cannot book their own properties.');
      return false;
    }

    if (!formData.checkIn || !formData.checkOut) {
      toast.error('Please select check-in and check-out dates');
      return false;
    }

    const checkInDate = parseCalendarDate(formData.checkIn);
    const checkOutDate = parseCalendarDate(formData.checkOut);
    const today = startOfTodayLocal();

    if (!checkInDate || checkInDate < today) {
      toast.error('Check-in date cannot be in the past');
      return false;
    }

    if (!checkOutDate || checkOutDate.getTime() <= checkInDate.getTime()) {
      toast.error('Check-out date must be after check-in date');
      return false;
    }

    const nights = nightsBetweenYmd(formData.checkIn, formData.checkOut);
    const minN = property.minBookingNights;
    if (minN != null && nights < minN) {
      toast.error(
        `This property requires a minimum stay of ${minN} night${minN === 1 ? '' : 's'}.`
      );
      return false;
    }

    if (!property.allowExtraGuests && formData.guests > property.guests) {
      toast.error(`This property can only accommodate ${property.guests} guests`);
      return false;
    }
    if (property.allowExtraGuests && formData.guests < 1) {
      toast.error('Please enter at least 1 adult');
      return false;
    }

    const nightKeys = enumerateStayNightsYmd(formData.checkIn, formData.checkOut);
    for (const key of nightKeys) {
      const blockedUnits = availability[key] || [];

      if (blockedUnits.includes('PROPERTY_WIDE')) {
        toast.error('Selected dates include blocked or already booked nights.');
        return false;
      }

      if (selectedUnits.length > 0) {
        const isAnySelectedUnitBlocked = selectedUnits.some((unit) =>
          blockedUnits.includes(unit.id)
        );
        if (isAnySelectedUnitBlocked) {
          toast.error('Selected dates include blocked or already booked nights.');
          return false;
        }
      } else if (blockedUnits.length > 0) {
        toast.error('Selected dates include blocked or already booked nights.');
        return false;
      }
    }

    if (!bookingQuote) {
      toast.error('Please select valid dates to calculate the total price');
      return false;
    }

    const signed = agreementSignerName.trim();
    if (!agreementAccepted || signed.length < 2) {
      toast.error(
        'Please read the house rules agreement, check the box, and enter your full legal name as it appears on your ID.'
      );
      return false;
    }

    return true;
  };

  const handleStartCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutBookingId) return;
    if (!validateBookingForm() || !user || !property) return;

    if (!bookingQuote) return;

    if (travellerNeedsPhoneVerification(user)) {
      const qs = searchParams.toString();
      const nextPath = `/bookings/new${qs ? `?${qs}` : ''}`;
      toast.error('Verify your phone number before booking.');
      router.push(`/verify-phone?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    const signed = agreementSignerName.trim();

    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser();

      if (!supabaseUser) {
        toast.error('Please log in to make a booking');
        return;
      }

      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: property.id,
          property_name: property.name,
          property_image: property.images[0] || '',
          location: property.location,
          check_in: formData.checkIn,
          check_out: formData.checkOut,
          guests: formData.guests,
          kids: formData.kids || 0,
          pets: formData.pets || 0,
          total_price: bookingQuote.grandTotal,
          special_requests: formData.specialRequests || '',
          wellness_line_items: wellnessLineItems,
          guest_name: user.user_metadata?.full_name || user.email || 'Guest',
          guest_email: user.email || '',
          selected_units: selectedUnits.length > 0 ? selectedUnits : null,
          guest_agreement_accepted: true,
          guest_agreement_signer_name: signed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }

      const newId = data.booking?.id as string | undefined;
      const conversationId = data.conversationId as string | undefined;
      if (!newId) {
        throw new Error('Booking created but no id returned');
      }

      clearWellnessCartForBooking(property.id);

      if (data.allowDirectBooking) {
        setCheckoutBookingId(newId);
        toast.success('Request saved. Complete PayPal payment below to secure your stay.');
        return;
      }

      toast.success('Request sent! Message the host while you wait for approval.');
      const messagesUrl = conversationId
        ? `/messages?conversationId=${conversationId}&submitted=1`
        : '/messages?submitted=1';
      router.push(messagesUrl);
    } catch (error: unknown) {
      console.error('Error creating booking:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Property not found</h2>
          <Link href="/search" className="text-emerald-500 hover:text-emerald-400">
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  const agreementNotice = property
    ? buildGuestAgreementNotice({
        propertyName: property.name,
        smokingInsideAllowed: property.smoking_inside_allowed === true,
        hostAgreementUrl: property.guest_agreement_url || null,
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link
          href={`/listings/${property.id}`}
          className="text-emerald-500 hover:text-emerald-400 mb-6 inline-flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          Back to property
        </Link>

        <h1 className="text-4xl font-bold text-white mb-8">Request to Book</h1>
        <p className="text-gray-400 mb-8 -mt-4">
          {property.allowDirectBooking
            ? 'Submit your stay details and pay with PayPal to secure this property.'
            : 'Submit your stay details. You’ll message the host next—they must approve before you can pay.'}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleStartCheckout} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
              {/* Property Info */}
              <div className="pb-6 border-b border-gray-800">
                <h2 className="text-2xl font-bold text-white mb-2">{property.name}</h2>
                <p className="text-gray-400">{property.location}</p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    <Calendar size={16} className="inline mr-2" />
                    Check-in
                  </label>
                  <input
                    type="date"
                    value={formData.checkIn}
                    onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                    min={todayLocalYmd()}
                    required
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    <Calendar size={16} className="inline mr-2" />
                    Check-out
                  </label>
                  <input
                    type="date"
                    value={formData.checkOut}
                    onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                    min={formData.checkIn || todayLocalYmd()}
                    required
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  />
                </div>
              </div>
              {property.minBookingNights != null && (
                <p className="text-sm text-amber-200/90 flex items-center gap-2">
                  <Calendar size={14} className="shrink-0" aria-hidden />
                  {minNightsLabel(property.minBookingNights)}
                </p>
              )}
              {Object.keys(availability).length > 0 && (
                <p className="text-xs text-red-400">
                  Note: Some dates are unavailable. If a selected range overlaps with blocked or booked nights, you'll be asked to choose new dates.
                </p>
              )}

              {/* Party size */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  <Users size={16} className="inline mr-2" />
                  Adults
                </label>
                <input
                  type="number"
                  min={1}
                  max={property.allowExtraGuests ? undefined : property.guests}
                  value={formData.guests}
                  onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) || 1 })}
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {property.allowExtraGuests
                    ? `Base rate includes up to ${property.guests} adults; extra guests are charged per night.`
                    : `Maximum ${property.guests} adults`}
                </p>
              </div>

              {/* Kids and Pets */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Kids</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.kids}
                    onChange={(e) => setFormData({ ...formData, kids: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Pets</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.pets}
                    onChange={(e) => setFormData({ ...formData, pets: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  />
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Special Requests</label>
                <textarea
                  value={formData.specialRequests}
                  onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                  rows={4}
                  placeholder="Any special requests or notes for the host..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500"
                />
              </div>

              {/* Guest agreement (required for every booking) */}
              {agreementNotice && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <FileText size={20} />
                    {agreementNotice.title}
                  </div>
                  <ul className="list-disc list-inside text-sm text-gray-300 space-y-2">
                    {agreementNotice.bullets.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                  {property.guest_agreement_url ? (
                    <a
                      href={property.guest_agreement_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
                    >
                      <ExternalLink size={16} />
                      Open host agreement (PDF)
                    </a>
                  ) : null}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Full legal name (signing guest)
                    </label>
                    <input
                      type="text"
                      value={agreementSignerName}
                      onChange={(e) => setAgreementSignerName(e.target.value)}
                      autoComplete="name"
                      required
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 text-white"
                      placeholder="As on government ID"
                    />
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer text-sm text-gray-200">
                    <input
                      type="checkbox"
                      checked={agreementAccepted}
                      onChange={(e) => setAgreementAccepted(e.target.checked)}
                      className="mt-1 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      I have read and agree to the house rules and guest agreement above
                      {property.guest_agreement_url ? ', including the host PDF if provided,' : ''} on behalf of
                      myself and my party. I understand this helps protect hosts from liability and keeps stays
                      compliant with building rules.
                    </span>
                  </label>
                </div>
              )}

              {property.allowDirectBooking && checkoutBookingId && (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-yellow-200 font-semibold">
                    <CreditCard size={20} />
                    Pay with PayPal
                  </div>
                  <p className="text-sm text-gray-400">
                    Your request is on file and the host has been notified. Complete payment to
                    secure this booking at the total shown.
                  </p>
                  <PayPalBookingButtons
                    bookingId={checkoutBookingId}
                    successMessage="Payment received! Your stay is secured."
                    onPaid={() => router.push('/bookings')}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  !bookingQuote ||
                  (property.allowDirectBooking && !!checkoutBookingId)
                }
                className="w-full px-6 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold text-lg"
              >
                {property.allowDirectBooking && checkoutBookingId ? (
                  'Request saved — use PayPal above'
                ) : submitting ? (
                  'Sending request...'
                ) : property.allowDirectBooking ? (
                  <>
                    <CreditCard size={20} />
                    Save request and pay with PayPal
                  </>
                ) : (
                  'Send request to host'
                )}
              </button>
            </form>
          </div>

          {/* Price Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 sticky top-8">
              <h3 className="text-xl font-bold text-white mb-6">Reservation Quote</h3>

              {bookingQuote && property ? (
                <ReservationQuote
                  propertyName={property.name}
                  checkInYmd={formData.checkIn}
                  checkOutYmd={formData.checkOut}
                  quote={bookingQuote}
                  host={
                    property.hostName
                      ? {
                          id: property.host_id,
                          name: property.hostName,
                          imageUrl: property.hostImage,
                          badge: hostDisplayBadge,
                          joinedYear: property.hostJoinedYear,
                        }
                      : null
                  }
                  selectedUnits={
                    selectedUnits.length > 0
                      ? selectedUnits.map((u) => ({
                          id: u.id,
                          name: u.name,
                          price: Number(u.price) || 0,
                        }))
                      : undefined
                  }
                  showCardFee={property.allowDirectBooking === true}
                />
              ) : (
                <p className="text-gray-400 text-sm">Select dates to see pricing</p>
              )}

              <div className="mt-6 pt-6 border-t border-gray-800">
                <p className="text-xs text-gray-400 text-center">
                  You submit your request first, then pay the total with PayPal on this page. The
                  host still approves the stay; if they decline, arrange refunds outside the app or
                  contact support.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




