import * as React from 'react';
import { Activity, Bell, Calendar, Search, UserRound, X } from 'lucide-react';

import { Button } from '@/components/UI/button';
import { Card } from '@/components/UI/card';
import { localDateToAcquisitionDate } from '@/features/acquisitions/domain/acquisition-date';
import type { PlaceSearchResult } from '@/features/place-search/domain/place';

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
  placeSearch: PlaceSearchMenuProps;
}

export function MapHeader({ acquisitions, placeSearch }: MapHeaderProps) {
  const [activeOverlay, dispatchOverlay] = React.useReducer(
    headerOverlayReducer,
    null,
  );
  const showDatePicker = activeOverlay === 'dates';
  const showSensorMenu = activeOverlay === 'sensors';
  const showSearch = activeOverlay === 'search';

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
    <nav className="oracular-header" aria-label="Primary navigation">
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
          <Calendar /> <span>Dates</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          className={`sensor-button oracular-nav-button ${showSensorMenu ? 'is-active' : ''}`}
          onClick={toggleSensorMenu}
          aria-expanded={showSensorMenu}
        >
          <Activity /> <span>Sensors</span>
        </Button>

        {showDatePicker && (
          <Card
            className="date-picker-container oracular-popover oracular-popover--calendar"
            role="dialog"
            aria-label="Available acquisition dates"
          >
            <div className="oracular-popover__eyebrow">Copernicus imagery</div>
            <h2>Select acquisition date</h2>
            <AcquisitionCalendar
              selected={acquisitions.selectedCalendarDate}
              onSelect={(date) => {
                acquisitions.onSelectDate(
                  date ? localDateToAcquisitionDate(date) : undefined,
                );
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
            <div className="oracular-calendar-status" aria-live="polite">
              {acquisitions.isLoading
                ? 'Loading available Copernicus dates…'
                : acquisitions.error
                  ? acquisitions.error
                  : acquisitions.availableDates.length === 0
                    ? 'No cloud-safe acquisitions in the last 12 months.'
                    : `${acquisitions.availableDates.length} cloud-safe acquisitions`}
            </div>
          </Card>
        )}

        {showSensorMenu && (
          <Card
            className="sensor-menu-container oracular-popover oracular-popover--sensors"
            role="dialog"
            aria-label="Available sensors"
          >
            <div className="oracular-popover__eyebrow">Data sources</div>
            <h2>Available sensors</h2>
            <div className="oracular-sensor-list">
              <button className="is-selected">
                <span className="oracular-sensor-dot" />
                <span><strong>Sentinel-2</strong><small>Active · multispectral</small></span>
              </button>
              <button disabled>
                <span className="oracular-sensor-dot" />
                <span><strong>PlanetScope</strong><small>Coming soon</small></span>
              </button>
            </div>
          </Card>
        )}
      </div>

      <div className="oracular-header__actions">
        <div className="oracular-search-wrap">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleSearch}
            className={`oracular-icon-button ${showSearch ? 'is-active' : ''}`}
            aria-label="Search"
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
                  placeholder="Search places..."
                  className="oracular-search-input"
                />
                {placeSearch.query && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={placeSearch.onClear}
                    className="oracular-search-clear"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {placeSearch.isSearching && (
                <div className="text-center text-gray-400 py-2">Searching...</div>
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
                  <div className="text-center text-gray-400 py-2">No results found</div>
                )}
            </Card>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="oracular-icon-button"
          aria-label="Notifications"
        >
          <Bell />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="oracular-user"
          aria-label="Account"
        >
          <UserRound />
        </Button>
      </div>
    </nav>
  );
}
