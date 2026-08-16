import * as React from 'react';
import { Activity, Bell, Calendar, ListChecks, Search, X } from 'lucide-react';

import { Button } from '@/components/UI/button';
import { Card } from '@/components/UI/card';
import { localDateToAcquisitionDate } from '@/features/acquisitions/domain/acquisition-date';
import type { PlaceSearchResult } from '@/features/place-search/domain/place';
import { useI18n } from '@/i18n/i18n';

import { AcquisitionCalendar } from './AcquisitionCalendar';
import { headerOverlayReducer } from './header-overlay-state';

interface AcquisitionDateMenuProps {
  availableCalendarDates: Date[];
  availableDateSet: Set<string>;
  availableDates: string[];
  calendarMonth: Date;
  error?: string;
  isLoading: boolean;
  onLoad: () => Promise<void>;
  onMonthChange: (month: Date) => void;
  onSelectDate: (date?: string) => void;
  selectedCalendarDate?: Date;
}

interface PlaceSearchMenuProps {
  isSearching: boolean;
  onClear: () => void;
  onSearch: (query: string) => void;
  onSelect: (result: PlaceSearchResult) => void;
  query: string;
  results: PlaceSearchResult[];
}

interface MapHeaderProps {
  acquisitions: AcquisitionDateMenuProps;
  openDatePickerSignal: number;
  openSearchSignal: number;
  placeSearch: PlaceSearchMenuProps;
  workflowGuide: {
    enabled: boolean;
    onToggle: () => void;
  };
}

export function MapHeader({
  acquisitions,
  openDatePickerSignal,
  openSearchSignal,
  placeSearch,
  workflowGuide,
}: MapHeaderProps) {
  const { language, setLanguage, t } = useI18n();
  const [activeOverlay, dispatchOverlay] = React.useReducer(
    headerOverlayReducer,
    null,
  );
  const showDatePicker = activeOverlay === 'dates';
  const showSensorMenu = activeOverlay === 'sensors';
  const showSearch = activeOverlay === 'search';
  const loadAcquisitionDates = acquisitions.onLoad;

  const toggleDatePicker = () => {
    if (!showDatePicker) {
      void acquisitions.onLoad();
    }
    dispatchOverlay({ type: 'toggle', overlay: 'dates' });
  };

  const toggleSensorMenu = () => {
    dispatchOverlay({ type: 'toggle', overlay: 'sensors' });
  };

  const toggleSearch = () => {
    dispatchOverlay({ type: 'toggle', overlay: 'search' });
  };

  React.useEffect(() => {
    if (openDatePickerSignal === 0) return;
    void loadAcquisitionDates();
    dispatchOverlay({ type: 'open', overlay: 'dates' });
  }, [loadAcquisitionDates, openDatePickerSignal]);

  React.useEffect(() => {
    if (openSearchSignal === 0) return;
    dispatchOverlay({ type: 'open', overlay: 'search' });
  }, [openSearchSignal]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.date-picker-container') && !target.closest('.date-button')) {
        dispatchOverlay({ type: 'close', overlay: 'dates' });
      }
      if (!target.closest('.sensor-menu-container') && !target.closest('.sensor-button')) {
        dispatchOverlay({ type: 'close', overlay: 'sensors' });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectPlace = (result: PlaceSearchResult) => {
    placeSearch.onSelect(result);
    dispatchOverlay({ type: 'close', overlay: 'search' });
  };

  return (
    <nav className="oracular-header" aria-label={t('nav.primary')}>
      <div className="oracular-brand">
        <div className="oracular-brand__mark" aria-hidden="true">
          <span />
        </div>
        <h1>Oracular V2</h1>
      </div>

      <div className="oracular-header__nav">
        <Button
          type="button"
          variant="ghost"
          className={`date-button oracular-nav-button ${showDatePicker ? 'is-active' : ''}`}
          onClick={toggleDatePicker}
          aria-expanded={showDatePicker}
        >
          <Calendar /> <span>{t('nav.dates')}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          className={`sensor-button oracular-nav-button ${showSensorMenu ? 'is-active' : ''}`}
          onClick={toggleSensorMenu}
          aria-expanded={showSensorMenu}
        >
          <Activity /> <span>{t('nav.sensors')}</span>
        </Button>

        {showDatePicker && (
          <>
            <div
              className="oracular-calendar-backdrop"
              data-testid="calendar-backdrop"
              aria-hidden="true"
            />
            <Card
              className="date-picker-container oracular-popover oracular-popover--calendar"
              role="dialog"
              aria-label="Available acquisition dates"
            >
            <div className="oracular-popover__eyebrow">{t('calendar.eyebrow')}</div>
            <h2>{t('calendar.title')}</h2>
            <AcquisitionCalendar
              selected={acquisitions.selectedCalendarDate}
              onSelect={(date) => {
                const selectedDate = date ?? acquisitions.selectedCalendarDate;
                acquisitions.onSelectDate(
                  selectedDate ? localDateToAcquisitionDate(selectedDate) : undefined,
                );
                if (selectedDate) {
                  dispatchOverlay({ type: 'close', overlay: 'dates' });
                }
              }}
              month={acquisitions.calendarMonth}
              onMonthChange={acquisitions.onMonthChange}
              disabled={(date) =>
                acquisitions.isLoading ||
                !acquisitions.availableDateSet.has(localDateToAcquisitionDate(date))
              }
              modifiers={{ available: acquisitions.availableCalendarDates }}
              modifiersClassNames={{ available: 'rdp-day_available' }}
            />
            {acquisitions.availableDates.length > 0 && !acquisitions.isLoading && (
              <div className="oracular-calendar-key">
                <span aria-hidden="true" />
                {t('calendar.available')}
              </div>
            )}
            <div className="oracular-calendar-status" aria-live="polite">
              {acquisitions.isLoading
                ? t('calendar.loading')
                : acquisitions.error
                  ? acquisitions.error
                  : acquisitions.availableDates.length === 0
                    ? t('calendar.empty')
                    : t('calendar.count', { count: acquisitions.availableDates.length })}
            </div>
            </Card>
          </>
        )}

        {showSensorMenu && (
          <Card
            className="sensor-menu-container oracular-popover oracular-popover--sensors"
            role="dialog"
            aria-label="Available sensors"
          >
            <div className="oracular-popover__eyebrow">{t('sensors.eyebrow')}</div>
            <h2>{t('sensors.title')}</h2>
            <div className="oracular-sensor-list">
              <button className="is-selected">
                <span className="oracular-sensor-dot" />
                <span><strong>Sentinel-2</strong><small>{t('sensors.active')}</small></span>
              </button>
              <button disabled>
                <span className="oracular-sensor-dot" />
                <span><strong>PlanetScope</strong><small>{t('sensors.soon')}</small></span>
              </button>
            </div>
          </Card>
        )}
      </div>

      <div className="oracular-header__actions">
        <Button
          type="button"
          variant="ghost"
          onClick={workflowGuide.onToggle}
          className={`oracular-guide-toggle ${workflowGuide.enabled ? 'is-active' : ''}`}
          aria-label={workflowGuide.enabled ? t('nav.guideOff') : t('nav.guideOn')}
          aria-pressed={workflowGuide.enabled}
        >
          <ListChecks />
          <span>{t('nav.guide')}</span>
          <i aria-hidden="true" />
        </Button>
        <div className="oracular-search-wrap">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleSearch}
            className={`oracular-icon-button ${showSearch ? 'is-active' : ''}`}
            aria-label={t('nav.search')}
            aria-expanded={showSearch}
          >
            <Search />
          </Button>

          {showSearch && (
            <Card className="oracular-popover oracular-search-popover">
              <div className="oracular-search-field">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  maxLength={200}
                  value={placeSearch.query}
                  onChange={(event) => placeSearch.onSearch(event.target.value)}
                  placeholder={t('search.placeholder')}
                  className="oracular-search-input"
                />
                {placeSearch.query && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={placeSearch.onClear}
                    className="oracular-search-clear"
                    aria-label={t('search.clear')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {placeSearch.isSearching && (
                <div className="text-center text-gray-400 py-2">{t('search.loading')}</div>
              )}

              {!placeSearch.isSearching && placeSearch.results.length > 0 && (
                <div className="space-y-2">
                  {placeSearch.results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => selectPlace(result)}
                      className="w-full text-left px-3 py-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-sm truncate"
                    >
                      {result.name}
                    </button>
                  ))}
                </div>
              )}

              {!placeSearch.isSearching &&
                placeSearch.query.length >= 3 &&
                placeSearch.results.length === 0 && (
                  <div className="text-center text-gray-400 py-2">{t('search.empty')}</div>
                )}
            </Card>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="oracular-icon-button"
          aria-label={t('nav.notifications')}
        >
          <Bell />
        </Button>
        <div className="oracular-language-switch" role="group" aria-label={t('language.label')}>
          <button className={language === 'es' ? 'is-active' : ''} onClick={() => setLanguage('es')} type="button">ES</button>
          <button className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')} type="button">EN</button>
        </div>
      </div>
    </nav>
  );
}
