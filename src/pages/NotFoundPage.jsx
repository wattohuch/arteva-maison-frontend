import { Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

export default function NotFoundPage() {
  const { t } = useI18n();

  return (
    <div className="section">
      <div className="container">
        <div className="empty-state">
          <span className="notfound-code">404</span>
          <h3>{t('page_not_found')}</h3>
          <p>{t('page_not_found_desc')}</p>
          <div className="notfound-actions">
            <Link to="/" className="btn btn-primary">{t('back_home')}</Link>
            <Link to="/products" className="btn btn-secondary">{t('view_all_products')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
