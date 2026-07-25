import { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '../../../api/admin';
import Loader from '../../../components/ui/Loader';
import AdminTable from '../components/AdminTable';
import AdminToolbar from '../components/AdminToolbar';
import StatCard from '../components/StatCard';
import { GlobeIcon, UserIcon, EyeIcon, ClockIcon } from '../../../components/ui/Icons';

export default function VisitorsSection() {
  const [siteVisitsData, setSiteVisitsData] = useState(null);
  const [visitorLog, setVisitorLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const queryParam = dateFilter ? `?date=${dateFilter}&limit=1000` : '?limit=1000';
    try {
      const visitsRes = await AdminAPI.getSiteVisits(queryParam);
      if (visitsRes.success) setSiteVisitsData(visitsRes.data);
    } catch { /* ignore */ }

    try {
      const logRes = await AdminAPI.getSiteVisitLog(queryParam);
      if (logRes.success) setVisitorLog(logRes.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [dateFilter]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="admin-loading"><Loader /></div>;

  const totalVisits = siteVisitsData?.totalVisits || 0;
  const uniqueIPs = siteVisitsData?.uniqueIPs || 0;
  const productViewsCount = siteVisitsData?.productViewsCount || 0;
  const todayVisits = siteVisitsData?.todayVisits || 0;
  const dailySummary = siteVisitsData?.dailySummary || [];

  const statCards = [
    { Icon: GlobeIcon, label: 'Website Visits', value: totalVisits.toLocaleString(), tone: 'blue' },
    { Icon: UserIcon, label: 'Unique IP Visitors', value: uniqueIPs.toLocaleString(), tone: 'green' },
    { Icon: EyeIcon, label: 'Product Views', value: productViewsCount.toLocaleString(), tone: 'gold' },
    { Icon: ClockIcon, label: "Today's Visitors", value: todayVisits.toLocaleString(), tone: 'amber' },
  ];

  return (
    <div className="admin-view">
      <div className="admin-section-header">
        <h2 className="admin-view-title">Visitor Analytics & IP Tracker</h2>
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
              { key: 'uniqueIPs', header: 'Unique IPs', render: d => (d.uniqueIPs || 0).toLocaleString() },
              { key: 'productViews', header: 'Product Views', render: d => (d.productViews || 0).toLocaleString() },
            ]}
          />
        </section>
      )}

      <section className="admin-section">
        <h3 className="admin-section-title">Detailed Visitor Log ({visitorLog.length})</h3>
        <AdminTable
          empty="No visitor log entries found."
          rows={visitorLog}
          rowKey={(v, i) => v._id || `v-${i}`}
          columns={[
            { key: 'ip', header: 'IP Address', render: v => <code style={{ fontSize: 12, fontWeight: 600 }}>{v.ip || '—'}</code> },
            { key: 'timestamp', header: 'Time', render: v => new Date(v.timestamp || v.createdAt).toLocaleString() },
            { key: 'page', header: 'Page / Product', render: v => v.productName || v.path || v.page || '—' },
            { key: 'device', header: 'Device', render: v => v.device || '—' },
            { key: 'referrer', header: 'Referrer', render: v => <span style={{ fontSize: 11, color: 'var(--text-muted)' }} title={v.referrer}>{(v.referrer || '—').substring(0, 40)}</span> },
          ]}
        />
      </section>
    </div>
  );
}
