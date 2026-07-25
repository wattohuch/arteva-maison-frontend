import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../api/client';

/**
 * Site contact details (WhatsApp number, Instagram handle).
 *
 * Fetched once and shared, because three separate features need the same
 * number: the footer, the floating support button, and the WhatsApp refund
 * request on the orders page. Hardcoding it in each would guarantee they drift
 * apart the first time it changes in the admin panel.
 *
 * The defaults match the current values in the database, so the UI renders
 * correct links immediately and the fetch only ever corrects them.
 */

const DEFAULTS = {
  whatsappNumber: '96550683207',
  whatsappDisplay: '+965 5068 3207',
  instagramHandle: 'arteva.maison',
};

const SiteSettingsContext = createContext(DEFAULTS);

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/admin/site-settings')
      .then(res => {
        if (cancelled || !res?.data) return;
        setSettings(prev => ({ ...prev, ...res.data }));
      })
      // Contact links are decorative-critical, not load-bearing — the defaults
      // stand if the endpoint is unreachable.
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => ({
    ...settings,
    whatsappUrl: (text) =>
      `https://api.whatsapp.com/send?phone=${settings.whatsappNumber}` +
      (text ? `&text=${encodeURIComponent(text)}` : ''),
    instagramUrl: `https://www.instagram.com/${settings.instagramHandle}`,
  }), [settings]);

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
