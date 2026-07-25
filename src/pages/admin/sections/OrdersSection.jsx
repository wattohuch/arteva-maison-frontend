import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { AdminAPI } from '../../../api/admin';
import { formatDate, getStatusColor } from '../../../utils/formatters';
import { showToast } from '../../../components/ui/Toast';
import { Input, Select } from '../../../components/ui/Field';
import { SearchIcon } from '../../../components/ui/Icons';
import { resolveImageUrl } from '../../../utils/imageHelpers';
import AdminTable from '../components/AdminTable';
import AdminToolbar from '../components/AdminToolbar';
import AdminModal from '../components/AdminModal';

const ORDER_STATUSES = [
  'pending', 'confirmed', 'processing', 'packed',
  'handed_over', 'out_for_delivery', 'delivered', 'cancelled',
];

const label = (s) => (s || '').replace(/_/g, ' ');

// Dynamic Leaflet loader
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
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [unlockedOrders, setUnlockedOrders] = useState({});

  // Modals state
  const [detailOrder, setDetailOrder] = useState(null);
  const [trackOrder, setTrackOrder] = useState(null);

  // Map refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const loadOrdersData = useCallback(() => {
    setLoading(true);
    Promise.all([
      AdminAPI.getOrders(),
      AdminAPI.getUsers().catch(() => ({ data: [] })),
    ]).then(([ordersRes, usersRes]) => {
      setOrders(ordersRes.data || []);
      const allUsers = usersRes.data || [];
      setDrivers(allUsers.filter(u => u.role === 'driver'));
    }).catch(err => {
      showToast(err.message || t('failed_load_orders'), 'error');
    }).finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    loadOrdersData();
  }, [loadOrdersData]);

  const updateStatus = useCallback(async (orderId, newStatus) => {
    const previous = orders;
    setOrders(prev => prev.map(o => (o._id === orderId ? { ...o, orderStatus: newStatus, status: newStatus } : o)));
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
      loadOrdersData();
    } catch (err) {
      showToast(err.message || 'Failed to assign driver', 'error');
    }
  }, [loadOrdersData]);

  const toggleUnlock = (orderId) => {
    setUnlockedOrders(prev => ({ ...prev, [orderId]: true }));
  };

  // Setup Leaflet map for tracking driver when trackOrder modal opens
  useEffect(() => {
    if (!trackOrder) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    let isSubscribed = true;
    loadLeaflet().then((L) => {
      if (!isSubscribed || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // LIGHT THEME: CartoDB Positron light style
      const cartoLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      });

      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      });

      const map = L.map(mapContainerRef.current, {
        center: [29.3759, 47.9774], // Kuwait City default
        zoom: 13,
        layers: [cartoLight]
      });

      L.control.layers({ "Light Theme": cartoLight, "Streets": osm }).addTo(map);
      mapInstanceRef.current = map;

      // Add destination marker if shipping coordinates exist
      const coords = trackOrder.shippingAddress?.coordinates;
      if (coords?.lat && coords?.lng) {
        const destMarker = L.marker([coords.lat, coords.lng], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background:#ef4444;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">🏠</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).addTo(map);
        destMarker.bindPopup('Delivery Address').openPopup();
        map.setView([coords.lat, coords.lng], 14);
      }

      setTimeout(() => { map.invalidateSize(); }, 300);
    });

    return () => { isSubscribed = false; };
  }, [trackOrder]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      const currentStatus = o.orderStatus || o.status || 'pending';
      if (filter !== 'all' && currentStatus !== filter) return false;
      if (!q) return true;
      const orderNum = String(o.orderNumber || '').toLowerCase();
      const customer = String(o.user?.name || `${o.shippingAddress?.firstName || ''} ${o.shippingAddress?.lastName || ''}`).toLowerCase();
      const email = String(o.user?.email || o.contactEmail || '').toLowerCase();
      return orderNum.includes(q) || customer.includes(q) || email.includes(q);
    });
  }, [orders, filter, search]);

  return (
    <div className="admin-view">
      <h2 className="admin-view-title">{t('orders')} <span className="admin-count">{orders.length}</span></h2>

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
          value={filter}
          onChange={e => setFilter(e.target.value)}
          aria-label={t('status')}
          wrapperClassName="admin-filter field-sm"
          options={[
            { value: 'all', label: t('all_statuses') },
            ...ORDER_STATUSES.map(s => ({ value: s, label: label(s) })),
          ]}
        />
      </AdminToolbar>

      <AdminTable
        caption={t('orders')}
        loading={loading}
        rows={filtered}
        empty={t('admin_no_orders')}
        columns={[
          { key: 'orderNumber', header: '#', render: o => <strong className="order-num">#{o.orderNumber}</strong> },
          {
            key: 'customer', header: t('customer'),
            render: o => (
              <div>
                <strong>{o.user ? o.user.name : (o.shippingAddress ? `${o.shippingAddress.firstName} ${o.shippingAddress.lastName}` : 'Guest')}</strong>
                <br />
                <small className="admin-muted">{o.user?.email || o.contactEmail || ''}</small>
              </div>
            ),
          },
          { key: 'total', header: t('total'), render: o => `${(o.total || o.totalAmount || 0).toFixed(3)} KWD` },
          {
            key: 'status', header: t('status'),
            render: o => {
              const currentStatus = o.orderStatus || o.status || 'pending';
              const isDelivered = currentStatus === 'delivered';
              const isDisabled = isDelivered && !unlockedOrders[o._id];
              return (
                <select
                  className="status-select"
                  value={currentStatus}
                  disabled={isDisabled}
                  onChange={e => updateStatus(o._id, e.target.value)}
                  style={{ color: getStatusColor(currentStatus) }}
                >
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
                </select>
              );
            },
          },
          {
            key: 'driver', header: 'Driver',
            render: o => {
              const currentStatus = o.orderStatus || o.status || 'pending';
              const isDelivered = currentStatus === 'delivered';
              const isDisabled = isDelivered && !unlockedOrders[o._id];
              const assignedDriverId = o.deliveryPilot?._id || o.deliveryPilot || '';
              return (
                <select
                  className="status-select"
                  value={assignedDriverId}
                  disabled={isDisabled}
                  onChange={e => assignDriver(o._id, e.target.value)}
                  style={{ maxWidth: 140 }}
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
              const currentStatus = o.orderStatus || o.status || 'pending';
              const isDelivered = currentStatus === 'delivered';
              const isLocked = isDelivered && !unlockedOrders[o._id];
              const canTrack = o.deliveryPilot && (currentStatus === 'out_for_delivery' || currentStatus === 'handed_over');
              return (
                <div className="admin-row-actions">
                  {isLocked && (
                    <button className="admin-icon-btn" onClick={() => toggleUnlock(o._id)} title="Unlock Order">🔓</button>
                  )}
                  {canTrack && (
                    <button className="admin-icon-btn" onClick={() => setTrackOrder(o)} title="Track Driver">🚗</button>
                  )}
                  <button className="admin-icon-btn" onClick={() => setDetailOrder(o)} title="View Order Details">👁️</button>
                </div>
              );
            },
          },
        ]}
      />

      {/* Order Detail Modal */}
      {detailOrder && (
        <AdminModal open={true} onClose={() => setDetailOrder(null)} title={`Order #${detailOrder.orderNumber}`} wide>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24, background: 'var(--color-champagne)', padding: 16, borderRadius: 12 }}>
            <div>
              <strong>Customer:</strong>
              <div>{detailOrder.user ? detailOrder.user.name : (detailOrder.shippingAddress ? `${detailOrder.shippingAddress.firstName} ${detailOrder.shippingAddress.lastName}` : 'Guest')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{detailOrder.user?.email || detailOrder.contactEmail || 'N/A'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{detailOrder.shippingAddress?.phone || detailOrder.contactPhone || 'N/A'}</div>
            </div>
            <div>
              <strong>Payment & Delivery:</strong>
              <div>Method: {detailOrder.paymentMethod || 'COD'}</div>
              <div>Driver: {detailOrder.deliveryPilot ? (detailOrder.deliveryPilot.name || 'Assigned') : 'Unassigned'}</div>
            </div>
            <div>
              <strong>Shipping Address:</strong>
              {detailOrder.shippingAddress ? (
                <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                  {detailOrder.shippingAddress.addressLine1}<br />
                  {detailOrder.shippingAddress.city}, {detailOrder.shippingAddress.country}
                </div>
              ) : <div>No shipping address</div>}
            </div>
          </div>

          <h4>Items</h4>
          <table className="admin-table" style={{ margin: '12px 0 20px' }}>
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign: 'center' }}>Price</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(detailOrder.items || []).map((item, idx) => (
                <tr key={idx}>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={resolveImageUrl(item.image)} alt={item.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4 }} />
                    <span>{item.name}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{(item.price || 0).toFixed(3)}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{((item.price || 0) * (item.quantity || 1)).toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ textAlign: 'right', borderTop: '1px solid var(--border-light)', paddingTop: 12, fontSize: 15 }}>
            {detailOrder.promoCode?.code && (
              <div style={{ color: '#059669', fontStyle: 'italic', marginBottom: 4 }}>
                🏷️ Promo Code: {detailOrder.promoCode.code} (-{(detailOrder.promoCode.totalDiscount || detailOrder.discount || 0).toFixed(3)} KWD)
              </div>
            )}
            <div>Subtotal: {(detailOrder.subtotal || detailOrder.total || 0).toFixed(3)} KWD</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: 'var(--color-gold-text)' }}>
              Grand Total: {(detailOrder.total || 0).toFixed(3)} KWD
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
            <button className="btn btn--outline btn--sm" onClick={() => window.open(`/api/admin/receipt/${detailOrder._id}`, '_blank')}>📄 Receipt</button>
            {detailOrder.deliveryPilot && (
              <button className="btn btn--outline btn--sm" onClick={() => { const target = detailOrder; setDetailOrder(null); setTrackOrder(target); }}>🚗 Track Driver</button>
            )}
            <button className="btn btn--primary btn--sm" onClick={() => setDetailOrder(null)}>Close</button>
          </div>
        </AdminModal>
      )}

      {/* Track Driver Modal with LIGHT MAP THEME */}
      {trackOrder && (
        <AdminModal open={true} onClose={() => setTrackOrder(null)} title={`Track Driver — Order #${trackOrder.orderNumber}`} wide>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, background: 'var(--color-champagne)', padding: 12, borderRadius: 8, flexWrap: 'wrap' }}>
            <div><strong>Driver:</strong> {trackOrder.deliveryPilot?.name || 'Assigned Driver'}</div>
            <div><strong>Phone:</strong> {trackOrder.deliveryPilot?.phone || 'N/A'}</div>
            <div><strong>Status:</strong> {label(trackOrder.orderStatus || trackOrder.status)}</div>
          </div>

          {/* Map Container */}
          <div
            ref={mapContainerRef}
            style={{
              height: 380,
              width: '100%',
              borderRadius: 12,
              border: '1px solid var(--border-medium)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn--primary btn--sm" onClick={() => setTrackOrder(null)}>Close Map</button>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
