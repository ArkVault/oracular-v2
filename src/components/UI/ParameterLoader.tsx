import { useI18n } from '@/i18n/i18n';

interface ParameterLoaderProps {
  isVisible: boolean;
}

export function ParameterLoader({ isVisible }: ParameterLoaderProps) {
  const { t } = useI18n();
  if (!isVisible) return null;

  return (
    <div
      className="parameter-loader-overlay"
      role="status"
      aria-label={t('loader.analysis')}
      aria-live="polite"
    >
      <div className="loader" aria-hidden="true">
        <div className="intern" />
        <div className="external-shadow">
          <div className="central" />
        </div>
      </div>
      <span className="sr-only">{t('loader.analysis')}</span>
    </div>
  );
}
