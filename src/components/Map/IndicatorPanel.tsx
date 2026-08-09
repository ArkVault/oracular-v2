import * as React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

import {
  INDICATORS,
  WATER_QUALITY_INDEX_OPTIONS,
  type IndicatorDefinition,
  localizeIndicator,
} from './indicator-definitions';
import { useI18n } from '@/i18n/i18n';

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
  const { language, t } = useI18n();
  const [isWaterQualityExpanded, setIsWaterQualityExpanded] = React.useState(false);

  return (
    <>
      <div
        className={`oracular-panel oracular-indicator-panel has-glass-edge ${
          isVisible ? 'is-visible' : 'is-hidden'
        }`}
      >
        <div className="oracular-panel__heading">
          <h2>{t('indicator.title')}</h2>
        </div>
        <div className="oracular-indicator-list">
          {INDICATORS.map((indicator) => {
            const Icon = indicator.icon;
            const displayIndicator = localizeIndicator(indicator, language);
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
                    <span>{displayIndicator.name}</span>
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
                        const status = option.indicator ? t('indicator.available') : t('indicator.pending');
                        const displayOption = option.indicator
                          ? localizeIndicator(option.indicator, language)
                          : undefined;
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
                              <strong>{displayOption?.name ?? option.label}</strong>
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
                <span>{displayIndicator.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <button
        className="oracular-panel-toggle"
        onClick={onToggle}
        aria-label={isVisible ? t('indicator.hide') : t('indicator.show')}
      >
        {isVisible ? <ChevronLeft /> : <ChevronRight />}
      </button>
    </>
  );
}
