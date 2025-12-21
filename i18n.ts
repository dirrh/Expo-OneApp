import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import en from "./locales/en.json";
import sk from "./locales/sk.json";
import cz from "./locales/cz.json";

// zoberieme prvý jazyk zo systému (en, sk, cs, ...)
const systemLanguage =
  Localization.getLocales()?.[0]?.languageCode ?? "en";

i18n.use(initReactI18next).init({
  lng: systemLanguage,
  fallbackLng: "en",

  resources: {
    en: { translation: en },
    sk: { translation: sk },
    cz: { translation: cz },
  },

  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
