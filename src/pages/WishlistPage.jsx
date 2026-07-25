import { Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useWishlist } from '../contexts/WishlistContext';
import ProductCard from '../components/product/ProductCard';
import { HeartIcon } from '../components/ui/Icons';

export default function WishlistPage() {
  const { t } = useI18n();
  const { items, count, clear } = useWishlist();

  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <div className="section-header-text">
            <span className="eyebrow">{t('saved_for_later')}</span>
            <h1>{t('wishlist')}</h1>
            <p>{count} {t('products_count')}</p>
          </div>
          {count > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={clear}>
              {t('clear_wishlist')}
            </button>
          )}
        </div>

        {count === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon"><HeartIcon size={30} /></span>
            <h3>{t('wishlist_empty')}</h3>
            <p>{t('wishlist_empty_desc')}</p>
            <Link to="/products" className="btn btn-primary">{t('start_shopping')}</Link>
          </div>
        ) : (
          <div className="products-grid">
            {items.map(p => <ProductCard key={p._id || p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
