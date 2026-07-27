import { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminAPI } from '../../../api/admin';
import Loader from '../../../components/ui/Loader';
import AdminToolbar from '../components/AdminToolbar';
import StatCard from '../components/StatCard';
import { PackageIcon, UserIcon, CoinsIcon, ClockIcon } from '../../../components/ui/Icons';

const kwd = (n) => `${(Number(n) || 0).toFixed(3)} KWD`;

function relativeTime(value) {
  if (!value) return '—';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '—';

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

export default function CartsSection() {
  const [carts, setCarts] = useState([]);
  const [totals, setTotals] = useState({ carts: 0, items: 0, value: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminAPI.getCarts();
      if (res?.success) {
        setCarts(res.data?.carts || []);
        setTotals(res.data?.totals || { carts: 0, items: 0, value: 0 });
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return carts;
    return carts.filter(c => {
      const haystack = [c.user?.name, c.user?.email, c.user?.phone, ...c.items.map(i => i.product?.name)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [carts, search]);

  if (loading) return <div className="admin-loading"><Loader /></div>;

  const statCards = [
    { Icon: PackageIcon, label: 'Active Carts', value: totals.carts.toLocaleString(), tone: 'blue' },
    { Icon: UserIcon, label: 'Items Waiting', value: totals.items.toLocaleString(), tone: 'gold' },
    { Icon: CoinsIcon, label: 'Total Value', value: kwd(totals.value), tone: 'green' },
  ];

  return (
    <div className="admin-view">
      <div className="admin-section-header">
        <h2 className="admin-view-title">Carts</h2>
        <button className="btn btn--outline btn--sm" onClick={load}>🔄 Refresh</button>
      </div>
      <p className="admin-hint">
        What's currently sitting in each signed-in customer's basket, not yet
        checked out. Guests browsing without an account have no cart here —
        there's nothing to attach it to until they sign in.
      </p>

      <div className="admin-stats-grid">
        {statCards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      <AdminToolbar>
        <input
          type="search"
          className="field-input"
          style={{ width: 260 }}
          placeholder="Search name, email, product…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </AdminToolbar>

      <section className="admin-section">
        <h3 className="admin-section-title">Customer Carts ({rows.length})</h3>

        {rows.length === 0 && (
          <div className="admin-empty">
            {search ? 'No carts match this search.' : 'No one has items waiting in their cart right now.'}
          </div>
        )}

        <div className="visitor-days">
          {rows.map(cart => (
            <div key={cart._id} className="visitor-day is-open">
              <div className="visitor-day-head" style={{ cursor: 'default' }}>
                <span className="visitor-day-date">
                  {cart.user?.name || 'Unknown'}
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.85em' }}>
                    {cart.user?.email}
                  </span>
                </span>
                <span className="visitor-day-meta">
                  <strong>{cart.itemCount}</strong> item{cart.itemCount === 1 ? '' : 's'}
                  {' · '}
                  <strong>{kwd(cart.value)}</strong>
                  {' · '}
                  <span title={new Date(cart.updatedAt).toLocaleString()}>
                    <ClockIcon size={12} style={{ verticalAlign: -2 }} /> {relativeTime(cart.updatedAt)}
                  </span>
                </span>
              </div>

              <div className="visitor-day-body">
                <table className="admin-table visitor-day-table">
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Qty</th>
                      <th scope="col">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.items.map((item, i) => (
                      <tr key={`${item.product?._id || i}`}>
                        <td data-label="Product">{item.product?.name || 'Deleted product'}</td>
                        <td data-label="Qty">{item.quantity}</td>
                        <td data-label="Line Total">{kwd(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
