import * as React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

import {
  INDICATORS,
  WATER_QUALITY_INDEX_OPTIONS,
  type IndicatorDefinition,
} from './indicator-definitions';

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
  const [isWaterQualityExpanded, setIsWaterQualityExpanded] = React.useState(false);

  return (
    <>
      <div
        className={`oracular-panel oracular-indicator-panel has-glass-edge ${
          isVisible ? 'is-visible' : 'is-hidden'
        }`}
      >
        <div className="oracular-panel__heading">
          <h2>Indicators</h2>
        </div>
        <div className="oracular-indicator-list">
          {INDICATORS.map((indicator) => {
            const Icon = indicator.icon;
            const isWaterQuality = indicator.name === 'Water Quality';

            if (isWaterQuality) {
              return (
                <div className="oracular-indicator-group" key={indicator.name}>
                  <button
                    className={`oracular-indicator-button ${
                      selectedIndicator.name === indicator.name ? 'is-selected' : ''
                    }`}
                    aria-expanded={isWaterQualityExpanded}
                    onClick={() => setIsWaterQualityExpanded((expanded) => !expanded)}
                  >
                    <span className="oracular-indicator-button__icon"><Icon /></span>
                    <span>{indicator.name}</span>
                    <ChevronDown
                      className={`oracular-indicator-button__chevron ${
                        isWaterQualityExpanded ? 'is-expanded' : ''
                      }`}
                    />
                  </button>
                  {isWaterQualityExpanded && (
                    <div
                      className="oracular-subindicator-list"
                      role="group"
                      aria-label="MAGO water quality indices"
                    >
                      {WATER_QUALITY_INDEX_OPTIONS.map((option) => {
                        const status = option.indicator ? 'Available' : 'Pending calibration';
                        return (
                          <button
                            key={option.index}
                            className={`oracular-subindicator-button ${
                              option.indicator ? 'is-available' : ''
                            } ${
                              option.indicator && selectedIndicator.name === option.indicator.name
                                ? 'is-selected'
                                : ''
                            }`}
                            aria-label={`Index ${option.index} · ${option.label} · ${option.unit} · ${status}`}
                            disabled={!option.indicator}
                            onClick={() => option.indicator && onSelect(option.indicator)}
                          >
                            <span className="oracular-subindicator-button__index">
                              {option.index}
                            </span>
                            <span className="oracular-subindicator-button__content">
                              <strong>{option.label}</strong>
                              <small>{option.unit} · {status}</small>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

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
