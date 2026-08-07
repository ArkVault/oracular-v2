import { ChevronLeft, ChevronRight } from 'lucide-react';

import { INDICATORS, type IndicatorDefinition } from './indicator-definitions';

interface IndicatorPanelProps {
  isVisible: boolean;
  onSelect: (indicator: IndicatorDefinition) => void;
  onToggle: () => void;
  selectedIndicator: IndicatorDefinition;
}

export function IndicatorPanel({
  isVisible,
  onSelect,
  onToggle,
  selectedIndicator,
}: IndicatorPanelProps) {
  return (
    <>
      <div
        className={`oracular-panel oracular-indicator-panel ${
          isVisible ? 'is-visible' : 'is-hidden'
        }`}
      >
        <div className="oracular-panel__heading">
          <h2>Indicators</h2>
        </div>
        <div className="oracular-indicator-list">
          {INDICATORS.map((indicator) => {
            const Icon = indicator.icon;
            return (
              <button
                key={indicator.name}
                className={`oracular-indicator-button ${
                  selectedIndicator.name === indicator.name ? 'is-selected' : ''
                }`}
                onClick={() => onSelect(indicator)}
              >
                <span className="oracular-indicator-button__icon"><Icon /></span>
                <span>{indicator.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <button
        className="oracular-panel-toggle"
        onClick={onToggle}
        aria-label={isVisible ? 'Hide indicators' : 'Show indicators'}
      >
        {isVisible ? <ChevronLeft /> : <ChevronRight />}
      </button>
    </>
  );
}
