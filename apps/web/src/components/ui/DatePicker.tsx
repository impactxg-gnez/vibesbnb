'use client';

import { forwardRef } from 'react';
import ReactDatePicker, { ReactDatePickerProps } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DatePickerProps extends Omit<ReactDatePickerProps, 'onChange'> {
  value?: string;
  onChange: (dateStr: string) => void;
  className?: string;
  min?: string;
}

export const DatePicker = forwardRef<any, DatePickerProps>(
  ({ value, onChange, className, min, ...props }, ref) => {
    const selectedDate = value ? new Date(value + 'T12:00:00') : null;
    const minDate = min ? new Date(min + 'T12:00:00') : undefined;

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
      <ReactDatePicker
        ref={ref}
        selected={selectedDate}
        onChange={handleChange}
        minDate={minDate}
        className={className}
        dateFormat="MMM d, yyyy"
        placeholderText="Select date"
        onKeyDown={(e) => {
          e.preventDefault();
        }}
        {...props}
      />
    );
  }
);

DatePicker.displayName = 'DatePicker';
