import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider, useI18n } from './i18n';

function Fixture() {
  const { language, setLanguage, t } = useI18n();
  return (
    <>
      <span>{t('nav.dates')}</span>
      <span>{language}</span>
      <button onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}>toggle</button>
    </>
  );
}

describe('I18nProvider', () => {
  const storage = new Map<string, string>();
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => storage.set(key, value),
    });
  });

  it('switches the whole translation context and persists the choice', async () => {
    const user = userEvent.setup();
    render(<I18nProvider><Fixture /></I18nProvider>);

    expect(screen.getByText('Dates')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByText('Fechas')).toBeInTheDocument();
    expect(localStorage.getItem('oracular.language')).toBe('es');
  });

  it('restores a persisted Spanish choice', () => {
    localStorage.setItem('oracular.language', 'es');
    render(<I18nProvider><Fixture /></I18nProvider>);
    expect(screen.getByText('Fechas')).toBeInTheDocument();
  });
});
