'use client';

import { useRouter } from 'next/navigation';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { languages, locales, type Locale } from '@/i18n';

export function LanguageSwitcher(): JSX.Element {
  const { i18n, t } = useTranslation('common');
  const router = useRouter();

  const handleLanguageChange = (newLocale: Locale): void => {
    // Store locale preference in cookie/localStorage
    // eslint-disable-next-line no-undef -- document is available in client components
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;

    // Change i18n language
    void i18n.changeLanguage(newLocale);

    // Force refresh to update all content
    router.refresh();
  };

  return (
    <div className="relative inline-block">
      <label htmlFor="language-select" className="sr-only">
        {t('language.select')}
      </label>
      <select
        id="language-select"
        value={i18n.language}
        onChange={(e) => handleLanguageChange(e.target.value as Locale)}
        className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        aria-label={t('language.select')}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {/* eslint-disable-next-line security/detect-object-injection */}
            {languages[locale]}
          </option>
        ))}
      </select>
    </div>
  );
}
