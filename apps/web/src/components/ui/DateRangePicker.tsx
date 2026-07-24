'use client';

import { useMemo } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { LogIn, LogOut } from 'lucide-react';
import { parseCalendarDate } from '@/lib/dateUtils';

type DateRangePickerProps = {
  checkIn?: string;
  checkOut?: string;
  onChange: (checkIn: string, checkOut: string) => void;
  min?: string;
  className?: string;
};

/** Local calendar date at noon — avoids Safari/ISO parsing quirks and DST edge cases. */
function ymdToPickerDate(ymd: string): Date | null {
  const d = parseCalendarDate(ymd);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

function dateToYmd(date: Date | null): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatShort(ymd: string): string {
  const d = parseCalendarDate(ymd);
  if (!d) return 'Select date';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Single-panel check-in / check-out range picker.
 * Highlights the stay window; shows an in-arrow on check-in and out-arrow on check-out.
 */
export function DateRangePicker({
  checkIn = '',
  checkOut = '',
  onChange,
  min,
  className = '',
}: DateRangePickerProps) {
  const startDate = useMemo(() => (checkIn ? ymdToPickerDate(checkIn) : null), [checkIn]);
  const endDate = useMemo(() => (checkOut ? ymdToPickerDate(checkOut) : null), [checkOut]);
  const minDate = useMemo(() => (min ? ymdToPickerDate(min) ?? undefined : undefined), [min]);

  const handleChange = (dates: [Date | null, Date | null] | Date | null) => {
    if (!Array.isArray(dates)) return;
    const [start, end] = dates;
    onChange(dateToYmd(start), dateToYmd(end));
  };

  return (
    <div className={`vibesbnb-daterange-picker ${className}`}>
      <style jsx global>{`
        .vibesbnb-daterange-picker .react-datepicker {
          background-color: transparent !important;
          border: none !important;
          border-radius: 0 !important;
          font-family: inherit !important;
          color: white !important;
          padding: 0 !important;
          box-shadow: none !important;
          width: 100% !important;
        }
        .vibesbnb-daterange-picker .react-datepicker__month-container {
          width: 100% !important;
        }
        .vibesbnb-daterange-picker .react-datepicker__header {
          background-color: transparent !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
          padding-top: 0.25rem !important;
        }
        .vibesbnb-daterange-picker .react-datepicker__current-month {
          color: white !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          font-size: 0.875rem !important;
          margin-bottom: 0.75rem !important;
        }
        .vibesbnb-daterange-picker .react-datepicker__day-names,
        .vibesbnb-daterange-picker .react-datepicker__week {
          display: flex !important;
          justify-content: space-between !important;
        }
        .vibesbnb-daterange-picker .react-datepicker__day-name,
        .vibesbnb-daterange-picker .react-datepicker__day {
          width: 2.5rem !important;
          height: 2.5rem !important;
          line-height: 2.5rem !important;
          margin: 0.15rem 0 !important;
        }
        .vibesbnb-daterange-picker .react-datepicker__day-name {
          color: #9ca3af !important;
          font-weight: 700 !important;
        }
        .vibesbnb-daterange-picker .react-datepicker__day {
          color: white !important;
          border-radius: 0.65rem !important;
          transition: background-color 0.15s, color 0.15s !important;
          position: relative !important;
        }
        .vibesbnb-daterange-picker .react-datepicker__day:hover {
          background-color: rgba(0, 230, 118, 0.12) !important;
          color: #00e676 !important;
        }
        .vibesbnb-daterange-picker .react-datepicker__day--in-range,
        .vibesbnb-daterange-picker .react-datepicker__day--in-selecting-range {
          background-color: rgba(0, 230, 118, 0.18) !important;
          color: #fff !important;
          border-radius: 0 !important;
        }
        .vibesbnb-daterange-picker .react-datepicker__day--range-start,
        .vibesbnb-daterange-picker .react-datepicker__day--selecting-range-start,
        .vibesbnb-daterange-picker .react-datepicker__day--range-end,
        .vibesbnb-daterange-picker .react-datepicker__day--selecting-range-end,
        .vibesbnb-daterange-picker .react-datepicker__day--selected {
          background-color: #00e676 !important;
          color: #000 !important;
          font-weight: 800 !important;
        }
        .vibesbnb-daterange-picker .react-datepicker__day--range-start,
        .vibesbnb-daterange-picker .react-datepicker__day--selecting-range-start {
          border-radius: 0.65rem 0 0 0.65rem !important;
        }
        .vibesbnb-daterange-picker .react-datepicker__day--range-end,
        .vibesbnb-daterange-picker .react-datepicker__day--selecting-range-end {
          border-radius: 0 0.65rem 0.65rem 0 !important;
        }
        .vibesbnb-daterange-picker
          .react-datepicker__day--range-start.react-datepicker__day--range-end {
          border-radius: 0.65rem !important;
        }
        .vibesbnb-daterange-picker .react-datepicker__day--keyboard-selected:not(
            .react-datepicker__day--selected
          ):not(.react-datepicker__day--range-start):not(.react-datepicker__day--range-end):not(
            .react-datepicker__day--in-range
          ) {
          background-color: rgba(255, 255, 255, 0.08) !important;
          color: white !important;
          font-weight: 600 !important;
        }
        .vibesbnb-daterange-picker .react-datepicker__day--disabled {
          color: #4b5563 !important;
          opacity: 0.45 !important;
        }
        .vibesbnb-daterange-picker .react-datepicker__day--outside-month {
          color: #6b7280 !important;
          opacity: 0.55 !important;
        }
        .vibesbnb-daterange-picker .react-datepicker__navigation--next {
          border-left-color: #00e676 !important;
        }
        .vibesbnb-daterange-picker .react-datepicker__navigation--previous {
          border-right-color: #00e676 !important;
        }
        .vibesbnb-daterange-picker .day-with-arrow {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          line-height: 1.1;
          gap: 1px;
        }
        .vibesbnb-daterange-picker .day-with-arrow svg {
          width: 10px;
          height: 10px;
          flex-shrink: 0;
        }
      `}</style>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div
          className={`rounded-xl border px-3 py-2.5 ${
            !(checkIn && !checkOut)
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-white/10 bg-white/5'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-0.5">Check in</p>
          <p className="text-sm text-white font-medium flex items-center gap-1.5">
            <LogIn size={14} className="text-primary-500 shrink-0" />
            {checkIn ? formatShort(checkIn) : 'Select date'}
          </p>
        </div>
        <div
          className={`rounded-xl border px-3 py-2.5 ${
            checkIn && !checkOut
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-white/10 bg-white/5'
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-0.5">Check out</p>
          <p className="text-sm text-white font-medium flex items-center gap-1.5">
            <LogOut size={14} className="text-primary-500 shrink-0" />
            {checkOut ? formatShort(checkOut) : 'Select date'}
          </p>
        </div>
      </div>

      <ReactDatePicker
        inline
        selectsRange
        startDate={startDate}
        endDate={endDate}
        onChange={handleChange}
        minDate={minDate}
        monthsShown={1}
        calendarStartDay={0}
        renderDayContents={(day, date) => {
          if (!date) return day;
          const isCheckIn = Boolean(startDate && sameCalendarDay(date, startDate));
          const isCheckOut = Boolean(endDate && sameCalendarDay(date, endDate));
          if (!isCheckIn && !isCheckOut) return day;
          return (
            <span className="day-with-arrow" title={isCheckIn ? 'Check in' : 'Check out'}>
              {isCheckIn ? <LogIn strokeWidth={2.5} /> : <LogOut strokeWidth={2.5} />}
              <span>{day}</span>
            </span>
          );
        }}
      />
    </div>
  );
}
