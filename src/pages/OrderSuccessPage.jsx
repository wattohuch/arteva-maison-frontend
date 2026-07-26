import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { CheckCircleIcon } from '../components/ui/Icons';
import { OrdersAPI } from '../api/orders';
import { trackPurchase } from '../utils/metaPixel';

export default function OrderSuccessPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order') || '';
  const reported = useRef(false);

  /* The Purchase event lives here, not in checkout: checkout hands off to a
     payment gateway and the tab never comes back to it.
     The order is re-read rather than trusted from the URL so the value Meta
     records is the one the server settled, and the guard stops a page refresh
     from reporting the same purchase twice. Server-side Conversions API sends
     the same event with a matching id, and Meta keeps whichever lands first. */
  useEffect(() => {
    if (!orderNumber || reported.current) return;
    reported.current = true;

    OrdersAPI.trackByNumber(orderNumber)
      .then(res => {
        const order = res?.data || res;
        if (order?.orderNumber) trackPurchase(order);
      })
      .catch(() => { /* reporting is never worth breaking the page for */ });
  }, [orderNumber]);

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: '600px', textAlign: 'center' }}>
        <div className="glass-card-component" style={{ padding: 'var(--space-10)' }}>
          <span className="status-icon status-icon-success"><CheckCircleIcon size={36} /></span>
          <h1 style={{ marginBottom: 'var(--space-3)' }}>{t('order_confirmed')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.7 }}>
            {t('order_success_msg')}
          </p>

          {orderNumber && (
            <div style={{ background: 'var(--bg-warm)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>{t('order_number_label')}</span>
              <p style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, color: 'var(--color-gold)', fontFamily: 'var(--font-display)' }}>
                #{orderNumber}
              </p>
            </div>
          )}

          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-6)', padding: 'var(--space-3)', background: 'var(--bg-warm)', borderRadius: 'var(--radius-md)' }}>
            {t('email_confirmation')}
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/track-order" className="btn btn-primary">{t('track_order_btn')}</Link>
            <Link to="/orders" className="btn btn-secondary">{t('view_orders_btn')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
