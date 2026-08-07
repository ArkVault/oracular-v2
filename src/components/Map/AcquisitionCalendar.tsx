import * as React from 'react';
import type { DayPickerProps } from 'react-day-picker';

const DayPicker = React.lazy(async () => {
  const module = await import('react-day-picker');
  return { default: module.DayPicker };
});

type AcquisitionCalendarProps = Omit<
  Extract<DayPickerProps, { mode?: 'single' }>,
  'mode'
>;

export function AcquisitionCalendar(props: AcquisitionCalendarProps) {
  return (
    <React.Suspense
      fallback={
        <div className="orber-calendar-status" role="status">
          Loading calendar…
        </div>
      }
    >
      <DayPicker
        {...props}
        mode="single"
        numberOfMonths={1}
        className="bg-transparent text-white"
        showOutsideDays
        fixedWeeks
      />
    </React.Suspense>
  );
}
