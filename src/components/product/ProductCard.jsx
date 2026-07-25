import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import {
  getProductImage, handleImageError, cloudinaryImage, cloudinarySrcSet,
} from '../../utils/imageHelpers';
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

  const hasDiscount = (product.compareAtPrice && product.compareAtPrice > product.price) ||
                      (product.originalPrice && product.originalPrice > product.price);
  const oldPrice = product.compareAtPrice || product.originalPrice;
  const discountPct = product.discountPercentage ||
    (hasDiscount ? Math.round(((oldPrice - product.price) / oldPrice) * 100) : 0);

  return (
    <article className="product-card">
      <div className="product-media">
        {/* The link covers the image; the controls sit above it as siblings so
            we never nest interactive elements inside an anchor. */}
        <Link to={href} className="product-media-link" tabIndex={-1} aria-hidden="true">
          <img
            src={cloudinaryImage(image, 600)}
            srcSet={cloudinarySrcSet(image)}
            /* Two columns on a phone, up to four on a wide grid — this tells
               the browser the real rendered width so it picks the smallest
               adequate source instead of the largest. */
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 300px"
            alt=""
            loading="lazy"
            decoding="async"
            onError={handleImageError}
          />
        </Link>

        {product.isNewArrival && <span className="product-badge">{t('badge_new')}</span>}
        {hasDiscount && <span className="product-badge product-badge-sale">-{discountPct}%</span>}
      </div>

      <Link to={href} className="product-body">
        <h3 className="product-name">{name}</h3>
        <p className="product-price">
          <span className="price-current">{format(product.price)}</span>
          {hasDiscount && <del className="price-old">{format(oldPrice)}</del>}
        </p>
      </Link>
    </article>
  );
});

export default ProductCard;
