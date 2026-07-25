import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations } from '../data/translations';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() =>
    localStorage.getItem('site_lang') || 'en'
  );

  const isRTL = lang === 'ar';

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    localStorage.setItem('site_lang', newLang);

    // Update DOM direction
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    if (newLang === 'ar') {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }

    // Update user object in localStorage (backward compat)
    try {
      const userStr = localStorage.getItem('arteva_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.language = newLang;
        localStorage.setItem('arteva_user', JSON.stringify(user));
      }
    } catch {}
  }, []);

  const t = useCallback((key) => {
    return translations[lang]?.[key] || translations.en?.[key] || key;
  }, [lang]);

  // Keep the document in sync if `lang` ever changes outside setLang.
  // The *initial* direction is applied synchronously in main.jsx, before React
  // mounts — doing it here alone caused Arabic to paint LTR for one frame and
  // then visibly flip.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', isRTL);
  }, [lang, isRTL]);

  return (
    <I18nContext.Provider value={{ lang, isRTL, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
