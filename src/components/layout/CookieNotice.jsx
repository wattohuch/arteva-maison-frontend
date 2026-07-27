import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';
import './CookieNotice.css';

/* ============================================
   ARTÉVA Maison — Cookie notice

   `cookie_text`, `privacy_policy` and `accept` have been sitting in both
   translation files since the beginning with nothing rendering them. This is
   that component.

   It is a *disclosure*, not a consent gate: the pixel loads either way, which
   is what Meta's Business Tools Terms require a site to tell people about.
   That is the right posture for a Kuwait-only shop. If ARTÉVA ever sells into
   the EU or UK, this has to become real consent — nothing may load before the
   visitor agrees — which means moving initMetaPixel() behind this decision.
   ============================================ */

const STORAGE_KEY = 'arteva_cookie_notice';

export default function CookieNotice() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // A beat after load — arriving at the same moment as the page makes it
        // feel like an error rather than a note.
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch { /* storage blocked — show nothing rather than nag every load */ }
    return undefined;
  }, []);

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, new Date().toISOString()); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-notice" role="region" aria-label={t('privacy_policy')}>
      <p className="cookie-notice-text">
        {t('cookie_text')}{' '}
        <Link to="/privacy">{t('privacy_policy')}</Link>
      </p>
      <button type="button" className="btn btn-primary btn--sm" onClick={accept}>
        {t('accept')}
      </button>
    </div>
  );
}
