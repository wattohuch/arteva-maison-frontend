import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { AlertCircleIcon } from '../components/ui/Icons';

export default function PaymentErrorPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('paymentId') || '';
  const errorMsg = searchParams.get('error') || t('payment_error_default');

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: '560px', textAlign: 'center' }}>
        <div className="glass-card-component" style={{ padding: 'var(--space-10)' }}>
          <span className="status-icon status-icon-error"><AlertCircleIcon size={36} /></span>
          <h1 style={{ color: '#CD5C5C', marginBottom: 'var(--space-3)' }}>{t('payment_failed_title')}</h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--space-6)' }}>
            {errorMsg}
          </p>

          {paymentId && (
            <div style={{ background: 'var(--bg-warm)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>Payment Ref: {paymentId}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxWidth: '280px', margin: '0 auto' }}>
            <Link to="/checkout" className="btn btn-primary btn-lg">{t('try_again')}</Link>
            <Link to="/cart" className="btn btn-secondary">{t('back_to_cart')}</Link>
            <Link to="/contact" className="btn btn-ghost">{t('contact_support')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
