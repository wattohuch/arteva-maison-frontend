import { Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCart } from '../contexts/CartContext';
import { usePromo } from '../contexts/PromoContext';
import { handleImageError } from '../utils/imageHelpers';
import { BagIcon, TrashIcon, PlusIcon, MinusIcon } from '../components/ui/Icons';
import PromoCodeField from '../components/promo/PromoCodeField';
import './CartPage.css';

export default function CartPage() {
  const { t } = useI18n();
  const { format } = useCurrency();
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const { discount } = usePromo();

  // Shipping is free at the cart stage; the 2 KWD delivery fee is added at
  // checkout, which is where the address makes it meaningful.
  const total = Math.max(0, subtotal - discount);

  if (items.length === 0) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty-state">
            <span className="empty-state-icon"><BagIcon size={30} /></span>
            <h3>{t('cart_empty_page')}</h3>
            <Link to="/products" className="btn btn-primary">{t('start_shopping')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <div className="section-header-text">
            <span className="eyebrow">{t('your_cart')}</span>
            <h1>{t('shopping_cart')}</h1>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { if (window.confirm(t('confirm_clear_cart'))) clearCart(); }}
          >
            {t('clear_cart')}
          </button>
        </div>

        <div className="cart-layout">
          {/* Line items */}
          <section className="cart-lines">
            {items.map(item => {
              const id = item._id || item.id;
              return (
                <article key={id} className="cart-line">
                  <div className="cart-line-media">
                    <img src={item.image} alt="" loading="lazy" onError={handleImageError} />
                  </div>

                  <div className="cart-line-body">
                    <h3 className="cart-line-name">{item.name}</h3>
                    <p className="cart-line-price">{format(item.price)}</p>

                    <div className="qty-stepper">
                      <button
                        onClick={() => updateQuantity(id, item.quantity - 1)}
                        aria-label={t('decrease_quantity')}
                      >
                        <MinusIcon size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(id, item.quantity + 1)}
                        aria-label={t('increase_quantity')}
                      >
                        <PlusIcon size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="cart-line-end">
                    <span className="cart-line-total">{format(item.price * item.quantity)}</span>
                    <button
                      className="cart-item-remove"
                      onClick={() => removeItem(id)}
                      aria-label={`${t('remove')} — ${item.name}`}
                    >
                      <TrashIcon size={17} />
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          {/* Summary */}
          <aside className="cart-summary">
            <h2 className="cart-summary-title">{t('order_summary')}</h2>

            <PromoCodeField />

            <dl className="summary-rows">
              <div>
                <dt>{t('subtotal')}</dt>
                <dd>{format(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="summary-discount">
                  <dt>{t('discount')}</dt>
                  <dd>−{format(discount)}</dd>
                </div>
              )}
              <div>
                <dt>{t('shipping')}</dt>
                <dd className="summary-free">{t('free')}</dd>
              </div>
            </dl>

            <div className="summary-total">
              <span>{t('total')}</span>
              <strong>{format(total)}</strong>
            </div>

            <Link to="/checkout" className="btn btn-primary btn-full">
              {t('proceed_to_checkout')}
            </Link>
            <p className="summary-note">{t('taxes_shipping_note')}</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
