import { Link } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import './Footer.css';

/**
 * Footer — deliberately minimal, matching the vanilla site.
 *
 * The React version had grown to four columns with a quick-links nav, a
 * contact block carrying a placeholder phone number ("+965 XXXX XXXX") and a
 * newsletter form whose submit handler only called preventDefault — a
 * subscribe box that never subscribed anyone. All of it is removed: this is
 * the brand mark, the two social channels the shop actually uses, and the
 * copyright line.
 */

function InstagramMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="19" height="19" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function WhatsAppMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="19" height="19" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function Footer() {
  const { t } = useI18n();
  const { whatsappUrl, whatsappDisplay, instagramUrl } = useSiteSettings();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">ARTÉVA</span>
          <span className="footer-logo-sub">Maison</span>
        </div>

        <div className="footer-social">
          <a
            href={instagramUrl}
            className="footer-social-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            <InstagramMark />
            <span className="footer-social-label">Instagram</span>
          </a>
          <a
            href={whatsappUrl()}
            className="footer-social-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${whatsappDisplay}`}
          >
            <WhatsAppMark />
            <span className="footer-social-label">{whatsappDisplay}</span>
          </a>
        </div>

        {/* Meta checks for these when reviewing a Shop or a Live login app,
            and the Business Tools Terms require the privacy policy to be
            reachable while the pixel is running. */}
        <nav className="footer-legal" aria-label={t('legal')}>
          <Link to="/privacy">{t('privacy_policy')}</Link>
          <Link to="/returns">{t('returns_refunds')}</Link>
          <Link to="/terms">{t('terms_of_service')}</Link>
          <Link to="/data-deletion">{t('delete_my_data')}</Link>
        </nav>

        <p className="footer-copyright">{t('footer_copyright')}</p>
      </div>
    </footer>
  );
}
