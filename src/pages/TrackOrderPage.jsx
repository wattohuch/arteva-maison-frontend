import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { PackageIcon } from '../components/ui/Icons';
import { OrdersAPI } from '../api/orders';
import { showToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';

export default function TrackOrderPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) { showToast(t('enter_order_number'), 'error'); return; }
    setLoading(true);
    try {
      const res = await OrdersAPI.trackByNumber(trimmed);
      if (res.data?._id || res.data?.id || res._id || res.id) {
        const orderId = res.data?._id || res.data?.id || res._id || res.id;
        navigate(`/order/${orderId}/tracking`);
      } else throw new Error(t('order_not_found_error'));
    } catch (err) {
      showToast(err.message || t('order_not_found_error'), 'error');
      setLoading(false);
    }
  };

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: '520px', textAlign: 'center' }}>
        <div className="glass-card-component" style={{ padding: 'var(--space-10)' }}>
          <span className="status-icon"><PackageIcon size={30} /></span>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>{t('track_your_order')}</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-8)' }}>{t('enter_order_details')}</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <input
              type="text"
              className="control"
              placeholder={t('order_number_placeholder')}
              value={input}
              onChange={e => setInput(e.target.value)}
              style={{ textAlign: 'center', fontSize: 'var(--fs-lg)' }}
            />
            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
              {t('track_order_btn')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
