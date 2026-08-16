import { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminAPI } from '../../../api/admin';
import Loader from '../../../components/ui/Loader';
import AdminTable from '../components/AdminTable';
import AdminToolbar from '../components/AdminToolbar';
import StatCard from '../components/StatCard';
import { GlobeIcon, UserIcon, EyeIcon, ClockIcon } from '../../../components/ui/Icons';
import { resolveImageUrl, cloudinaryImage, handleImageError } from '../../../utils/imageHelpers';

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

/* How many photos sit on one row before the rest collapse into a "+N".
   Six is what fits beside an IP on a laptop without the column growing wide
   enough to push "Last Seen" off the screen. */
const MAX_THUMBS = 6;

/**
 * The products an IP opened, as a line of thumbnails.
 *
 * A count and one product name — what this column used to be — does not answer
 * the question the owner is actually asking, which is "what were they looking
 * at". Photos answer it at a glance, newest first.
 */
function ProductStrip({ products, count }) {
  if (!products?.length) return <span style={{ color: 'var(--text-muted)' }}>—</span>;

  const shown = products.slice(0, MAX_THUMBS);
  const hidden = (count ?? products.length) - shown.length;

  return (
    <span className="visitor-products">
      {shown.map(p => (
        <img
          key={p.id}
          className="visitor-product-thumb"
          src={cloudinaryImage(resolveImageUrl(p.image), 96)}
          alt={p.name || 'Product'}
          title={p.views > 1 ? `${p.name} · ${p.views} views` : p.name}
          loading="lazy"
          onError={handleImageError}
        />
      ))}
      {hidden > 0 && <span className="visitor-product-more" title={`${hidden} more`}>+{hidden}</span>}
    </span>
  );
}

export default function VisitorsSection() {
  const [siteVisitsData, setSiteVisitsData] = useState(null);
  const [visitors, setVisitors] = useState({ log: [], byIp: [], totals: {} });
  const [productAnalytics, setProductAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('byIp'); // byIp | log
  const [hideBots, setHideBots] = useState(true);

  /* Expanded dates in the daily summary. Each one's visitors are fetched the
     first time it is opened and then kept — the log for a single day is a
     small request, but re-fetching it every time a row is toggled would make
     the accordion feel slower the more it is used. */
  const [openDates, setOpenDates] = useState(() => new Set());
  const [dayVisitors, setDayVisitors] = useState({});   // date -> rows
  const [loadingDates, setLoadingDates] = useState(() => new Set());

  const toggleDate = useCallback(async (date) => {
    setOpenDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });

    // Already have it, or already asking for it.
    if (dayVisitors[date] || loadingDates.has(date)) return;

    setLoadingDates(prev => new Set(prev).add(date));
    try {
      const res = await AdminAPI.getSiteVisitLog(`?date=${date}&limit=1000`);
      const payload = res?.data;
      const rows = Array.isArray(payload) ? payload : (payload?.log || []);
      setDayVisitors(prev => ({ ...prev, [date]: rows }));
    } catch {
      setDayVisitors(prev => ({ ...prev, [date]: [] }));
    } finally {
      setLoadingDates(prev => {
        const next = new Set(prev);
        next.delete(date);
        return next;
      });
    }
  }, [dayVisitors, loadingDates]);

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
      // Product names are searchable too, so "who looked at the Vienna vase"
      // is one query away now that the products are on the row.
      const fields = [r.ip, r.browser, r.os, r.device, r.page, r.referrer]
        .concat((r.products || []).map(p => p.name));

      return fields
        .filter(Boolean)
        .some(field => String(field).toLowerCase().includes(term));
    });
  }, [view, visitors, search, hideBots]);

  if (loading) return <div className="admin-loading"><Loader /></div>;

  const totalVisits = siteVisitsData?.totalVisits || 0;
  const uniqueIPs = siteVisitsData?.totalUniqueVisitors || 0;
  const dailySummary = siteVisitsData?.dailyBreakdown || [];

  /* Read today's figure out of the same breakdown the table renders whenever
     it is there. The card showed 0 while the row directly beneath it showed 3
     for the same date — deriving both from one source means they cannot
     disagree, whichever version of the backend is answering. */
  const todayKey = new Date().toISOString().split('T')[0];
  const todayVisits = dailySummary.find(d => d.date === todayKey)?.totalVisits
    ?? siteVisitsData?.todayVisitors
    ?? 0;

  let productViewsCount = 0;
  if (Array.isArray(productAnalytics)) {
    productViewsCount = productAnalytics.reduce((sum, p) => sum + (p.views || 0), 0);
  } else if (productAnalytics?.totalViews) {
    productViewsCount = productAnalytics.totalViews;
  }

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
        ? (
          <span className="visitor-products-cell">
            <ProductStrip products={r.products} count={r.productCount} />
            <span className="visitor-products-count">
              {r.productCount || r.productViews} product{(r.productCount || r.productViews) === 1 ? '' : 's'}
            </span>
          </span>
        )
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
      key: 'products',
      header: 'Products Viewed',
      render: r => <ProductStrip products={r.products} count={r.productCount} />,
    },
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
          placeholder="Search IP, browser, page, product…"
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
          <p className="admin-hint">Click any date to see which IPs visited and when.</p>

          <div className="visitor-days">
            {dailySummary.map(day => {
              const isOpen = openDates.has(day.date);
              const isLoading = loadingDates.has(day.date);
              const rowsForDay = dayVisitors[day.date];

              return (
                <div key={day.date} className={`visitor-day ${isOpen ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="visitor-day-head"
                    onClick={() => toggleDate(day.date)}
                    aria-expanded={isOpen}
                    aria-controls={`day-${day.date}`}
                  >
                    <span className="visitor-day-chevron" aria-hidden="true">▶</span>
                    <span className="visitor-day-date">{day.date}</span>
                    <span className="visitor-day-meta">
                      <strong>{(day.totalVisits || 0).toLocaleString()}</strong> visits
                      {' · '}
                      <strong>{(day.uniqueVisitors || 0).toLocaleString()}</strong> unique IP
                      {day.uniqueVisitors === 1 ? '' : 's'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="visitor-day-body" id={`day-${day.date}`}>
                      {isLoading && <div className="admin-loading"><Loader size="sm" /></div>}

                      {!isLoading && rowsForDay?.length === 0 && (
                        <div className="admin-empty">No individual records kept for this date.</div>
                      )}

                      {!isLoading && rowsForDay?.length > 0 && (
                        <table className="admin-table visitor-day-table">
                          <thead>
                            <tr>
                              <th scope="col">IP Address</th>
                              <th scope="col">Products Viewed</th>
                              <th scope="col">Time</th>
                              <th scope="col">Device</th>
                              <th scope="col">Page</th>
                              <th scope="col">Came From</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rowsForDay
                              .filter(v => !(hideBots && v.isBot))
                              .map((v, i) => (
                                <tr key={`${v.ip}-${i}`}>
                                  <td data-label="IP Address">
                                    <code>{v.ip || '—'}</code>
                                    {v.isBot && <span className="visitor-bot-tag">BOT</span>}
                                  </td>
                                  <td data-label="Products Viewed">
                                    <ProductStrip products={v.products} count={v.productCount} />
                                  </td>
                                  <td data-label="Time">
                                    {v.createdAt
                                      ? new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                      : '—'}
                                  </td>
                                  <td data-label="Device">
                                    {DEVICE_ICON[v.device] || ''} {v.browser || 'Unknown'} · {v.os || 'Unknown'}
                                  </td>
                                  <td data-label="Page">{v.page || '/'}</td>
                                  <td data-label="Came From">
                                    <span title={v.referrer}>
                                      {v.referrer ? v.referrer.replace(/^https?:\/\//, '').slice(0, 30) : 'Direct'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
