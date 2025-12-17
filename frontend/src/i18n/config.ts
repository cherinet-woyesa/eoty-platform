import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Import translation files
import enTranslation from './locales/en/translation.json';
import amTranslation from './locales/am/translation.json';
import tiTranslation from './locales/ti/translation.json';
import omTranslation from './locales/om/translation.json';
import soTranslation from './locales/so/translation.json';

// Supported languages
export const supportedLanguages = {
  en: 'English',
  am: 'አማርኛ',
  ti: 'ትግርኛ',
  om: 'Afaan Oromoo',
  so: 'Soomaali'
};

// Language codes mapping
export const languageCodes = {
  en: 'en-US',
  am: 'am-ET',
  ti: 'ti-ET',
  om: 'om-ET',
  so: 'so-SO'
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Load translation files
    resources: {
      en: {
        translation: enTranslation
      },
      am: {
        translation: amTranslation
      },
      ti: {
        translation: tiTranslation
      },
      om: {
        translation: omTranslation
      },
      so: {
        translation: soTranslation
      }
    },
    // Default language
    fallbackLng: 'en',
    // Ensure i18next resolves language codes like en-US -> en
    supportedLngs: Object.keys(supportedLanguages),
    load: 'languageOnly',
    // Detect language
    detection: {
      // order and from where user language should be detected
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      
      // keys or params to lookup language from
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      lookupLocalStorage: 'i18nextLng',
      lookupFromPathIndex: 0,
      lookupFromSubdomainIndex: 0,
      
      // cache user language on
      caches: ['localStorage', 'cookie'],
      excludeCacheFor: ['cimode'], // languages to not persist (cookie, localStorage)
      
      // optional htmlTag with lang attribute, the default is:
      htmlTag: document.documentElement
    },
    // Debug mode
    debug: import.meta.env.MODE === 'development',
    
    // Translation interpolation options
    interpolation: {
      escapeValue: false // React already safes from XSS
    },
    
    // React options
    react: {
      useSuspense: false
    }
  });

export default i18n;