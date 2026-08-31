import { useState, useEffect, useCallback, useRef } from 'react';
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
import { stockLevel, stockBadge, isOutOfStock } from '../utils/stock';
import { LuxuryLoader } from '../components/ui/loading';
import Button from '../components/ui/Button';
import { HeartIcon, PlusIcon, MinusIcon, TruckIcon, ShieldIcon, HomeIcon } from '../components/ui/Icons';
import './ProductDetailPage.css';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { t, lang } = useI18n();
  const { format } = useCurrency();
  const { addItem, giftWrap, setGiftWrap } = useCart();
  const { has, toggle } = useWishlist();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Opening a second product from a related rail must not carry the previous
  // one's quantity across — it may not even be in stock on the new product.
  useEffect(() => { setQuantity(1); }, [slug]);

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

  /* Product views, counted once per product per browser session.
   *
   * Two things were inflating this. React 18's StrictMode runs every effect
   * twice in development, so every view was counted twice there; and in
   * production the effect re-runs whenever the id changes, so navigating back
   * to a product from a related-items rail counted it again — as did a refresh.
   * The Visitors page was reporting engagement the shop never had.
   *
   * A ref guards the StrictMode double-invoke within a mount, and
   * sessionStorage guards re-mounts, mirroring how site visits are already
   * de-duplicated in utils/siteVisit.js. Unique-per-day counting still happens
   * server-side on the IP; this stops the raw counter being wrong.
   */
  const countedViews = useRef(new Set());

  useEffect(() => {
    const id = product?._id;
    if (!id) return;

    if (countedViews.current.has(id)) return;
    countedViews.current.add(id);

    const key = `arteva_viewed_${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Private mode with storage blocked — count it rather than lose it.
    }

    ProductsAPI.incrementView(id).catch(() => {});
  }, [product?._id]);

  // ViewContent is what Meta builds product-level retargeting audiences from.
  // Keyed on the id so opening a second product from a related-items rail
  // reports again, rather than only on first mount.
  useEffect(() => {
    if (product?._id) trackViewContent(product);
  }, [product?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddToCart = useCallback(() => {
    const available = stockLevel(product);

    // Belt and braces: the stepper below cannot exceed `available`, and the
    // API refuses an oversell regardless. This catches the case where the
    // product was restocked-to-zero while the page sat open.
    if (available === 0) {
      showToast(stockBadge(product, lang)?.text || t('out_of_stock'), 'error');
      return;
    }

    const qty = Math.min(quantity, available);
    addItem(product, qty);

    /* Turned on only when the shopper asked for it here and the order does not
       already have it — the charge is per order, so ticking it on a second
       product must not send a second request saying the same thing. */
    if (wantsWrap && !giftWrap?.enabled) setGiftWrap(true, giftWrap?.message || '');

    showToast(t('added_to_cart'), 'success');
  }, [addItem, product, quantity, t, lang, wantsWrap, giftWrap, setGiftWrap]);

  /* Seeded from the order so a shopper who already asked for wrapping sees it
     ticked here rather than being asked twice. */
  const [wantsWrap, setWantsWrap] = useState(Boolean(giftWrap?.enabled));
  useEffect(() => { setWantsWrap(Boolean(giftWrap?.enabled)); }, [giftWrap?.enabled]);

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
  const available = stockLevel(product);
  const soldOut = isOutOfStock(product);
  const badge = stockBadge(product, lang);
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

          {/* Scarcity, stated once and plainly. `role="status"` so a screen
              reader announces it when the product loads. */}
          {badge && (
            <p className={`pdp-stock is-${badge.tone}`} role="status">
              {badge.text}
            </p>
          )}
          {product.sku && <p className="pdp-sku">SKU: {product.sku}</p>}
          {desc && <p className="pdp-desc">{desc}</p>}

          <div className="pdp-actions">
            <div className="pdp-buy-row">
              {/* The stepper stops at what is actually on the shelf. Two units
                  left means the "+" is dead at 2 — the customer never builds a
                  basket of three and discovers the problem at checkout. */}
              <div className="qty-stepper pdp-qty">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  aria-label={t('decrease_quantity')}
                  disabled={soldOut || quantity <= 1}
                >
                  <MinusIcon size={14} />
                </button>
                <span aria-live="polite">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(available, q + 1))}
                  aria-label={t('increase_quantity')}
                  disabled={soldOut || quantity >= available}
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

            <label className="pdp-giftwrap">
              <input
                type="checkbox"
                checked={wantsWrap}
                disabled={soldOut}
                onChange={e => setWantsWrap(e.target.checked)}
              />
              <span className="pdp-giftwrap-text">
                <span className="pdp-giftwrap-title">
                  {t('gift_wrap_add')}
                  <span className="pdp-giftwrap-price">+{format(giftWrap?.fee || 3)}</span>
                </span>
                <span className="pdp-giftwrap-note">{t('gift_wrap_note')}</span>
              </span>
            </label>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleAddToCart}
              disabled={soldOut}
            >
              {soldOut ? t('out_of_stock') : t('add_to_cart')}
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
