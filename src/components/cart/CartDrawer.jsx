import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useI18n } from '../../contexts/I18nContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { handleImageError } from '../../utils/imageHelpers';
import { CloseIcon, TrashIcon, PlusIcon, MinusIcon, BagIcon } from '../ui/Icons';
import './CartDrawer.css';

export default function CartDrawer({ open, onClose }) {
  const { items, count, subtotal, updateQuantity, removeItem } = useCart();
  const { t } = useI18n();
  const { format } = useCurrency();
  const panelRef = useRef(null);

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
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        onError={handleImageError}
                      />
                    </div>

                    <div className="cart-item-body">
                      <h3 className="cart-item-name">{item.name}</h3>
                      <p className="cart-item-price">{format(priceNum)}</p>

                      <div className="qty-stepper">
                        <button
                          onClick={() => updateQuantity(id, item.quantity - 1)}
                          aria-label={t('decrease_quantity')}
                        >
                          <MinusIcon size={14} />
                        </button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(id, item.quantity + 1)}
                          aria-label={t('increase_quantity')}
                        >
                          <PlusIcon size={14} />
                        </button>
                      </div>
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
