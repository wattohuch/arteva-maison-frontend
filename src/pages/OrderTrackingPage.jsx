import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { OrdersAPI } from '../api/orders';
import { formatDate, getStatusColor, timeAgo } from '../utils/formatters';
import Loader from '../components/ui/Loader';
import './OrderTrackingPage.css';

const STATUS_STEPS = ['placed', 'confirmed', 'processing', 'packed', 'handed_over', 'out_for_delivery', 'delivered'];

export default function OrderTrackingPage() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const { format } = useCurrency();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    OrdersAPI.getById(id).then(res => {
      setOrder(res.data || res);
      setLoading(false);
    }).catch(err => {
      setError(err.message || t('order_not_found_error'));
      setLoading(false);
    });
  }, [id, t]);

  if (loading) return <div className="section" style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><Loader text={t('loading_tracking')} /></div>;
  if (error) return <div className="section container" style={{ textAlign: 'center', padding: '80px 0' }}><p style={{ color: '#CD5C5C' }}>{error}</p></div>;
  if (!order) return null;

  const currentStatus = (order.status || 'pending').toLowerCase().replace(/\s+/g, '_');
  const isCancelled = currentStatus === 'cancelled';
  const currentStepIndex = STATUS_STEPS.indexOf(currentStatus);
  const statusColor = getStatusColor(order.status);

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: '800px' }}>
        <h1 style={{ marginBottom: 'var(--space-2)' }}>{t('order_status_title')}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-8)' }}>
          {t('order_number')}{order.orderNumber}
        </p>

        {/* Status Badge */}
        <div className="glass-card-component" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <div className="tracking-status-header">
            <div>
              <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>{t('current_status_label')}</span>
              <h3 style={{ color: statusColor }}>
                {t(`status_${currentStatus}`) || order.status}
              </h3>
            </div>
            <span className="tracking-live-badge" style={{ background: isCancelled ? '#CD5C5C' : '#2E8B57' }}>
              {isCancelled ? '✕' : '●'} {isCancelled ? t('status_cancelled') : t('live_status')}
            </span>
          </div>

          {/* Progress Steps */}
          {!isCancelled && (
            <div className="tracking-steps">
              {STATUS_STEPS.map((step, i) => {
                const isActive = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                return (
                  <div key={step} className={`tracking-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}>
                    <div className="tracking-step-dot">
                      {isActive ? '✓' : (i + 1)}
                    </div>
                    <span className="tracking-step-label">{t(`status_${step}`) || step}</span>
                    {i < STATUS_STEPS.length - 1 && <div className={`tracking-step-line ${isActive ? 'active' : ''}`} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="glass-card-component" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>{t('items')}</h3>
          {(order.items || []).map((item, i) => {
            const name = lang === 'ar' && item.product?.nameAr ? item.product.nameAr : (item.product?.name || item.name || 'Item');
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-light)' }}>
                <img
                  src={item.product?.images?.[0]?.url || item.image || '/assets/images/products/placeholder.png'}
                  alt={name}
                  style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 'var(--radius-sm)', background: 'var(--bg-sand)' }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, fontSize: 'var(--fs-sm)' }}>{name}</p>
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>×{item.quantity}</p>
                </div>
                <span style={{ fontWeight: 600, color: 'var(--color-gold)', fontSize: 'var(--fs-sm)' }}>
                  {format(item.price * item.quantity)}
                </span>
              </div>
            );
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--space-4)', fontWeight: 700, fontSize: 'var(--fs-lg)' }}>
            <span>{t('total')}</span>
            <span style={{ color: 'var(--color-gold)' }}>{format(order.totalAmount || order.total || 0)}</span>
          </div>
        </div>

        {/* Shipping Info */}
        {order.shippingAddress && (
          <div className="glass-card-component" style={{ padding: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 'var(--space-3)' }}>{t('shipping_address')}</h3>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {order.shippingAddress.street}<br />
              {order.shippingAddress.city}{order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''}<br />
              {order.shippingAddress.country}<br />
              {order.shippingAddress.phone}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
