import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../contexts/I18nContext';
import { AdminAPI } from '../../../api/admin';
import { timeAgo } from '../../../utils/formatters';
import Loader from '../../../components/ui/Loader';
import AdminTable from '../components/AdminTable';
import StatCard from '../components/StatCard';
import StatusPill from '../components/StatusPill';
import OrderDetailSheet from '../components/OrderDetailSheet';
import { BagIcon, GridIcon, UserIcon, SparkleIcon, GlobeIcon, TicketIcon, TagIcon, ReceiptIcon } from '../../../components/ui/Icons';

export default function DashboardSection() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      AdminAPI.getStats()
        .then(res => { if (!cancelled) setStats(res.data || res); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false); });

    load();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 30000);

    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    AdminAPI.getUsers()
      .then(res => setDrivers((res.data || []).filter(u => u.role === 'driver')))
      .catch(() => {});
  }, []);

  if (loading) return <div className="admin-loading"><Loader /></div>;

  const cards = [
    { Icon: BagIcon, label: t('total_orders'), value: stats?.totalOrders || 0, tone: 'blue', path: '/admin/orders' },
    { Icon: GridIcon, label: t('total_products'), value: stats?.totalProducts || 0, tone: 'gold', path: '/admin/products' },
    { Icon: UserIcon, label: t('total_users'), value: stats?.totalUsers || 0, tone: 'green', path: '/admin/users' },
    { Icon: SparkleIcon, label: t('total_revenue'), value: `${(stats?.totalRevenue || 0).toFixed(3)} KWD`, tone: 'amber', path: '/admin/orders' },
    { Icon: GlobeIcon, label: 'Visitors (30d)', value: stats?.totalVisitors || 0, tone: 'blue', path: '/admin/visitors' },
  ];

  const quickLinks = [
    { label: 'Promo Codes', Icon: TicketIcon, path: '/admin/promo-codes' },
    { label: 'Discounts & Pricing', Icon: TagIcon, path: '/admin/discounts' },
    { label: 'Receipt Generator', Icon: ReceiptIcon, path: '/admin/receipts' },
  ];

  return (
    <div className="admin-view">
      <h2 className="admin-view-title">{t('dashboard')}</h2>

      <div className="admin-stats-grid">
        {cards.map(c => (
          <div key={c.label} onClick={() => navigate(c.path)} style={{ cursor: 'pointer' }}>
            <StatCard {...c} />
          </div>
        ))}
      </div>

      <section className="admin-section" style={{ marginTop: 24 }}>
        <h3 className="admin-section-title">Quick Actions</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {quickLinks.map(q => (
            <button
              key={q.label}
              className="btn btn--outline"
              onClick={() => navigate(q.path)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <q.Icon size={16} />
              <span>{q.label}</span>
            </button>
          ))}
        </div>
      </section>

      {stats?.recentOrders?.length > 0 && (
        <section className="admin-section">
          <h3 className="admin-section-title">{t('recent_orders')}</h3>
          <AdminTable
            caption={t('recent_orders')}
            rows={stats.recentOrders.slice(0, 10)}
            columns={[
              { key: 'orderNumber', header: '#', render: o => <span className="order-num">{o.orderNumber}</span> },
              { key: 'customer', header: t('customer'), render: o => o.user?.name || o.shippingAddress?.fullName || t('guest') },
              { key: 'total', header: t('total'), render: o => `${(o.totalAmount || o.total || 0).toFixed(3)} KWD` },
              { key: 'status', header: t('status'), render: o => <StatusPill status={o.status || o.orderStatus} /> },
              { key: 'date', header: t('date'), render: o => timeAgo(o.createdAt) },
            ]}
            empty={t('admin_no_orders')}
            onRowClick={(row) => setSelectedOrder(row)}
          />
        </section>
      )}

      <OrderDetailSheet
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        drivers={drivers}
      />
    </div>
  );
}
