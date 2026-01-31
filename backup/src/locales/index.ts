import { I18n } from 'i18n-js';
import de from './de';
import en from './en';
import es from './es';

const i18n = new I18n({
  de,
  en,
  es,
});

// Get stored locale from localStorage (web) or default to 'de'
const getStoredLocale = (): 'de' | 'en' | 'es' => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem('app_locale');
    if (stored === 'de' || stored === 'en' || stored === 'es') {
      return stored;
    }
  }
  return 'de';
};

i18n.defaultLocale = 'de';
i18n.locale = getStoredLocale();
i18n.enableFallback = true;

export default i18n;

export const setLocale = (locale: 'de' | 'en' | 'es') => {
  i18n.locale = locale;
  // Persist to localStorage for web
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('app_locale', locale);
  }
};

export const getLocale = () => i18n.locale;

export const t = (key: string, options?: any) => i18n.t(key, options);
