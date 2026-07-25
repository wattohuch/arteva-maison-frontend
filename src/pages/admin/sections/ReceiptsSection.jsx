import { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '../../../api/admin';
import Loader from '../../../components/ui/Loader';
import AdminTable from '../components/AdminTable';
import AdminToolbar from '../components/AdminToolbar';

export default function ReceiptsSection() {
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('paid');

  const load = useCallback(() => {
    setLoading(true);
    AdminAPI.getOrders()
      .then(res => {
        const data = res.data || [];
        setOrders(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let result = orders;
    if (statusFilter !== 'all') {
      result = result.filter(o => o.paymentStatus === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase().trim();
      result = result.filter(o =>
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.user?.name || '').toLowerCase().includes(q) ||
        (o.user?.email || '').toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, statusFilter, orders]);

  const handlePrint = async (orderId) => {
    try {
      const html = await AdminAPI.getReceipt(orderId);
      const printWin = window.open('', '_blank', 'width=450,height=700');
      if (!printWin) {
        alert('Please allow popups to print receipts.');
        return;
      }
      printWin.document.write(html);
      printWin.document.close();
      printWin.onload = () => {
        setTimeout(() => { printWin.print(); }, 500);
      };
    } catch {
      alert('Failed to load receipt HTML.');
    }
  };

  const handlePreview = async (orderId) => {
    try {
      const html = await AdminAPI.getReceipt(orderId);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      }
    } catch {
      alert('Failed to preview receipt.');
    }
  };

  return (
    <div className="admin-view">
      <div className="admin-section-header">
        <h2 className="admin-view-title">Order Receipts <span className="admin-count">{filtered.length}</span></h2>
      </div>

      <AdminToolbar>
        <input
          type="text"
          className="field-input admin-search"
          placeholder="Search by order #, name, or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="field-input admin-filter"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="paid">Paid Orders</option>
          <option value="pending">Pending Orders</option>
          <option value="refunded">Refunded Orders</option>
          <option value="cancelled">Cancelled Orders</option>
          <option value="all">All Orders</option>
        </select>
      </AdminToolbar>

      <AdminTable
        loading={loading}
        empty="No receipts found."
        rows={filtered}
        columns={[
          {
            key: 'orderNumber', header: 'Order #',
            render: o => <strong style={{ color: 'var(--color-gold-text)' }}>{o.orderNumber || 'N/A'}</strong>,
          },
          {
            key: 'customer', header: 'Customer',
            render: o => (
              <div>
                <div style={{ fontWeight: 500 }}>{o.user ? o.user.name : (o.shippingAddress ? `${o.shippingAddress.firstName} ${o.shippingAddress.lastName}` : 'Guest')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.user?.email || o.contactEmail || ''}</div>
              </div>
            ),
          },
          {
            key: 'date', header: 'Date',
            render: o => new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          },
          { key: 'items', header: 'Items', align: 'center', render: o => o.items?.length || 0 },
          {
            key: 'total', header: 'Total', align: 'right',
            render: o => <strong style={{ fontFamily: 'Playfair Display, serif' }}>{(o.total || 0).toFixed(3)} KWD</strong>,
          },
          {
            key: 'paymentStatus', header: 'Payment',
            render: o => {
              const status = o.paymentStatus || 'pending';
              const color = status === 'paid' ? '#10b981' : (status === 'refunded' ? '#ef4444' : '#f59e0b');
              return (
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: `${color}20`, color }}>
                  {status}
                </span>
              );
            },
          },
          {
            key: 'actions', header: 'Actions', align: 'center',
            render: o => (
              <div style={{ display: 'inline-flex', gap: 6 }}>
                <button className="admin-icon-btn" onClick={() => handlePreview(o._id)} title="View Receipt">👁️</button>
                <button className="admin-icon-btn" onClick={() => handlePrint(o._id)} title="Print Receipt" style={{ background: '#10b98120', color: '#10b981' }}>🖨️</button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
