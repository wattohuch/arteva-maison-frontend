import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useI18n } from '../../contexts/I18nContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { handleImageError, cloudinaryImage } from '../../utils/imageHelpers';
import { CloseIcon, TrashIcon, PlusIcon, MinusIcon, BagIcon } from '../ui/Icons';
import { atMax } from '../../utils/stock';
import './CartDrawer.css';

export default function CartDrawer({ open, onClose }) {
  const { items, count, subtotal, updateQuantity, removeItem, refreshStock } = useCart();
  const { t } = useI18n();
  const { format } = useCurrency();
  const panelRef = useRef(null);

  /* Re-read stock each time the basket is opened.
     A basket restored from localStorage carries a stale figure, or none at all,
     and the shelf moves while it sits closed. Anything now over the limit is
     clamped here rather than at checkout. */
  useEffect(() => {
    if (open) refreshStock();
    // `refreshStock` is intentionally out of the dependency list: it is rebuilt
    // whenever `items` changes, and the clamp changes `items`, so including it
    // would loop.
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock the page behind the panel and restore on close
  useEffect(() => {
    document.body.classList.toggle('no-scroll', open);
    return () => document.body.classList.remove('no-scroll');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`cart-scrim ${open ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={panelRef}
        className={`cart-drawer ${open ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('your_cart')}
        aria-hidden={!open}
        tabIndex={-1}
      >
        <header className="cart-head">
          <h2 className="cart-title">
            {t('your_cart')} <span className="cart-count">({count})</span>
          </h2>
          <button className="panel-close" onClick={onClose} aria-label={t('close')}>
            <CloseIcon size={18} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="cart-empty">
            <span className="cart-empty-icon"><BagIcon size={28} /></span>
            <p>{t('cart_empty')}</p>
            <Link to="/collections" onClick={onClose} className="btn btn-primary btn-sm">
              {t('continue_shopping')}
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map(item => {
                const id = item._id || item.id;
                const priceNum = Number(item.price) || 0;
                return (
                  <article key={id} className="cart-item">
                    <div className="cart-item-media">
                      <img
                        src={cloudinaryImage(item.image, 160)}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        onError={handleImageError}
                      />
                    </div>

                    <div className="cart-item-body">
                      <h3 className="cart-item-name">{item.name}</h3>
                      <p className="cart-item-price">{format(priceNum)}</p>

                      {/* The + stops at what is on the shelf. It used to be
                          unbounded, so the basket could be run past the stock
                          level here even though the product page capped it. */}
                      <div className="qty-stepper">
                        <button
                          onClick={() => updateQuantity(id, item.quantity - 1)}
                          aria-label={t('decrease_quantity')}
                          disabled={item.quantity <= 1}
                        >
                          <MinusIcon size={14} />
                        </button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(id, item.quantity + 1)}
                          aria-label={t('increase_quantity')}
                          disabled={atMax(item)}
                        >
                          <PlusIcon size={14} />
                        </button>
                      </div>
                      {atMax(item) && (
                        <p className="cart-item-stock">Only {item.stock} in stock</p>
                      )}
                    </div>

                    <button
                      className="cart-item-remove"
                      onClick={() => removeItem(id)}
                      aria-label={`${t('remove')} — ${item.name}`}
                    >
                      <TrashIcon size={17} />
                    </button>
                  </article>
                );
              })}
            </div>

            <footer className="cart-foot">
              <div className="cart-subtotal">
                <span className="cart-subtotal-label">{t('subtotal')}</span>
                <span className="cart-subtotal-value">{format(subtotal)}</span>
              </div>
              <p className="cart-note">{t('taxes_shipping_note')}</p>
              <div className="cart-actions">
                <Link to="/checkout" onClick={onClose} className="btn btn-primary btn-full">
                  {t('checkout')}
                </Link>
                <Link to="/cart" onClick={onClose} className="btn btn-secondary btn-full">
                  {t('view_cart')}
                </Link>
              </div>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
