import { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '../../../api/admin';
import Loader from '../../../components/ui/Loader';

export default function SocialContactsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [waNumber, setWaNumber] = useState('');
  const [waDisplay, setWaDisplay] = useState('');
  const [igHandle, setIgHandle] = useState('');
  const [ownerPhones, setOwnerPhones] = useState(['']);
  const [lastUpdated, setLastUpdated] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    AdminAPI.getSiteSettings()
      .then(res => {
        if (res.success && res.data) {
          setWaNumber(res.data.whatsappNumber || '');
          setWaDisplay(res.data.whatsappDisplay || '');
          setIgHandle(res.data.instagramHandle || '');
          const phones = Array.isArray(res.data.whatsappOwnerPhones)
            ? res.data.whatsappOwnerPhones
            : (res.data.whatsappOwnerPhones || '').split(',').map(p => p.trim()).filter(Boolean);
          setOwnerPhones(phones.length ? phones : ['']);
          if (res.data.updatedAt) {
            setLastUpdated(new Date(res.data.updatedAt).toLocaleString());
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const addPhone = () => setOwnerPhones(prev => [...prev, '']);
  const updatePhone = (index, val) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setOwnerPhones(prev => {
      const next = [...prev];
      next[index] = cleaned;
      return next;
    });
  };
  const removePhone = (index) => {
    setOwnerPhones(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validPhones = ownerPhones.filter(p => p.length >= 8);
    if (validPhones.length === 0) {
      alert('Please add at least one owner phone number (digits only, 8-15 digits)');
      return;
    }
    setSaving(true);
    try {
      const res = await AdminAPI.updateSiteSettings({
        whatsappNumber: waNumber,
        whatsappDisplay: waDisplay,
        instagramHandle: igHandle,
        whatsappOwnerPhones: validPhones,
      });
      if (res.success) {
        alert('Social contacts updated successfully! Changes are live across the website.');
        if (res.data?.updatedAt) {
          setLastUpdated(new Date(res.data.updatedAt).toLocaleString());
        }
      }
    } catch {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-loading"><Loader /></div>;

  const waClean = waNumber.replace(/[^0-9]/g, '');
  const igClean = igHandle.replace('@', '');
  const waLink = `https://api.whatsapp.com/send?phone=${waClean}`;
  const igLink = `https://www.instagram.com/${igClean}`;

  return (
    <div className="admin-view">
      <div className="admin-section-header">
        <h2 className="admin-view-title">Social & Contact Links</h2>
        {lastUpdated && <span className="admin-muted" style={{ fontSize: 12 }}>Last updated: {lastUpdated}</span>}
      </div>

      <form onSubmit={handleSubmit} className="admin-form" style={{ maxWidth: 700 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16, borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
          WhatsApp Store Number
        </h3>
        <div className="admin-form-grid">
          <label className="admin-form-label">
            WhatsApp Raw Number (with country code)
            <input
              className="field-input"
              value={waNumber}
              onChange={e => setWaNumber(e.target.value)}
              placeholder="e.g. 96550683207"
            />
          </label>
          <label className="admin-form-label">
            WhatsApp Display Text
            <input
              className="field-input"
              value={waDisplay}
              onChange={e => setWaDisplay(e.target.value)}
              placeholder="e.g. +965 5068 3207"
            />
          </label>
        </div>

        <h3 style={{ fontSize: 16, margin: '24px 0 16px', borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
          Instagram
        </h3>
        <label className="admin-form-label">
          Instagram Handle
          <input
            className="field-input"
            value={igHandle}
            onChange={e => setIgHandle(e.target.value)}
            placeholder="e.g. artevamaison"
          />
        </label>

        <h3 style={{ fontSize: 16, margin: '24px 0 16px', borderBottom: '1px solid var(--border-light)', paddingBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Owner Phone Numbers (Order Notifications)</span>
          <button type="button" className="btn btn--outline btn--sm" onClick={addPhone}>+ Add Phone</button>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ownerPhones.map((phone, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                className="field-input"
                style={{ flex: 1, fontFamily: 'monospace', letterSpacing: 1 }}
                value={phone}
                onChange={e => updatePhone(idx, e.target.value)}
                placeholder="e.g. 96550683207"
              />
              <button
                type="button"
                className="btn btn--outline btn--sm"
                style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', padding: '6px 12px' }}
                onClick={() => removePhone(idx)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 16, margin: '24px 0 16px', borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
          Live Link Previews
        </h3>
        <div style={{ background: 'var(--color-champagne)', padding: 16, borderRadius: 12, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <strong>WhatsApp Link: </strong>
            <a href={waLink} target="_blank" rel="noreferrer" style={{ color: 'var(--color-gold-text)' }}>{waLink}</a>
          </div>
          <div>
            <strong>Instagram Link: </strong>
            <a href={igLink} target="_blank" rel="noreferrer" style={{ color: 'var(--color-gold-text)' }}>{igLink}</a>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Social Contacts'}
          </button>
        </div>
      </form>
    </div>
  );
}
