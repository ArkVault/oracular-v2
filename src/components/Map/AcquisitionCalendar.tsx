import * as React from 'react';
import type { PropsBase, PropsSingle } from 'react-day-picker';
import { enUS, es } from 'date-fns/locale';
import { useI18n } from '@/i18n/i18n';

const DayPicker = React.lazy(async () => {
  const module = await import('react-day-picker');
  return { default: module.DayPicker };
});

type AcquisitionCalendarProps = Omit<
  PropsBase & PropsSingle,
  'mode'
>;

export function AcquisitionCalendar(props: AcquisitionCalendarProps) {
  const { language, t } = useI18n();
  return (
    <React.Suspense
      fallback={
        <div className="oracular-calendar-status" role="status">
          {t('calendar.loadingShort')}
        </div>
      }
    >
      <DayPicker
        {...props}
        locale={language === 'es' ? es : enUS}
        mode="single"
        numberOfMonths={1}
        className="bg-transparent text-white"
        showOutsideDays={false}
        fixedWeeks
      />
    </React.Suspense>
  );
}
