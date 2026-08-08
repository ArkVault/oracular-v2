import * as React from 'react';
import type { PropsBase, PropsSingle } from 'react-day-picker';

const DayPicker = React.lazy(async () => {
  const module = await import('react-day-picker');
  return { default: module.DayPicker };
});

type AcquisitionCalendarProps = Omit<
  PropsBase & PropsSingle,
  'mode'
>;

export function AcquisitionCalendar(props: AcquisitionCalendarProps) {
  return (
    <React.Suspense
      fallback={
        <div className="oracular-calendar-status" role="status">
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
