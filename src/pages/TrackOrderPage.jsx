import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { PackageIcon } from '../components/ui/Icons';
import { OrdersAPI } from '../api/orders';
import { formatDate, getStatusColor } from '../utils/formatters';
import Loader from '../components/ui/Loader';
import './TrackOrderPage.css';

/**
 * Track Order.
 *
 * There is nothing to type here. An order number is something the customer has
 * to go and find, and getting it wrong is the only way this page can fail — so
 * the page lists the orders that are actually in transit and lets the customer
 * pick one.
 *
 * Delivered and cancelled orders are deliberately excluded: there is no live
 * journey left to follow, and offering to "track" them only leads to a static
 * screen. Those live in the order history instead.
 */

/** Every order state that still has a delivery in progress. */
const TRACKABLE = new Set([
  'pending', 'confirmed', 'processing', 'packed', 'handed_over', 'out_for_delivery',
]);

const normalise = (order) =>
  String(order?.orderStatus || order?.status || 'pending').toLowerCase().replace(/\s+/g, '_');

export default function TrackOrderPage() {
  const { isLoggedIn } = useAuth();
  const { t, lang } = useI18n();
  const { format } = useCurrency();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }

    let cancelled = false;
    OrdersAPI.getMyOrders(1, 50)
      .then(res => {
        if (cancelled) return;
        const all = res.data?.orders || res.data || [];
        setOrders(all.filter(o => TRACKABLE.has(normalise(o))));
      })
      .catch(err => { if (!cancelled) setError(err.message || t('failed_load_orders')); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [isLoggedIn, t]);

  if (loading) {
    return (
      <div className="section" style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <Loader text={t('track_loading_orders')} />
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container trackpage">
        <header className="trackpage-head">
          <span className="status-icon"><PackageIcon size={30} /></span>
          <h1>{t('track_your_order')}</h1>
          <p>{t('track_pick_order')}</p>
        </header>

        {error && <p className="trackpage-error">{error}</p>}

        {!isLoggedIn ? (
          <div className="glass-card-component trackpage-empty">
            <h3>{t('track_sign_in')}</h3>
            <p>{t('track_sign_in_hint')}</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/account')}>
              {t('login')}
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="glass-card-component trackpage-empty">
            <h3>{t('track_no_active')}</h3>
            <p>{t('track_no_active_hint')}</p>
            <Link to="/orders" className="btn btn-secondary">{t('track_view_history')}</Link>
          </div>
        ) : (
          <ul className="trackpage-list">
            {orders.map(order => {
              const status = normalise(order);
              const colour = getStatusColor(status);
              const items = order.items || [];
              const preview = items.slice(0, 3);

              return (
                <li key={order._id || order.orderNumber}>
                  <Link to={`/order/${order._id}/tracking`} className="glass-card-component trackpage-card">
                    <div className="trackpage-card-head">
                      <div>
                        <span className="trackpage-number">#{order.orderNumber}</span>
                        <span className="trackpage-date">{formatDate(order.createdAt)}</span>
                      </div>
                      <span
                        className="trackpage-status"
                        style={{ background: `${colour}18`, color: colour, borderColor: `${colour}30` }}
                      >
                        {t(`status_${status}`) || status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="trackpage-thumbs">
                      {preview.map((item, i) => (
                        <img
                          key={i}
                          src={item.product?.images?.[0]?.url || item.image || '/assets/images/products/placeholder.png'}
                          alt={lang === 'ar' && item.product?.nameAr ? item.product.nameAr : (item.product?.name || item.name || 'Item')}
                          loading="lazy"
                          decoding="async"
                        />
                      ))}
                      {items.length > preview.length && (
                        <span className="trackpage-thumbs-more">+{items.length - preview.length}</span>
                      )}
                    </div>

                    <div className="trackpage-card-foot">
                      <span className="trackpage-total">
                        {t('total')}: {format(order.totalAmount || order.total || 0)}
                      </span>
                      <span className="trackpage-cta">{t('track_this_order')} →</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
