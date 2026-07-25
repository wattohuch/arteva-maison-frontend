import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

export default function PaymentPendingPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('paymentId') || '';

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: '560px', textAlign: 'center' }}>
        <div className="glass-card-component" style={{ padding: 'var(--space-10)' }}>
          <div style={{ fontSize: '64px', marginBottom: 'var(--space-4)' }}>⏳</div>
          <h1 style={{ color: 'var(--color-gold)', marginBottom: 'var(--space-3)' }}>{t('payment_pending_title')}</h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--space-6)' }}>
            {t('payment_pending_desc')}
          </p>

          <div style={{ background: 'var(--bg-warm)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
              {t('payment_pending_note')}
            </p>
            {paymentId && <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>Ref: {paymentId}</p>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxWidth: '280px', margin: '0 auto' }}>
            <Link to="/orders" className="btn btn-primary">{t('view_orders_btn')}</Link>
            <Link to="/" className="btn btn-secondary">{t('back_home')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
