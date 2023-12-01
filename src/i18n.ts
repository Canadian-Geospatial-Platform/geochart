import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEn from '../locales/en/translation.json';
import translationFr from '../locales/fr/translation.json';

i18n
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    debug: false,
    lng: 'en',
    fallbackLng: ['en', 'fr'],
    supportedLngs: ['en', 'fr'],
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    resources: {
      en: {
        translation: translationEn,
      },
      fr: {
        translation: translationFr,
      },
    },
  });

export default i18n;
