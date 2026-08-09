import * as React from 'react';
import { ArrowLeft, CalendarDays, Check, CircleCheck, Search, SlidersHorizontal, X } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/i18n/i18n';

export type WorkflowGuideStep = 'search' | 'dates' | 'indicators' | 'ready';

interface WorkflowGuideProps {
  onBack: () => void;
  onComplete: () => void;
  onDismiss: () => void;
  onOpenDates: () => void;
  onOpenSearch: () => void;
  step: WorkflowGuideStep;
}

const STEPS = {
  search: {
    eyebrow: 'guide.step1', title: 'guide.searchTitle', description: 'guide.searchDescription', action: 'guide.openSearch',
    icon: Search,
  },
  dates: {
    eyebrow: 'guide.step2', title: 'guide.dateTitle', description: 'guide.dateDescription', action: 'guide.openDates',
    icon: CalendarDays,
  },
  indicators: {
    eyebrow: 'guide.step3', title: 'guide.indicatorTitle', description: 'guide.indicatorDescription',
    action: null,
    icon: SlidersHorizontal,
  },
  ready: {
    eyebrow: 'guide.step4', title: 'guide.readyTitle', description: 'guide.readyDescription', action: 'guide.ready',
    icon: CircleCheck,
  },
} as const;

interface SpotlightRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

function elementRect(element: Element, shellRect: DOMRect, padding: number): SpotlightRect {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left - shellRect.left - padding,
    y: rect.top - shellRect.top - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

export function WorkflowGuide({
  onBack,
  onComplete,
  onDismiss,
  onOpenDates,
  onOpenSearch,
  step,
}: WorkflowGuideProps) {
  const { t } = useI18n();
  const guideRef = React.useRef<HTMLElement>(null);
  const [spotlightRect, setSpotlightRect] = React.useState<SpotlightRect>();
  const maskId = `workflow-mask-${React.useId().replace(/:/g, '')}`;
  const content = STEPS[step];
  const Icon = content.icon;
  const stepIndex = step === 'search' ? 0 : step === 'dates' ? 1 : step === 'indicators' ? 2 : 3;

  React.useLayoutEffect(() => {
    const shell = guideRef.current?.closest('.map-shell');
    if (!shell) return;

    const updateSpotlight = () => {
      const shellRect = shell.getBoundingClientRect();
      if (step === 'search') {
        const target = shell.querySelector('.oracular-search-popover')
          ?? shell.querySelector('.oracular-search-wrap');
        if (target) setSpotlightRect(elementRect(target, shellRect, 7));
        return;
      }

      if (step === 'dates') {
        const target = shell.querySelector('.oracular-popover--calendar')
          ?? shell.querySelector('.date-button');
        if (target) setSpotlightRect(elementRect(target, shellRect, 7));
        return;
      }

      if (step === 'indicators') {
        const target = shell.querySelector('.oracular-indicator-panel');
        if (target) setSpotlightRect(elementRect(target, shellRect, 7));
        return;
      }

      const header = shell.querySelector('.oracular-header')?.getBoundingClientRect();
      const leftPanel = shell.querySelector('.oracular-indicator-panel')?.getBoundingClientRect();
      const rightPanel = shell.querySelector('.oracular-detail-panel')?.getBoundingClientRect();
      const guide = guideRef.current?.getBoundingClientRect();
      const gap = 14;
      const left = (leftPanel?.right ?? shellRect.left) + gap;
      const right = (rightPanel?.left ?? shellRect.right) - gap;
      const top = (header?.bottom ?? shellRect.top) + gap;
      const bottom = (guide?.top ?? shellRect.bottom) - gap;
      setSpotlightRect({
        x: left - shellRect.left,
        y: top - shellRect.top,
        width: Math.max(80, right - left),
        height: Math.max(80, bottom - top),
      });
    };

    updateSpotlight();
    const mutationObserver = typeof MutationObserver === 'undefined'
      ? undefined
      : new MutationObserver(updateSpotlight);
    mutationObserver?.observe(shell, { childList: true, subtree: true });
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(updateSpotlight);
    resizeObserver?.observe(shell);
    window.addEventListener('resize', updateSpotlight);
    return () => {
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateSpotlight);
    };
  }, [step]);

  return (
    <>
      <div
        className="oracular-workflow-spotlight"
        data-step={step}
        data-testid="workflow-spotlight"
        aria-hidden="true"
      >
        <svg preserveAspectRatio="none">
          <defs>
            <mask id={maskId}>
              <rect width="100%" height="100%" fill="white" />
              {spotlightRect && (
                <rect
                  x={spotlightRect.x}
                  y={spotlightRect.y}
                  width={spotlightRect.width}
                  height={spotlightRect.height}
                  rx="16"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect width="100%" height="100%" mask={`url(#${maskId})`} />
        </svg>
        {spotlightRect && (
          <div
            className="oracular-workflow-spotlight__frame"
            style={{
              height: spotlightRect.height,
              transform: `translate(${spotlightRect.x}px, ${spotlightRect.y}px)`,
              width: spotlightRect.width,
            }}
          >
            <span>
              {stepIndex + 1} · {step === 'search'
                ? t('guide.search')
                : step === 'dates'
                  ? t('guide.dates')
                  : step === 'indicators'
                    ? t('guide.indicators')
                    : t('guide.readyShort')}
            </span>
          </div>
        )}
      </div>
      <section ref={guideRef} className="oracular-workflow-guide" role="dialog" aria-label={t('guide.label')}>
      <div className="oracular-workflow-guide__icon" aria-hidden="true">
        <Icon />
      </div>
      <div className="oracular-workflow-guide__content">
        <div className="oracular-workflow-guide__meta">
          <span>{t(content.eyebrow as TranslationKey)}</span>
          <div className="oracular-workflow-guide__progress" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <span key={index} className={index <= stepIndex ? 'is-active' : ''} />
            ))}
          </div>
        </div>
        <h2>{t(content.title as TranslationKey)}</h2>
        <p>{t(content.description as TranslationKey)}</p>
      </div>
      <div className="oracular-workflow-guide__actions">
        {step !== 'search' && (
          <button type="button" className="oracular-workflow-guide__back" onClick={onBack} aria-label={t('guide.previous')}>
            <ArrowLeft />
          </button>
        )}
        {content.action && (
          <button
            type="button"
            className="oracular-workflow-guide__primary"
            onClick={step === 'search' ? onOpenSearch : step === 'dates' ? onOpenDates : onComplete}
          >
            {t(content.action as TranslationKey)}
            {step === 'ready' && <Check aria-hidden="true" />}
          </button>
        )}
        <button type="button" className="oracular-workflow-guide__close" onClick={onDismiss} aria-label={t('guide.dismiss')}>
          <X />
        </button>
      </div>
      </section>
    </>
  );
}
