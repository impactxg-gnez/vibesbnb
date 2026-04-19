'use client';

import { forwardRef, useMemo } from 'react';
import ReactDatePicker, { ReactDatePickerProps } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { parseCalendarDate } from '@/lib/dateUtils';

interface DatePickerProps extends Omit<ReactDatePickerProps, 'onChange'> {
  value?: string;
  onChange: (dateStr: string) => void;
  className?: string;
  min?: string;
}

/** Local calendar date at noon — avoids Safari/ISO parsing quirks and DST edge cases. */
function ymdToPickerDate(ymd: string): Date | null {
  const d = parseCalendarDate(ymd);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

export const DatePicker = forwardRef<any, DatePickerProps>(
  ({ value, onChange, className, min, ...props }, ref) => {
    const selectedDate = useMemo(() => (value ? ymdToPickerDate(value) : null), [value]);
    const minDate = useMemo(() => (min ? ymdToPickerDate(min) ?? undefined : undefined), [min]);

    const handleChange = (date: Date | null) => {
      let dateStr = '';
      if (date) {
        // Construct string manually to avoid timezone shift from stringification
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      }
      onChange(dateStr);
    };

    return (
      <div className="vibesbnb-datepicker-wrapper">
        <style jsx global>{`
          .react-datepicker {
            background-color: #030712 !important; /* gray-950 */
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 1.5rem !important;
            font-family: inherit !important;
            color: white !important;
            padding: 1rem !important;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
          }
          .react-datepicker__header {
            background-color: transparent !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
            padding-top: 0.5rem !important;
          }
          .react-datepicker__current-month, .react-datepicker-time__header, .react-datepicker-year-header {
            color: white !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            font-size: 0.875rem !important;
            margin-bottom: 1rem !important;
          }
          .react-datepicker__day-name {
            color: #9ca3af !important; /* gray-400 */
            font-weight: 700 !important;
          }
          .react-datepicker__day {
            color: white !important;
            border-radius: 0.75rem !important;
            transition: all 0.2s !important;
          }
          .react-datepicker__day:hover {
            background-color: rgba(0, 230, 118, 0.1) !important;
            color: #00e676 !important; /* primary-500 */
          }
          .react-datepicker__day--selected {
            background-color: #00e676 !important;
            color: #000 !important;
            font-weight: 800 !important;
          }
          /* Safari: keyboard focus can sit on a different month/day than the actual selection */
          .react-datepicker__day--keyboard-selected:not(.react-datepicker__day--selected) {
            background-color: rgba(255, 255, 255, 0.08) !important;
            color: white !important;
            font-weight: 600 !important;
          }
          .react-datepicker__day--disabled {
            color: #4b5563 !important; /* gray-600 */
            opacity: 0.5 !important;
          }
          .react-datepicker__navigation--next {
            border-left-color: #00e676 !important;
          }
          .react-datepicker__navigation--previous {
            border-right-color: #00e676 !important;
          }
        `}</style>
        <ReactDatePicker
          ref={ref}
          selected={selectedDate}
          onChange={handleChange}
          minDate={minDate}
          className={className}
          dateFormat="MMM d, yyyy"
          placeholderText="Select date"
          withPortal
          popperPlacement="bottom-start"
          strictParsing
          {...props}
        />
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
