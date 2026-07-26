import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { ProductsAPI } from '../api/products';
import {
  getProductImage, handleImageError, cloudinaryImage, cloudinarySrcSet,
} from '../utils/imageHelpers';
import { showToast } from '../components/ui/Toast';
import { trackViewContent } from '../utils/metaPixel';
import { LuxuryLoader } from '../components/ui/loading';
import Button from '../components/ui/Button';
import { HeartIcon, PlusIcon, MinusIcon, TruckIcon, ShieldIcon, HomeIcon } from '../components/ui/Icons';
import './ProductDetailPage.css';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { t, lang } = useI18n();
  const { format } = useCurrency();
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ProductsAPI.getBySlug(slug).then(res => {
      if (!cancelled) { setProduct(res.data || res); setLoading(false); }
    }).catch(() => {
      // Fallback: try by ID
      ProductsAPI.getById(slug).then(res => {
        if (!cancelled) { setProduct(res.data || res); setLoading(false); }
      }).catch(() => { if (!cancelled) setLoading(false); });
    });
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (product?._id) ProductsAPI.incrementView(product._id).catch(() => {});
  }, [product?._id]);

  // ViewContent is what Meta builds product-level retargeting audiences from.
  // Keyed on the id so opening a second product from a related-items rail
  // reports again, rather than only on first mount.
  useEffect(() => {
    if (product?._id) trackViewContent(product);
  }, [product?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddToCart = useCallback(() => {
    addItem(product, quantity);
    showToast(t('added_to_cart'), 'success');
  }, [addItem, product, quantity, t]);

  const handleWishlist = useCallback(() => {
    const added = toggle(product);
    showToast(added ? t('added_wishlist') : t('removed_wishlist'), 'info');
  }, [toggle, product, t]);

  if (loading) {
    return (
      <div className="page-loading">
        <LuxuryLoader size="inline" title={t('loading')} subtitle={t('please_wait')} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty-state"><p>{t('no_products')}</p></div>
        </div>
      </div>
    );
  }

  const name = lang === 'ar' && product.nameAr ? product.nameAr : product.name;
  const desc = lang === 'ar' && product.descriptionAr ? product.descriptionAr : product.description;
  const images = product.images?.length ? product.images : [{ url: getProductImage(product) }];
  const saved = has(product._id || product.id);

  return (
    <div className="section">
      <div className="container pdp-layout">
        {/* Gallery */}
        <div className="pdp-gallery">
          <div className="pdp-main-image">
            {/* The gallery image is this page's LCP element, so it is sized to
                the viewport and fetched at high priority rather than lazily. */}
            <img
              src={cloudinaryImage(images[selectedImage]?.url, 1000)}
              srcSet={cloudinarySrcSet(images[selectedImage]?.url, [480, 720, 1000, 1400])}
              sizes="(max-width: 900px) 100vw, 560px"
              alt={name}
              fetchPriority="high"
              decoding="async"
              onError={handleImageError}
            />
          </div>
          {images.length > 1 && (
            <div className="pdp-thumbnails">
              {images.map((img, i) => (
                <button
                  key={i}
                  className={`pdp-thumb ${i === selectedImage ? 'active' : ''}`}
                  onClick={() => setSelectedImage(i)}
                  aria-label={`${name} — ${i + 1}`}
                  aria-pressed={i === selectedImage}
                >
                  {/* Thumbnails render ~72px — no reason to fetch more. */}
                  <img
                    src={cloudinaryImage(img.url, 160)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={handleImageError}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="pdp-info">
          {product.isNewArrival && <span className="pdp-badge">{t('badge_new')}</span>}

          <h1 className="pdp-name">{name}</h1>
          <p className="pdp-price">{format(product.price)}</p>
          {product.sku && <p className="pdp-sku">SKU: {product.sku}</p>}
          {desc && <p className="pdp-desc">{desc}</p>}

          <div className="pdp-actions">
            <div className="pdp-buy-row">
              <div className="qty-stepper pdp-qty">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  aria-label={t('decrease_quantity')}
                >
                  <MinusIcon size={14} />
                </button>
                <span>{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  aria-label={t('increase_quantity')}
                >
                  <PlusIcon size={14} />
                </button>
              </div>

              <button
                className={`pdp-wishlist ${saved ? 'is-saved' : ''}`}
                onClick={handleWishlist}
                aria-pressed={saved}
                aria-label={saved ? t('removed_wishlist') : t('added_wishlist')}
              >
                <HeartIcon size={18} filled={saved} />
              </button>
            </div>

            <Button variant="primary" size="lg" fullWidth onClick={handleAddToCart}>
              {t('add_to_cart')}
            </Button>
          </div>

          <ul className="pdp-delivery">
            <li><TruckIcon size={18} /><span>{t('delivery_fee')}</span></li>
            <li><HomeIcon size={18} /><span>{t('store_pickup')}</span></li>
            <li><ShieldIcon size={18} /><span>{t('secure_checkout')}</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
