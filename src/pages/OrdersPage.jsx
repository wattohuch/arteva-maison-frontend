import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { OrdersAPI } from '../api/orders';
import { formatDate, getStatusColor } from '../utils/formatters';
import { buildRefundMessage, canRequestRefund, refundDaysLeft } from '../utils/refundRequest';
import { cloudinaryImage } from '../utils/imageHelpers';
import Loader from '../components/ui/Loader';
import './OrdersPage.css';

export default function OrdersPage() {
  const { isLoggedIn, user } = useAuth();
  const { t, lang } = useI18n();
  const { format } = useCurrency();
  const { whatsappUrl } = useSiteSettings();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn) { navigate('/account'); return; }
    OrdersAPI.getMyOrders(1, 50).then(res => {
      setOrders(res.data?.orders || res.data || []);
      setLoading(false);
    }).catch(err => {
      setError(err.message || t('failed_load_orders'));
      setLoading(false);
    });
  }, [isLoggedIn, navigate, t]);

  if (loading) return <div className="section" style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><Loader text={t('loading_orders')} /></div>;

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: '900px' }}>
        <h1 style={{ marginBottom: 'var(--space-8)' }}>{t('order_history')}</h1>

        {error && <p style={{ color: '#CD5C5C', marginBottom: 'var(--space-4)' }}>{error}</p>}

        {orders.length === 0 ? (
          <div className="glass-card-component" style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>{t('no_orders')}</p>
            <Link to="/products" className="btn btn-primary">{t('start_shopping')}</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => {
              // `orderStatus` is the field the model actually maintains;
              // `status` is only present on some legacy records.
              const status = (order.orderStatus || order.status || 'pending').toLowerCase().replace(/\s+/g, '_');
              const statusText = t(`status_${status}`) || status.replace(/_/g, ' ');
              const statusColor = getStatusColor(status);

              return (
                <div key={order._id || order.orderNumber} className="glass-card-component order-card">
                  <div className="order-card-header">
                    <div>
                      <span className="order-number">{t('order_number')}{order.orderNumber}</span>
                      <span className="order-date">{formatDate(order.createdAt)}</span>
                    </div>
                    <span className="order-status-badge" style={{ background: `${statusColor}18`, color: statusColor, borderColor: `${statusColor}30` }}>
                      {statusText}
                    </span>
                  </div>

                  {/* Items preview */}
                  <div className="order-items-preview">
                    {(order.items || []).slice(0, 3).map((item, i) => {
                      const name = lang === 'ar' && item.product?.nameAr ? item.product.nameAr : (item.product?.name || item.name || 'Item');
                      return (
                        <div key={i} className="order-item-mini">
                          <img
                            src={cloudinaryImage(
                              item.product?.images?.[0]?.url || item.image || '/assets/images/products/placeholder.png',
                              120
                            )}
                            alt={name}
                            loading="lazy"
                            decoding="async"
                          />
                          <div>
                            <span className="order-item-name">{name}</span>
                            <span className="order-item-qty">×{item.quantity}</span>
                          </div>
                        </div>
                      );
                    })}
                    {(order.items || []).length > 3 && (
                      <span className="order-items-more">+{order.items.length - 3} more</span>
                    )}
                  </div>

                  <div className="order-card-footer">
                    <span className="order-total">{t('total')}: {format(order.totalAmount || order.total || 0)}</span>
                    <div className="order-actions">
                      {/* Refunds are handled by a person, not an endpoint: this
                          opens WhatsApp with the order details already written
                          out, so the customer does not have to retype them and
                          the shop gets a request it can act on directly. */}
                      {canRequestRefund(order) && (
                        <a
                          className="btn btn-ghost btn-sm order-refund-btn"
                          href={whatsappUrl(buildRefundMessage(order, { customerName: user?.name, lang }))}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t('refund_days_left').replace('{days}', refundDaysLeft(order))}
                        >
                          {t('request_refund')}
                          <small>{t('refund_days_left').replace('{days}', refundDaysLeft(order))}</small>
                        </a>
                      )}
                      <Link to={`/order/${order._id}/tracking`} className="btn btn-secondary btn-sm">
                        {t('view_details')}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
