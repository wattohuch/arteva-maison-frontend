import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminAPI } from '../../../api/admin';
import { showToast } from '../../../components/ui/Toast';
import { Input, Select } from '../../../components/ui/Field';
import { SearchIcon, EyeIcon, PrinterIcon, ReceiptIcon } from '../../../components/ui/Icons';
import { formatDate } from '../../../utils/formatters';
import AdminTable from '../components/AdminTable';
import AdminToolbar from '../components/AdminToolbar';

const kwd = (n) => `${(Number(n) || 0).toFixed(3)} KWD`;

/**
 * Receipts — the print/preview list.
 *
 * Building and editing receipts lives in the Receipt Generator; this view is
 * for finding an existing one and getting it onto paper. Filtering runs
 * server-side, so the page no longer pulls the whole order collection down to
 * filter it in the browser.
 */
export default function ReceiptsSection() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [source, setSource] = useState('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminAPI.getOrders({
        source,
        paymentStatus: paymentStatus === 'all' ? undefined : paymentStatus,
        search: debounced || undefined,
        limit: 100,
      });
      setOrders(res.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load receipts', 'error');
    } finally {
      setLoading(false);
    }
  }, [source, paymentStatus, debounced]);

  useEffect(() => { load(); }, [load]);

  /**
   * Open the server-rendered receipt HTML.
   *
   * Written into the new window with the DOM parser rather than
   * `document.write`, so the markup is never re-parsed through a string
   * concatenation path.
   */
  const openReceipt = useCallback(async (orderId, print) => {
    try {
      const html = await AdminAPI.getReceipt(orderId);
      const win = window.open('', '_blank');
      if (!win) {
        showToast('Allow pop-ups to preview receipts', 'error');
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      if (print) {
        win.addEventListener('load', () => win.print(), { once: true });
      }
    } catch (err) {
      showToast(err.message || 'Failed to load the receipt', 'error');
    }
  }, []);

  const columns = useMemo(() => [
    {
      key: 'orderNumber', header: 'Order #',
      render: o => (
        <div className="ord-num">
          <strong style={{ color: 'var(--color-gold-text)' }}>{o.orderNumber}</strong>
          <span className={`ord-source ${o.orderSource === 'manual' ? 'is-manual' : 'is-online'}`}>
            {o.orderSource === 'manual' ? 'Receipt' : 'Online'}
          </span>
        </div>
      ),
    },
    {
      key: 'customer', header: 'Customer',
      render: o => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {o.user?.name || o.shippingAddress?.fullName || 'Guest'}
          </div>
          <small className="admin-muted">{o.user?.email || ''}</small>
        </div>
      ),
    },
    { key: 'date', header: 'Date', render: o => formatDate(o.createdAt) },
    {
      key: 'items', header: 'Items', align: 'center',
      render: o => (o.items || []).reduce((s, i) => s + (i.quantity || 0), 0),
    },
    {
      key: 'total', header: 'Total', align: 'right',
      render: o => <strong style={{ fontFamily: 'var(--font-display)' }}>{kwd(o.total)}</strong>,
    },
    {
      key: 'paymentStatus', header: 'Payment',
      render: o => {
        const status = o.paymentStatus || 'pending';
        const color = status === 'paid' ? '#10b981' : status === 'refunded' ? '#ef4444' : '#f59e0b';
        return (
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 12,
            fontSize: 11, fontWeight: 600, background: `${color}20`, color,
          }}>
            {status}
          </span>
        );
      },
    },
    {
      key: 'actions', header: 'Actions', align: 'center',
      render: o => (
        <div className="admin-row-actions">
          <button
            className="admin-icon-btn"
            onClick={() => openReceipt(o._id, false)}
            title="Preview receipt"
            aria-label={`Preview receipt ${o.orderNumber}`}
          >
            <EyeIcon size={15} />
          </button>
          <button
            className="admin-icon-btn"
            onClick={() => openReceipt(o._id, true)}
            title="Print receipt"
            aria-label={`Print receipt ${o.orderNumber}`}
            style={{ background: '#10b98120', color: '#10b981' }}
          >
            <PrinterIcon size={15} />
          </button>
        </div>
      ),
    },
  ], [openReceipt]);

  return (
    <div className="admin-view">
      <div className="admin-section-header">
        <h2 className="admin-view-title">
          Receipts <span className="admin-count">{orders.length}</span>
        </h2>
      </div>

      <AdminToolbar>
        <Input
          type="search"
          placeholder="Search order #, name, or email…"
          aria-label="Search receipts"
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<SearchIcon size={17} />}
          wrapperClassName="admin-search field-sm"
        />
        <Select
          value={source}
          onChange={e => setSource(e.target.value)}
          aria-label="Order source"
          wrapperClassName="admin-filter field-sm"
          options={[
            { value: 'all', label: 'All sources' },
            { value: 'online', label: 'Online orders' },
            { value: 'manual', label: 'Manual receipts' },
          ]}
        />
        <Select
          value={paymentStatus}
          onChange={e => setPaymentStatus(e.target.value)}
          aria-label="Payment status"
          wrapperClassName="admin-filter field-sm"
          options={[
            { value: 'paid', label: 'Paid' },
            { value: 'pending', label: 'Pending' },
            { value: 'refunded', label: 'Refunded' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'all', label: 'All statuses' },
          ]}
        />
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigate('/admin/receipt-generator')}
        >
          <ReceiptIcon size={15} /> New receipt
        </button>
      </AdminToolbar>

      <AdminTable
        caption="Receipts"
        loading={loading}
        empty="No receipts found."
        rows={orders}
        columns={columns}
      />
    </div>
  );
}
