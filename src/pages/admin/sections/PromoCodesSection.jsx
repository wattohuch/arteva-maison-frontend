import { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '../../../api/admin';
import Loader from '../../../components/ui/Loader';
import AdminTable from '../components/AdminTable';
import AdminToolbar from '../components/AdminToolbar';
import AdminModal from '../components/AdminModal';
import StatCard from '../components/StatCard';
import StatusPill from '../components/StatusPill';
import { TicketIcon, CheckCircleIcon, ClockIcon, GridIcon } from '../../../components/ui/Icons';

export default function PromoCodesSection() {
  const [promos, setPromos] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'active' | 'expired'
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    AdminAPI.getPromoCodes()
      .then(res => {
        const data = res.data || [];
        setPromos(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const now = new Date();
    let res = promos;
    if (filterTab === 'active') {
      res = res.filter(p => p.isActive && (!p.expiresAt || new Date(p.expiresAt) > now));
    } else if (filterTab === 'expired') {
      res = res.filter(p => !p.isActive || (p.expiresAt && new Date(p.expiresAt) <= now));
    }
    setFiltered(res);
  }, [filterTab, promos]);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (p) => { setEditing(p); setModalOpen(true); };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;
    try {
      await AdminAPI.deletePromoCode(id);
      load();
    } catch { /* toast */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const form = e.target;
    const data = {
      code: form.code.value.trim().toUpperCase(),
      description: form.description.value,
      discountType: form.discountType.value,
      discountValue: parseFloat(form.discountValue.value) || 0,
      minOrderAmount: parseFloat(form.minOrderAmount.value) || 0,
      expiresAt: form.expiresAt.value || null,
      usageLimit: form.usageLimit.value ? parseInt(form.usageLimit.value) : null,
      isActive: form.isActive.checked,
    };

    try {
      if (editing) {
        await AdminAPI.updatePromoCode(editing._id, data);
      } else {
        await AdminAPI.createPromoCode(data);
      }
      setModalOpen(false);
      load();
    } catch { /* toast */ }
    setSaving(false);
  };

  if (loading) return <div className="admin-loading"><Loader /></div>;

  const total = promos.length;
  const active = promos.filter(p => p.isActive && (!p.expiresAt || new Date(p.expiresAt) > new Date())).length;
  const expired = promos.filter(p => !p.isActive || (p.expiresAt && new Date(p.expiresAt) <= new Date())).length;
  const totalProducts = promos.reduce((sum, p) => sum + (p.products?.length || 0), 0);

  const statCards = [
    { Icon: TicketIcon, label: 'Total Promo Codes', value: total, tone: 'blue' },
    { Icon: CheckCircleIcon, label: 'Active', value: active, tone: 'green' },
    { Icon: ClockIcon, label: 'Expired / Disabled', value: expired, tone: 'amber' },
    { Icon: GridIcon, label: 'Discounted Products', value: totalProducts, tone: 'gold' },
  ];

  return (
    <div className="admin-view">
      <div className="admin-section-header">
        <h2 className="admin-view-title">Promo Codes & Discounts</h2>
        <button className="btn btn--primary btn--sm" onClick={openAdd}>+ Create Promo Code</button>
      </div>

      <div className="admin-stats-grid">
        {statCards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      <AdminToolbar>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'active', 'expired'].map(tab => (
            <button
              key={tab}
              className={`btn btn--sm ${filterTab === tab ? 'btn--primary' : 'btn--outline'}`}
              onClick={() => setFilterTab(tab)}
              style={{ textTransform: 'capitalize' }}
            >
              {tab}
            </button>
          ))}
        </div>
      </AdminToolbar>

      <AdminTable
        empty="No promo codes found."
        rows={filtered}
        columns={[
          {
            key: 'code', header: 'Code',
            render: p => <strong style={{ letterSpacing: '0.05em', color: 'var(--color-gold-text)' }}>{p.code}</strong>,
          },
          {
            key: 'discount', header: 'Discount',
            render: p => (
              <span>
                {p.discountType === 'percentage' ? `${p.discountValue}%` : `${p.discountValue.toFixed(3)} KWD`}
                {p.minOrderAmount > 0 && <small style={{ display: 'block', color: 'var(--text-muted)' }}>Min order: {p.minOrderAmount} KWD</small>}
              </span>
            ),
          },
          {
            key: 'usage', header: 'Usage',
            render: p => `${p.usedCount || 0}${p.usageLimit ? ` / ${p.usageLimit}` : ' (Unlimited)'}`,
          },
          {
            key: 'expires', header: 'Expires',
            render: p => p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : 'Never',
          },
          {
            key: 'status', header: 'Status',
            render: p => {
              const isExp = p.expiresAt && new Date(p.expiresAt) <= new Date();
              const isAct = p.isActive && !isExp;
              return <StatusPill status={isAct ? 'confirmed' : 'cancelled'} />;
            },
          },
          {
            key: 'actions', header: 'Actions', align: 'right',
            render: p => (
              <div className="admin-row-actions">
                <button className="admin-icon-btn" onClick={() => openEdit(p)} title="Edit">✏️</button>
                <button className="admin-icon-btn admin-icon-danger" onClick={() => handleDelete(p._id)} title="Delete">🗑️</button>
              </div>
            ),
          },
        ]}
      />

      <AdminModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Promo Code' : 'Create Promo Code'}>
        <form onSubmit={handleSubmit} className="admin-modal-form">
          <div className="admin-form-grid">
            <label className="admin-form-label">
              Promo Code *
              <input name="code" className="field-input" required defaultValue={editing?.code || ''} style={{ textTransform: 'uppercase' }} />
            </label>

            <label className="admin-form-label">
              Discount Type
              <select name="discountType" className="field-input" defaultValue={editing?.discountType || 'percentage'}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (KWD)</option>
              </select>
            </label>

            <label className="admin-form-label">
              Discount Value *
              <input name="discountValue" type="number" step="0.001" className="field-input" required defaultValue={editing?.discountValue || 10} />
            </label>

            <label className="admin-form-label">
              Min Order Amount (KWD)
              <input name="minOrderAmount" type="number" step="0.001" className="field-input" defaultValue={editing?.minOrderAmount || 0} />
            </label>

            <label className="admin-form-label">
              Usage Limit
              <input name="usageLimit" type="number" className="field-input" placeholder="Leave empty for unlimited" defaultValue={editing?.usageLimit || ''} />
            </label>

            <label className="admin-form-label">
              Expiration Date
              <input name="expiresAt" type="date" className="field-input" defaultValue={editing?.expiresAt ? editing.expiresAt.split('T')[0] : ''} />
            </label>

            <label className="admin-form-label" style={{ gridColumn: '1 / -1' }}>
              Description
              <textarea name="description" className="field-input" rows={2} defaultValue={editing?.description || ''} />
            </label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, cursor: 'pointer' }}>
            <input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} />
            Active
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
