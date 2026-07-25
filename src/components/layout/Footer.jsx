import { Link } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';
import { ArrowRightIcon } from '../ui/Icons';
import './Footer.css';

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <span className="footer-logo">ARTÉVA</span>
            <span className="footer-logo-sub">Maison</span>
            <p>{t('footer_desc')}</p>
          </div>

          {/* Quick links */}
          <nav className="footer-col" aria-label={t('quick_links')}>
            <h4>{t('quick_links')}</h4>
            <Link to="/">{t('home')}</Link>
            <Link to="/collections">{t('collections')}</Link>
            <Link to="/products">{t('view_all_products')}</Link>
            <Link to="/wishlist">{t('wishlist')}</Link>
            <Link to="/contact">{t('contact')}</Link>
            <Link to="/account">{t('account')}</Link>
          </nav>

          {/* Contact */}
          <div className="footer-col">
            <h4>{t('contact_info')}</h4>
            <p>Kuwait City, Kuwait</p>
            <a href="mailto:info@artevamaisonkw.com">info@artevamaisonkw.com</a>
            <a href="tel:+965">+965 XXXX XXXX</a>
          </div>

          {/* Newsletter */}
          <div className="footer-col footer-newsletter">
            <h4>{t('newsletter_title')}</h4>
            <p>{t('newsletter_subtitle')}</p>
            <form className="newsletter-form" onSubmit={e => e.preventDefault()}>
              <input
                type="email"
                placeholder={t('newsletter_placeholder')}
                aria-label={t('newsletter_placeholder')}
              />
              <button type="submit" aria-label={t('subscribe')}>
                <ArrowRightIcon size={17} />
              </button>
            </form>
          </div>
        </div>

        <div className="footer-bottom">
          <p>{t('footer_copyright')}</p>
          <p>{t('footer_payments')}</p>
        </div>
      </div>
    </footer>
  );
}
