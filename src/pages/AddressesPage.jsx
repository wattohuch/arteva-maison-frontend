import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { AuthAPI } from '../api/auth';
import { showToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import Loader from '../components/ui/Loader';
import './AddressesPage.css';

export default function AddressesPage() {
  const { isLoggedIn } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: '', street: '', city: '', zipCode: '', phone: '', isDefault: false });

  useEffect(() => {
    if (!isLoggedIn) { navigate('/account'); return; }
    loadAddresses();
  }, [isLoggedIn, navigate]);

  const loadAddresses = async () => {
    try {
      const res = await AuthAPI.getMe();
      if (res.success && res.data?.addresses) setAddresses(res.data.addresses);
    } catch {} finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.street || !form.city || !form.phone) { showToast(t('fill_required_fields'), 'error'); return; }
    setSaving(true);
    try {
      await AuthAPI.addAddress(form);
      showToast(t('save_address'), 'success');
      setShowForm(false);
      setForm({ label: '', street: '', city: '', zipCode: '', phone: '', isDefault: false });
      loadAddresses();
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await AuthAPI.deleteAddress(id);
      showToast('Address deleted', 'success');
      loadAddresses();
    } catch (err) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await AuthAPI.updateProfile({ defaultAddressId: id });
      showToast('Default address updated', 'success');
      loadAddresses();
    } catch (err) {
      showToast(err.message || 'Failed to update', 'error');
    }
  };

  if (loading) return <div className="section" style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}><Loader /></div>;

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: '720px' }}>
        <div className="addresses-header">
          <h1>{t('my_addresses')}</h1>
          <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? t('cancel') : `+ ${t('add_new_address')}`}
          </Button>
        </div>

        {/* Add Address Form */}
        {showForm && (
          <form onSubmit={handleSave} className="glass-card-component address-form animate-fade-in-up">
            <h3 style={{ marginBottom: 'var(--space-4)' }}>{t('add_new_address')}</h3>
            <div className="address-form-grid">
              <Input label={t('address_label')} name="label"
                placeholder={t('address_label_placeholder')}
                value={form.label} onChange={handleChange} />
              <Input label={t('street_address')} name="street" required
                value={form.street} onChange={handleChange} autoComplete="address-line1" />
              <Input label={t('city')} name="city" required
                value={form.city} onChange={handleChange} autoComplete="address-level2" />
              <Input label={t('postal_code')} name="zipCode"
                value={form.zipCode} onChange={handleChange}
                inputMode="numeric" autoComplete="postal-code" />
              <Input label={t('phone_number')} name="phone" type="tel" required
                placeholder={t('phone_placeholder')}
                value={form.phone} onChange={handleChange} autoComplete="tel" />
            </div>
            <label className="field-check address-default-check">
              <input type="checkbox" name="isDefault" checked={form.isDefault} onChange={handleChange} />
              {t('set_default_address')}
            </label>
            <Button type="submit" variant="primary" loading={saving}>{t('save_address')}</Button>
          </form>
        )}

        {/* Address Cards */}
        {addresses.length === 0 ? (
          <div className="glass-card-component" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>No saved addresses yet.</p>
          </div>
        ) : (
          <div className="addresses-grid">
            {addresses.map((addr, i) => (
              <div key={addr._id || i} className="glass-card-component address-card">
                <div className="address-card-header">
                  <span className="address-label">{addr.label || 'Address'}</span>
                  {addr.isDefault && <span className="address-default-badge">{t('default_label')}</span>}
                </div>
                <p>{addr.street}</p>
                <p>{addr.city}{addr.state ? `, ${addr.state}` : ''}</p>
                {addr.zipCode && <p>{addr.zipCode}</p>}
                <p>{addr.phone}</p>
                <div className="address-card-actions">
                  {!addr.isDefault && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleSetDefault(addr._id)}>
                      {t('set_default')}
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" style={{ color: '#CD5C5C' }} onClick={() => handleDelete(addr._id)}>
                    {t('delete_text')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
