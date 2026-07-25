import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../contexts/I18nContext';
import { useAuth } from '../../../contexts/AuthContext';
import { AdminAPI } from '../../../api/admin';
import { formatDate, getStatusColor } from '../../../utils/formatters';
import { showToast } from '../../../components/ui/Toast';
import { Input, Select } from '../../../components/ui/Field';
import { SearchIcon, TrashIcon, EyeIcon, ReceiptIcon } from '../../../components/ui/Icons';
import { resolveImageUrl } from '../../../utils/imageHelpers';
import AdminTable from '../components/AdminTable';
import AdminToolbar from '../components/AdminToolbar';
import AppSheet, { ConfirmSheet } from '../../../components/ui/AppSheet';
import './OrdersSection.css';

const ORDER_STATUSES = [
  'pending', 'confirmed', 'processing', 'packed',
  'handed_over', 'out_for_delivery', 'delivered', 'cancelled',
];

const SOURCE_TABS = [
  { id: 'all', labelKey: 'all_orders' },
  { id: 'online', labelKey: 'online_orders' },
  { id: 'manual', labelKey: 'manual_orders' },
];

const label = (s) => (s || '').replace(/_/g, ' ');
const kwd = (n) => `${(Number(n) || 0).toFixed(3)} KWD`;

/** Leaflet is only needed when an admin actually opens the driver map. */
function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function OrdersSection() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({ all: 0, online: 0, manual: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [source, setSource] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [unlocked, setUnlocked] = useState({});
  const [detailOrder, setDetailOrder] = useState(null);
  const [trackOrder, setTrackOrder] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Deleting an order destroys an accounting record, so it is offered only to
  // owners. The API enforces the same rule independently.
  const canDelete = user?.role === 'owner' || user?.role === 'superuser';

  // Debounced so typing a customer name is one request, not one per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminAPI.getOrders({
        source,
        status: status === 'all' ? undefined : status,
        search: debouncedSearch || undefined,
        page,
        limit: 50,
      });
      setOrders(res.data || []);
      if (res.counts) setCounts(res.counts);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      showToast(err.message || t('failed_load_orders'), 'error');
    } finally {
      setLoading(false);
    }
  }, [source, status, debouncedSearch, page, t]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Drivers change rarely — fetched once rather than alongside every order query.
  useEffect(() => {
    AdminAPI.getUsers()
      .then(res => setDrivers((res.data || []).filter(u => u.role === 'driver')))
      .catch(() => {});
  }, []);

  const updateStatus = useCallback(async (orderId, newStatus) => {
    const previous = orders;
    // Optimistic: the select reflects the change immediately and rolls back if
    // the request fails, so the admin is never left waiting on a dropdown.
    setOrders(prev => prev.map(o => (o._id === orderId ? { ...o, orderStatus: newStatus } : o)));
    try {
      await AdminAPI.updateOrderStatus(orderId, newStatus);
      showToast(`Status → ${label(newStatus)}`, 'success');
    } catch (err) {
      setOrders(previous);
      showToast(err.message || t('admin_update_failed'), 'error');
    }
  }, [orders, t]);

  const assignDriver = useCallback(async (orderId, driverId) => {
    try {
      await AdminAPI.assignDriver(orderId, driverId);
      showToast('Driver assigned', 'success');
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Failed to assign driver', 'error');
    }
  }, [loadOrders]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await AdminAPI.deleteOrder(deleteTarget._id);
      if (!res.success) throw new Error(res.message || 'Delete failed');
      showToast(res.message || t('order_deleted'), 'success');
      setDeleteTarget(null);
      setDetailOrder(null);
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Failed to delete order', 'error');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, loadOrders, t]);

  // Driver map — mounted only while the tracking sheet is open.
  useEffect(() => {
    if (!trackOrder) {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      return;
    }

    let subscribed = true;
    loadLeaflet().then((L) => {
      if (!subscribed || !mapContainerRef.current) return;

      mapInstanceRef.current?.remove();

      const cartoLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      });
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      });

      const map = L.map(mapContainerRef.current, {
        center: [29.3759, 47.9774],
        zoom: 13,
        layers: [cartoLight],
      });
      L.control.layers({ 'Light Theme': cartoLight, Streets: osm }).addTo(map);
      mapInstanceRef.current = map;

      const coords = trackOrder.shippingAddress?.coordinates;
      if (coords?.lat && coords?.lng) {
        L.marker([coords.lat, coords.lng], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background:#ef4444;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">🏠</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        }).addTo(map).bindPopup('Delivery Address').openPopup();
        map.setView([coords.lat, coords.lng], 14);
      }

      // The sheet animates in; sizing before it settles gives a grey map.
      setTimeout(() => map.invalidateSize(), 320);
    }).catch(() => showToast('Could not load the map', 'error'));

    return () => { subscribed = false; };
  }, [trackOrder]);

  const columns = useMemo(() => [
    {
      key: 'orderNumber', header: '#',
      render: o => (
        <div className="ord-num">
          <strong>#{o.orderNumber}</strong>
          <SourceBadge source={o.orderSource} />
        </div>
      ),
    },
    {
      key: 'customer', header: t('customer'),
      render: o => (
        <div>
          <strong>{o.user?.name || o.shippingAddress?.fullName || 'Guest'}</strong>
          <br />
          <small className="admin-muted">{o.user?.email || ''}</small>
        </div>
      ),
    },
    {
      key: 'total', header: t('total'),
      render: o => (
        <div className="ord-total">
          <span>{kwd(o.total)}</span>
          {o.refundAmount > 0 && (
            <small className="ord-refunded">−{kwd(o.refundAmount)} refunded</small>
          )}
        </div>
      ),
    },
    {
      key: 'status', header: t('status'),
      render: o => {
        const current = o.orderStatus || 'pending';
        const locked = current === 'delivered' && !unlocked[o._id];
        return (
          <select
            className="status-select"
            value={current}
            disabled={locked}
            onChange={e => updateStatus(o._id, e.target.value)}
            style={{ color: getStatusColor(current) }}
            aria-label={`Status for order ${o.orderNumber}`}
          >
            {ORDER_STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        );
      },
    },
    {
      key: 'driver', header: 'Driver',
      render: o => {
        const current = o.orderStatus || 'pending';
        const locked = current === 'delivered' && !unlocked[o._id];
        return (
          <select
            className="status-select"
            value={o.deliveryPilot?._id || o.deliveryPilot || ''}
            disabled={locked}
            onChange={e => assignDriver(o._id, e.target.value)}
            style={{ maxWidth: 140 }}
            aria-label={`Driver for order ${o.orderNumber}`}
          >
            <option value="">Select Driver</option>
            {drivers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        );
      },
    },
    { key: 'date', header: t('date'), render: o => formatDate(o.createdAt) },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: o => {
        const current = o.orderStatus || 'pending';
        const locked = current === 'delivered' && !unlocked[o._id];
        const canTrack = o.deliveryPilot && ['out_for_delivery', 'handed_over'].includes(current);
        return (
          <div className="admin-row-actions">
            {locked && (
              <button
                className="admin-icon-btn"
                onClick={() => setUnlocked(prev => ({ ...prev, [o._id]: true }))}
                title="Unlock order"
              >🔓</button>
            )}
            {canTrack && (
              <button className="admin-icon-btn" onClick={() => setTrackOrder(o)} title="Track driver">🚗</button>
            )}
            <button className="admin-icon-btn" onClick={() => setDetailOrder(o)} title="View order" aria-label={`View order ${o.orderNumber}`}>
              <EyeIcon size={15} />
            </button>
            {canDelete && (
              <button
                className="admin-icon-btn admin-icon-btn--danger"
                onClick={() => setDeleteTarget(o)}
                title={t('delete_order')}
                aria-label={`${t('delete_order')} ${o.orderNumber}`}
              >
                <TrashIcon size={15} />
              </button>
            )}
          </div>
        );
      },
    },
  ], [t, unlocked, drivers, canDelete, updateStatus, assignDriver]);

  return (
    <div className="admin-view">
      <h2 className="admin-view-title">
        {t('orders')} <span className="admin-count">{pagination.total}</span>
      </h2>

      {/* Source tabs — All / Online / Manual receipts. Filtering happens in
          Mongo, so switching tabs is an indexed query, not a client re-filter
          of every order ever placed. */}
      <div className="ord-tabs" role="tablist" aria-label="Order source">
        {SOURCE_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={source === tab.id}
            className={`ord-tab ${source === tab.id ? 'is-active' : ''}`}
            onClick={() => { setSource(tab.id); setPage(1); }}
          >
            <span>{t(tab.labelKey)}</span>
            <span className="ord-tab-count">{counts[tab.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <AdminToolbar>
        <Input
          type="search"
          placeholder={t('admin_search_orders')}
          aria-label={t('admin_search_orders')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<SearchIcon size={17} />}
          wrapperClassName="admin-search field-sm"
        />
        <Select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          aria-label={t('status')}
          wrapperClassName="admin-filter field-sm"
          options={[
            { value: 'all', label: t('all_statuses') },
            ...ORDER_STATUSES.map(s => ({ value: s, label: label(s) })),
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
        caption={t('orders')}
        loading={loading}
        rows={orders}
        empty={t('admin_no_orders')}
        columns={columns}
      />

      {pagination.pages > 1 && (
        <nav className="ord-pager" aria-label="Order pages">
          <button
            type="button" className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >Previous</button>
          <span>Page {pagination.page} of {pagination.pages}</span>
          <button
            type="button" className="btn btn-secondary btn-sm"
            disabled={page >= pagination.pages}
            onClick={() => setPage(p => p + 1)}
          >Next</button>
        </nav>
      )}

      {/* ── Order detail ── */}
      <AppSheet
        open={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        title={detailOrder ? `Order #${detailOrder.orderNumber}` : ''}
        subtitle={detailOrder ? `${detailOrder.orderSource === 'manual' ? 'Manual receipt' : 'Online order'} · ${formatDate(detailOrder.createdAt)}` : ''}
        headerAction={canDelete && detailOrder ? (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setDeleteTarget(detailOrder)}
          >
            <TrashIcon size={15} /> Delete
          </button>
        ) : null}
        footer={
          <>
            {detailOrder?.orderSource === 'manual' && (
              <button
                type="button" className="btn btn-secondary"
                onClick={() => { setDetailOrder(null); navigate('/admin/receipt-generator'); }}
              >
                Edit receipt
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={() => setDetailOrder(null)}>
              Close
            </button>
          </>
        }
      >
        {detailOrder && <OrderDetail order={detailOrder} />}
      </AppSheet>

      {/* ── Driver map ── */}
      <AppSheet
        open={!!trackOrder}
        onClose={() => setTrackOrder(null)}
        title={trackOrder ? `Track — #${trackOrder.orderNumber}` : ''}
        subtitle={trackOrder?.deliveryPilot?.name || ''}
      >
        <div className="ord-map" ref={mapContainerRef} />
      </AppSheet>

      {/* ── Delete confirmation ──
          Typing the order number back is deliberate friction: the row buttons
          are small and adjacent, and this action cannot be undone. */}
      <ConfirmSheet
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('delete_order')}
        message={`${t('delete_order_warning')} ${
          deleteTarget?.items?.length
            ? `${deleteTarget.items.length} line item(s) will return to inventory.`
            : ''
        }`}
        confirmLabel={t('delete_order')}
        confirmText={deleteTarget?.orderNumber}
        busy={deleting}
      />
    </div>
  );
}

const SourceBadge = memo(function SourceBadge({ source }) {
  const manual = source === 'manual';
  return (
    <span className={`ord-source ${manual ? 'is-manual' : 'is-online'}`}>
      {manual ? 'Receipt' : 'Online'}
    </span>
  );
});

const OrderDetail = memo(function OrderDetail({ order }) {
  const address = order.shippingAddress || {};
  return (
    <>
      <div className="ord-detail-grid">
        <div className="ord-detail-block">
          <h4>Customer</h4>
          <p>{order.user?.name || address.fullName || 'Guest'}</p>
          <p className="admin-muted">{order.user?.email || '—'}</p>
          <p className="admin-muted">{address.phone || order.user?.phone || '—'}</p>
        </div>
        <div className="ord-detail-block">
          <h4>Payment</h4>
          <p>Method: {order.paymentMethod || '—'}</p>
          <p>Status: {order.paymentStatus || '—'}</p>
          {order.promoCode?.code && (
            <p className="ord-promo">🏷️ {order.promoCode.code} · −{kwd(order.promoCode.totalDiscount)}</p>
          )}
        </div>
        <div className="ord-detail-block">
          <h4>Shipping</h4>
          <p>{address.street || '—'}</p>
          <p className="admin-muted">{[address.city, address.country].filter(Boolean).join(', ')}</p>
          <p className="admin-muted">Driver: {order.deliveryPilot?.name || 'Unassigned'}</p>
        </div>
      </div>

      <h4 className="ord-items-title">Items</h4>
      <ul className="ord-items">
        {(order.items || []).map((item, i) => (
          <li key={item._id || i} className={`ord-item ${item.isRefunded ? 'is-refunded' : ''}`}>
            <img src={resolveImageUrl(item.image)} alt="" loading="lazy" />
            <div className="ord-item-body">
              <strong>{item.name}</strong>
              <small>{kwd(item.price)} × {item.quantity}</small>
              {item.isRefunded && <span className="ord-item-refunded">Refunded</span>}
            </div>
            <span className="ord-item-total">{kwd(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <dl className="ord-summary">
        <div><dt>Subtotal</dt><dd>{kwd(order.subtotal)}</dd></div>
        <div><dt>Shipping</dt><dd>{kwd(order.shippingCost)}</dd></div>
        {order.discount > 0 && (
          <div className="is-discount"><dt>Discount</dt><dd>−{kwd(order.discount)}</dd></div>
        )}
        {order.refundAmount > 0 && (
          <div className="is-refund"><dt>Refunded</dt><dd>−{kwd(order.refundAmount)}</dd></div>
        )}
        <div className="is-grand"><dt>Total</dt><dd>{kwd(order.total)}</dd></div>
      </dl>
    </>
  );
});
