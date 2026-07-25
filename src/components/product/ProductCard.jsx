import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { getProductImage, handleImageError } from '../../utils/imageHelpers';
import { showToast } from '../ui/Toast';
import { HeartIcon, BagIcon } from '../ui/Icons';
import './ProductCard.css';

const ProductCard = memo(function ProductCard({ product }) {
  const { t, lang } = useI18n();
  const { format } = useCurrency();
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();

  const name = lang === 'ar' && product.nameAr ? product.nameAr : product.name;
  const image = getProductImage(product);
  const slug = product.slug || product._id || product.id;
  const saved = has(product._id || product.id);
  const href = `/product/${slug}`;

  const handleAddToCart = useCallback((e) => {
    e.preventDefault();
    addItem(product, 1);
    showToast(t('added_to_cart'), 'success');
  }, [addItem, product, t]);

  const handleWishlist = useCallback((e) => {
    e.preventDefault();
    const added = toggle(product);
    showToast(added ? t('added_wishlist') : t('removed_wishlist'), 'info');
  }, [toggle, product, t]);

  return (
    <article className="product-card">
      <div className="product-media">
        {/* The link covers the image; the controls sit above it as siblings so
            we never nest interactive elements inside an anchor. */}
        <Link to={href} className="product-media-link" tabIndex={-1} aria-hidden="true">
          <img src={image} alt="" loading="lazy" decoding="async" onError={handleImageError} />
        </Link>

        {product.isNewArrival && <span className="product-badge">{t('badge_new')}</span>}

        <button
          type="button"
          className={`product-wishlist ${saved ? 'is-saved' : ''}`}
          onClick={handleWishlist}
          aria-pressed={saved}
          aria-label={saved ? t('removed_wishlist') : t('added_wishlist')}
        >
          <HeartIcon size={17} filled={saved} />
        </button>

        {/* Quick add — rises on hover, permanently visible on touch layouts */}
        <button type="button" className="product-quick-add" onClick={handleAddToCart}>
          <BagIcon size={16} />
          <span>{t('add_to_cart')}</span>
        </button>
      </div>

      <Link to={href} className="product-body">
        <h3 className="product-name">{name}</h3>
        <p className="product-price">{format(product.price)}</p>
      </Link>
    </article>
  );
});

export default ProductCard;
