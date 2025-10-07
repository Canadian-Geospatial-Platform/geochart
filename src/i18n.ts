import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEn from '../public/locales/en/geochart.json';
import translationFr from '../public/locales/fr/geochart.json';

const localI18n = i18n.createInstance(); // IMPORTANT: create a new instance

localI18n
  .use(initReactI18next)
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
        geochart: translationEn,
      },
      fr: {
        geochart: translationFr,
      },
    },
    defaultNS: 'geochart',
  })
  .catch((error: unknown) => {
    // Log the error
    // eslint-disable-next-line no-console
    console.error(error);
  });

export default localI18n;
