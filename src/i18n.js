import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const detectionOptions = {
  order: ['querystring', 'localStorage'],
  lookupQuerystring: 'lang',
  caches: ['localStorage'],
  excludeCacheFor: ['cimode'],
};

const resources = {
  en: {
    translation: {
      language: {
        en: 'English',
        id: 'Indonesian',
      },
      articleForm: {
        title: 'Title',
        slug: 'Slug',
        description: 'Description',
        body: 'Body',
        tags: 'Tags',
        addTag: 'Add',
        publish: 'Publish',
        fallbackNotice: 'Indonesian empty → will fallback to English.',
      },
    },
  },
  id: {
    translation: {
      language: {
        en: 'Inggris',
        id: 'Indonesia',
      },
      articleForm: {
        title: 'Judul',
        slug: 'Slug',
        description: 'Deskripsi',
        body: 'Konten',
        tags: 'Tag',
        addTag: 'Tambah',
        publish: 'Terbitkan',
        fallbackNotice: 'Kolom Bahasa Indonesia kosong → akan memakai Bahasa Inggris.',
      },
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: import.meta.env?.DEV ?? false,
    detection: detectionOptions,
    interpolation: { escapeValue: false },
    react: { useSuspense: true },
    resources,
  });

export default i18n;
