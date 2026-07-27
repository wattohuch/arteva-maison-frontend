import { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminAPI } from '../../../api/admin';
import Loader from '../../../components/ui/Loader';
import AdminTable from '../components/AdminTable';
import AdminToolbar from '../components/AdminToolbar';
import StatCard from '../components/StatCard';
import { GlobeIcon, UserIcon, EyeIcon, ClockIcon } from '../../../components/ui/Icons';

/** "3 minutes ago" reads faster than a timestamp when scanning a list. */
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

const DEVICE_ICON = { Mobile: '📱', Tablet: '📲', Desktop: '🖥️' };

export default function VisitorsSection() {
  const [siteVisitsData, setSiteVisitsData] = useState(null);
  const [visitors, setVisitors] = useState({ log: [], byIp: [], totals: {} });
  const [productAnalytics, setProductAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('byIp'); // byIp | log
  const [hideBots, setHideBots] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '1000' });
    if (dateFilter) params.set('date', dateFilter);
    const queryParam = `?${params.toString()}`;

    try {
      const visitsRes = await AdminAPI.getSiteVisits(queryParam);
      if (visitsRes?.success) setSiteVisitsData(visitsRes.data);
    } catch { /* ignore */ }

    try {
      const logRes = await AdminAPI.getSiteVisitLog(queryParam);
      if (logRes?.success) {
        // Older shape returned a bare array; keep working either way.
        setVisitors(Array.isArray(logRes.data)
          ? { log: logRes.data, byIp: [], totals: {} }
          : (logRes.data || { log: [], byIp: [], totals: {} }));
      }
    } catch { /* ignore */ }

    try {
      const prodRes = await AdminAPI.getProductAnalytics();
      if (prodRes?.success) setProductAnalytics(prodRes.data);
    } catch { /* ignore */ }

    setLoading(false);
  }, [dateFilter]);

  useEffect(() => { load(); }, [load]);

  // Filtering runs here rather than server-side: the rows are already loaded,
  // and a round trip per keystroke would be slower than scanning them.
  const rows = useMemo(() => {
    const source = view === 'byIp' ? visitors.byIp : visitors.log;
    const term = search.trim().toLowerCase();

    return (source || []).filter(r => {
      if (hideBots && r.isBot) return false;
      if (!term) return true;
      return [r.ip, r.browser, r.os, r.device, r.page, r.lastProduct, r.referrer]
        .filter(Boolean)
        .some(field => String(field).toLowerCase().includes(term));
    });
  }, [view, visitors, search, hideBots]);

  if (loading) return <div className="admin-loading"><Loader /></div>;

  const totalVisits = siteVisitsData?.totalVisits || 0;
  const uniqueIPs = siteVisitsData?.totalUniqueVisitors || 0;
  const todayVisits = siteVisitsData?.todayVisitors || 0;

  let productViewsCount = 0;
  if (Array.isArray(productAnalytics)) {
    productViewsCount = productAnalytics.reduce((sum, p) => sum + (p.views || 0), 0);
  } else if (productAnalytics?.totalViews) {
    productViewsCount = productAnalytics.totalViews;
  }

  const dailySummary = siteVisitsData?.dailyBreakdown || [];
  const botCount = visitors.totals?.bots || 0;

  const statCards = [
    { Icon: GlobeIcon, label: 'Website Visits', value: totalVisits.toLocaleString(), tone: 'blue' },
    { Icon: UserIcon, label: 'Unique IP Visitors', value: uniqueIPs.toLocaleString(), tone: 'green' },
    { Icon: EyeIcon, label: 'Product Views', value: productViewsCount.toLocaleString(), tone: 'gold' },
    { Icon: ClockIcon, label: "Today's Visitors", value: todayVisits.toLocaleString(), tone: 'amber' },
  ];

  const byIpColumns = [
    {
      key: 'ip',
      header: 'IP Address',
      render: r => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span title={r.device}>{DEVICE_ICON[r.device] || '❔'}</span>
          <code style={{ fontSize: 12, fontWeight: 600 }}>{r.ip || '—'}</code>
          {r.isBot && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '1px 6px', borderRadius: 4 }}>
              BOT
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'visits',
      header: 'Days Seen',
      render: r => <strong>{(r.visits || 0).toLocaleString()}</strong>,
    },
    {
      key: 'device',
      header: 'Device',
      render: r => (
        <span style={{ fontSize: 12 }}>
          {r.browser} · {r.os}
        </span>
      ),
    },
    {
      key: 'productViews',
      header: 'Products Viewed',
      render: r => (r.productViews
        ? <span title={r.lastProduct || ''}>{r.productViews}{r.lastProduct ? ` · ${r.lastProduct}` : ''}</span>
        : <span style={{ color: 'var(--text-muted)' }}>—</span>),
    },
    {
      key: 'lastSeen',
      header: 'Last Seen',
      render: r => <span title={new Date(r.lastSeen).toLocaleString()}>{relativeTime(r.lastSeen)}</span>,
    },
    {
      key: 'referrer',
      header: 'Came From',
      render: r => (
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }} title={r.referrer}>
          {r.referrer ? r.referrer.replace(/^https?:\/\//, '').slice(0, 34) : 'Direct'}
        </span>
      ),
    },
  ];

  const logColumns = [
    {
      key: 'ip',
      header: 'IP Address',
      render: r => <code style={{ fontSize: 12, fontWeight: 600 }}>{r.ip || '—'}</code>,
    },
    {
      key: 'createdAt',
      header: 'When',
      render: r => <span title={new Date(r.createdAt).toLocaleString()}>{relativeTime(r.createdAt)}</span>,
    },
    { key: 'page', header: 'Page', render: r => r.page || r.productName || '/' },
    {
      key: 'device',
      header: 'Device',
      render: r => <span style={{ fontSize: 12 }}>{DEVICE_ICON[r.device] || ''} {r.browser} · {r.os}</span>,
    },
    {
      key: 'referrer',
      header: 'Referrer',
      render: r => (
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }} title={r.referrer}>
          {r.referrer ? r.referrer.replace(/^https?:\/\//, '').slice(0, 34) : 'Direct'}
        </span>
      ),
    },
  ];

  return (
    <div className="admin-view">
      <div className="admin-section-header">
        <h2 className="admin-view-title">Visitor Analytics &amp; IP Tracker</h2>
        <button className="btn btn--outline btn--sm" onClick={load}>🔄 Refresh</button>
      </div>

      <div className="admin-stats-grid">
        {statCards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      <AdminToolbar>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          Filter by Date:
          <input
            type="date"
            className="field-input"
            style={{ width: 'auto' }}
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          />
        </label>

        <input
          type="search"
          className="field-input"
          style={{ width: 220 }}
          placeholder="Search IP, browser, page…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={hideBots} onChange={e => setHideBots(e.target.checked)} />
          Hide bots{botCount ? ` (${botCount})` : ''}
        </label>

        {dateFilter && (
          <button className="btn btn--outline btn--sm" onClick={() => setDateFilter('')}>Clear Filter</button>
        )}
      </AdminToolbar>

      {dailySummary.length > 0 && (
        <section className="admin-section">
          <h3 className="admin-section-title">Daily Visitor Summary</h3>
          <AdminTable
            rows={dailySummary}
            rowKey={d => d.date}
            columns={[
              { key: 'date', header: 'Date', render: d => <strong>{d.date}</strong> },
              { key: 'totalVisits', header: 'Total Visits', render: d => (d.totalVisits || 0).toLocaleString() },
              { key: 'uniqueIPs', header: 'Unique IPs', render: d => (d.uniqueVisitors || 0).toLocaleString() },
            ]}
          />
        </section>
      )}

      <section className="admin-section">
        <div className="admin-section-header">
          <h3 className="admin-section-title">
            {view === 'byIp' ? `Visitors by IP (${rows.length})` : `Visit Log (${rows.length})`}
          </h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`btn btn--sm ${view === 'byIp' ? 'btn--primary' : 'btn--outline'}`}
              onClick={() => setView('byIp')}
            >
              By IP
            </button>
            <button
              className={`btn btn--sm ${view === 'log' ? 'btn--primary' : 'btn--outline'}`}
              onClick={() => setView('log')}
            >
              Timeline
            </button>
          </div>
        </div>

        <AdminTable
          empty={
            search || dateFilter
              ? 'No visitors match this filter.'
              : 'No visits recorded yet.'
          }
          rows={rows}
          rowKey={(v, i) => (view === 'byIp' ? v.ip : `${v.ip}-${v.date}-${i}`)}
          columns={view === 'byIp' ? byIpColumns : logColumns}
        />
      </section>
    </div>
  );
}
