import { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '../../../api/admin';
import { resolveImageUrl } from '../../../utils/imageHelpers';
import Loader from '../../../components/ui/Loader';
import AdminTable from '../components/AdminTable';
import StatCard from '../components/StatCard';
import { ChartIcon, EyeIcon, UserIcon, GridIcon } from '../../../components/ui/Icons';

export default function AnalyticsSection() {
  const [data, setData] = useState(null);
  const [visitorLog, setVisitorLog] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminAPI.getProductAnalytics();
      if (res.success) setData(res.data);
    } catch { /* ignore */ }
    try {
      const logRes = await AdminAPI.getVisitorLog();
      if (logRes.success) setVisitorLog(logRes.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="admin-loading"><Loader /></div>;

  const summary = data?.summary || {};
  const products = data?.products || [];
  const maxViews = products[0]?.viewCount || 1;

  const statCards = [
    { Icon: EyeIcon, label: 'Total Views', value: (summary.totalViews || 0).toLocaleString(), tone: 'blue' },
    { Icon: GridIcon, label: 'Most Viewed', value: summary.topProduct || '—', tone: 'gold' },
    { Icon: ChartIcon, label: 'Avg Views', value: (summary.averageViews || 0).toLocaleString(), tone: 'green' },
    { Icon: GridIcon, label: 'Tracked Products', value: (summary.totalProducts || 0).toLocaleString(), tone: 'amber' },
    { Icon: UserIcon, label: 'Unique Visitors', value: (summary.totalUniqueVisitors || 0).toLocaleString(), tone: 'blue' },
  ];

  return (
    <div className="admin-view">
      <h2 className="admin-view-title">Product Analytics</h2>

      <div className="admin-stats-grid">
        {statCards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      <section className="admin-section">
        <h3 className="admin-section-title">Most Viewed Products</h3>
        <AdminTable
          empty={
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
              <p>No product views recorded yet.</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Views will appear here as customers browse products.</p>
            </div>
          }
          rows={products}
          columns={[
            {
              key: 'rank', header: '#', width: '50px',
              render: (p, i) => {
                const rank = i + 1;
                const cls = rank <= 3 ? ` analytics-rank-top` : '';
                return <span className={`analytics-rank${cls}`}>{rank}</span>;
              },
            },
            {
              key: 'product', header: 'Product',
              render: p => {
                const primary = p.images?.find(img => img.isPrimary) || p.images?.[0];
                const imgUrl = resolveImageUrl(primary?.url);
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={imgUrl} alt={p.name} className="admin-product-img" style={{ width: 36, height: 36 }} />
                    <span>{p.name}</span>
                  </div>
                );
              },
            },
            { key: 'category', header: 'Category', render: p => p.category?.name || 'Uncategorized' },
            { key: 'views', header: 'Views', render: p => (p.viewCount || 0).toLocaleString() },
            {
              key: 'unique', header: 'Customers', align: 'right',
              render: p => <span style={{ fontWeight: 600, color: '#2563eb' }}>{(p.uniqueViews || 0).toLocaleString()}</span>,
            },
            {
              key: 'bar', header: 'Popularity',
              render: p => {
                const pct = Math.round(((p.viewCount || 0) / maxViews) * 100);
                return (
                  <div className="analytics-bar-wrap">
                    <div className="analytics-bar-track">
                      <div className="analytics-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="analytics-bar-pct">{pct}%</span>
                  </div>
                );
              },
            },
          ]}
        />
      </section>

      {visitorLog.length > 0 && (
        <section className="admin-section">
          <h3 className="admin-section-title">IP Visitor Log</h3>
          <AdminTable
            rows={visitorLog}
            rowKey={r => r.ip + r.date + (r.product || '')}
            columns={[
              { key: 'ip', header: 'IP Address', render: v => <code style={{ fontSize: 12, fontWeight: 600 }}>{v.ip || '—'}</code> },
              { key: 'date', header: 'Date', render: v => v.date || '—' },
              { key: 'product', header: 'Product', render: v => v.productName || v.product || '—' },
              { key: 'ua', header: 'User Agent', render: v => <span style={{ fontSize: 11, color: 'var(--text-muted)' }} title={v.userAgent}>{(v.userAgent || '').substring(0, 60)}{(v.userAgent || '').length > 60 ? '...' : ''}</span> },
              { key: 'ref', header: 'Referrer', render: v => <span style={{ fontSize: 11, color: 'var(--text-muted)' }} title={v.referrer}>{(v.referrer || '—').substring(0, 40)}</span> },
            ]}
          />
        </section>
      )}
    </div>
  );
}
