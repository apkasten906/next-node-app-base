import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import authDe from './public/locales/de/auth.json';
import commonDe from './public/locales/de/common.json';
import dashboardDe from './public/locales/de/dashboard.json';
import homeDe from './public/locales/de/home.json';
import authEn from './public/locales/en/auth.json';
import commonEn from './public/locales/en/common.json';
import dashboardEn from './public/locales/en/dashboard.json';
import homeEn from './public/locales/en/home.json';
import authEs from './public/locales/es/auth.json';
import commonEs from './public/locales/es/common.json';
import dashboardEs from './public/locales/es/dashboard.json';
import homeEs from './public/locales/es/home.json';
import authFr from './public/locales/fr/auth.json';
import commonFr from './public/locales/fr/common.json';
import dashboardFr from './public/locales/fr/dashboard.json';
import homeFr from './public/locales/fr/home.json';

export const defaultLocale = 'en';
export const locales = ['en', 'es', 'fr', 'de'] as const;
export type Locale = (typeof locales)[number];

export const languages = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
} as const;

const resources = {
  en: {
    common: commonEn,
    home: homeEn,
    dashboard: dashboardEn,
    auth: authEn,
  },
  es: {
    common: commonEs,
    home: homeEs,
    dashboard: dashboardEs,
    auth: authEs,
  },
  fr: {
    common: commonFr,
    home: homeFr,
    dashboard: dashboardFr,
    auth: authFr,
  },
  de: {
    common: commonDe,
    home: homeDe,
    dashboard: dashboardDe,
    auth: authDe,
  },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: defaultLocale,
  fallbackLng: defaultLocale,
  defaultNS: 'common',
  ns: ['common', 'home', 'dashboard', 'auth'],
  interpolation: {
    escapeValue: false, // React already escapes
  },
  react: {
    useSuspense: false,
  },
});

void i18n.init();

export default i18n;
