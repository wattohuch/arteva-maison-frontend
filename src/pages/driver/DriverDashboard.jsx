import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { DriverAPI } from '../../api/driver';
import { formatDate, getStatusColor } from '../../utils/formatters';
import { showToast } from '../../components/ui/Toast';
import { API_BASE_URL } from '../../api/client';
import { resolveImageUrl, getProductImage } from '../../utils/imageHelpers';
import Loader from '../../components/ui/Loader';
import Toast from '../../components/ui/Toast';
import './DriverDashboard.css';

const TILE_SIZE = 256;

const kwd = (n) => `${(Number(n) || 0).toFixed(3)} KWD`;

/* ── Web-mercator tile helpers ── */
const lngToX = (lng, z) => ((lng + 180) / 360) * TILE_SIZE * 2 ** z;
const latToY = (lat, z) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE_SIZE * 2 ** z;
};

/**
 * Robust coordinate extractor supporting:
 * - { lat: 29.37, lng: 47.97 } or { lat: "29.37", lng: "47.97" } (numbers or strings)
 * - { latitude: 29.37, longitude: 47.97 }
 * - Array [lng, lat] or [lat, lng]
 */
const parseNum = (val) => {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return !isNaN(n) && isFinite(n) && n !== 0 ? n : null;
};

const extractCoords = (addressObj) => {
  if (!addressObj) return null;
  const c = addressObj.coordinates || addressObj;

  let lat = null;
  let lng = null;

  if (c && typeof c === 'object' && !Array.isArray(c)) {
    lat = parseNum(c.lat ?? c.latitude ?? addressObj.lat ?? addressObj.latitude);
    lng = parseNum(c.lng ?? c.longitude ?? addressObj.lng ?? addressObj.longitude);
  } else if (Array.isArray(c) && c.length >= 2) {
    const first = parseNum(c[0]);
    const second = parseNum(c[1]);
    if (first && second) {
      if (first > 40 && second < 35) {
        lng = first;
        lat = second;
      } else {
        lat = first;
        lng = second;
      }
    }
  }

  if (lat !== null && lng !== null) {
    return { lat, lng };
  }
  return null;
};

/**
 * OpenStreetMap mini-map component for driver location pinning.
 */
function MiniOrderMap({ rawCoords, street, city, state, country }) {
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);

  const parsed = useMemo(() => extractCoords({ coordinates: rawCoords }), [rawCoords]);

  useEffect(() => {
    if (parsed) {
      setCoords({ lat: parsed.lat, lng: parsed.lng, isPinned: true });
      return;
    }

    // Attempt geocoding address text if no explicit pin
    const addressQuery = [street, state, city, country || 'Kuwait'].filter(Boolean).join(', ');
    if (!addressQuery || addressQuery.trim() === 'Kuwait') {
      setCoords(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&countrycodes=kw&limit=1`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0 && isMounted) {
            const fetchedLat = parseFloat(data[0].lat);
            const fetchedLng = parseFloat(data[0].lon);
            if (parseNum(fetchedLat) && parseNum(fetchedLng)) {
              setCoords({ lat: fetchedLat, lng: fetchedLng, isPinned: false });
            }
          }
        }
      } catch (err) {
        console.warn('Geocoding error:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [parsed, street, state, city, country]);

  if (loading) {
    return (
      <div className="driver-mini-map-loading">
        <span className="driver-spinner-sm" /> Resolving location pin...
      </div>
    );
  }

  if (!coords) {
    return (
      <div className="driver-no-pin-box">
        <span style={{ fontSize: '20px' }}>📍</span>
        <div>
          <strong style={{ fontSize: '0.85rem', color: '#1e293b', display: 'block' }}>Delivery Location</strong>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {[street, state, city].filter(Boolean).join(', ') || 'Address specified'}
          </span>
        </div>
      </div>
    );
  }

  const zoom = coords.isPinned ? 16 : 14;
  const cx = lngToX(coords.lng, zoom);
  const cy = latToY(coords.lat, zoom);
  const width = 320;
  const height = 140;

  const originX = cx - width / 2;
  const originY = cy - height / 2;
  const startCol = Math.floor(originX / TILE_SIZE);
  const startRow = Math.floor(originY / TILE_SIZE);
  const cols = Math.ceil(width / TILE_SIZE) + 2;
  const rows = Math.ceil(height / TILE_SIZE) + 2;
  const max = 2 ** zoom;

  const tiles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const col = startCol + c;
      const row = startRow + r;
      if (row < 0 || row >= max) continue;
      const wrapped = ((col % max) + max) % max;
      tiles.push({
        key: `${zoom}/${wrapped}/${row}`,
        src: `https://tile.openstreetmap.org/${zoom}/${wrapped}/${row}.png`,
        left: col * TILE_SIZE - originX,
        top: row * TILE_SIZE - originY,
      });
    }
  }

  return (
    <div className="driver-mini-map">
      <div className="driver-mini-map-tiles">
        {tiles.map(tile => (
          <img
            key={tile.key}
            src={tile.src}
            alt=""
            width={TILE_SIZE}
            height={TILE_SIZE}
            loading="lazy"
            style={{ transform: `translate3d(${tile.left}px, ${tile.top}px, 0)` }}
          />
        ))}
      </div>
      <div className="driver-mini-map-pin" title={street || city}>
        <div className="driver-pin-icon">📍</div>
        <span className="driver-pin-shadow" />
      </div>
      <div className="driver-mini-map-badge">
        {coords.isPinned ? '📌 Customer Pinned Location' : '📍 ' + ([street, city].filter(Boolean).join(', ') || 'Address Area')}
      </div>
    </div>
  );
}

export default function DriverDashboard() {
  const { user, isLoggedIn, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');
  const [activeOrder, setActiveOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showItemsChecklist, setShowItemsChecklist] = useState(false);
  const fileInputRef = useRef(null);

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn || (user?.role !== 'driver' && user?.role !== 'admin')) {
      navigate('/account');
    }
  }, [isLoggedIn, user, navigate]);

  // Load assigned orders
  const loadOrders = useCallback(async () => {
    try {
      const res = await DriverAPI.getAssignedOrders();
      if (res.success) setOrders(res.data || []);
    } catch (err) {
      showToast('Failed to load assigned orders', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Auto-refresh every 20 seconds
  useEffect(() => {
    const interval = setInterval(loadOrders, 20000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const activeOrders = useMemo(() => 
    orders.filter(o => o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled'),
  [orders]);

  const outForDeliveryOrders = useMemo(() => 
    orders.filter(o => o.orderStatus === 'out_for_delivery'),
  [orders]);

  const historyOrders = useMemo(() => 
    orders.filter(o => o.orderStatus === 'delivered' || o.orderStatus === 'cancelled'),
  [orders]);

  const totalCodToCollect = useMemo(() => {
    return activeOrders
      .filter(o => o.paymentMethod === 'cod' || o.paymentStatus !== 'paid')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [activeOrders]);

  const displayOrders = useMemo(() => {
    if (tab === 'active') return activeOrders;
    if (tab === 'delivering') return outForDeliveryOrders;
    return historyOrders;
  }, [tab, activeOrders, outForDeliveryOrders, historyOrders]);

  const openOrder = (order) => {
    setActiveOrder(order);
    setShowItemsChecklist(false);
    setShowModal(true);
  };

  const startDelivery = async (orderId, orderNumber) => {
    if (!window.confirm(`Start delivering order #${orderNumber}? Customer will be notified.`)) return;
    setUpdatingStatus(true);
    try {
      await DriverAPI.updateStatus(orderId, 'out_for_delivery');
      showToast('Delivery started! Customer notified 🚀', 'success');
      setActiveOrder(prev => prev ? { ...prev, orderStatus: 'out_for_delivery' } : null);
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Failed to start delivery', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const markDelivered = async (orderId) => {
    setUpdatingStatus(true);
    try {
      await DriverAPI.updateStatus(orderId, 'delivered');
      showToast('Order delivered successfully! 🎉', 'success');
      setShowModal(false);
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Failed to update order status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const captureProof = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const uploadProof = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeOrder) return;
    setUpdatingStatus(true);
    try {
      const formData = new FormData();
      formData.append('photo', file, `proof_${activeOrder._id}_${Date.now()}.jpg`);
      const token = localStorage.getItem('arteva_token');
      const backendBase = API_BASE_URL;
      const res = await fetch(`${backendBase}/driver/orders/${activeOrder._id}/proof`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Upload failed');
      showToast('Order Delivered! Photo sent to customer 📸', 'success');
      setShowModal(false);
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Proof upload failed', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Google Maps navigation helper — exact pinned coordinates first, or full address search
  const getGoogleMapsUrl = (order) => {
    const parsed = extractCoords(order?.shippingAddress);
    if (parsed) {
      return `https://www.google.com/maps/search/?api=1&query=${parsed.lat},${parsed.lng}`;
    }
    const addr = [
      order.shippingAddress?.street,
      order.shippingAddress?.state ? `Block ${order.shippingAddress.state}` : '',
      order.shippingAddress?.city,
      order.shippingAddress?.country || 'Kuwait',
    ].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  };

  // Waze navigation helper
  const getWazeUrl = (order) => {
    const parsed = extractCoords(order?.shippingAddress);
    if (parsed) {
      return `https://waze.com/ul?ll=${parsed.lat},${parsed.lng}&navigate=yes`;
    }
    return getGoogleMapsUrl(order);
  };

  // WhatsApp link helper with prefilled message
  const getWhatsAppUrl = (order) => {
    const phone = order.shippingAddress?.phone || order.user?.phone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.startsWith('965') ? cleanPhone : `965${cleanPhone}`;
    const customerName = order.user?.name || order.shippingAddress?.fullName || 'Customer';
    const text = encodeURIComponent(
      `Hello ${customerName}! I am your ARTÉVA Maison delivery driver with order #${order.orderNumber}. I am on my way to deliver your items.`
    );
    return `https://wa.me/${waPhone}?text=${text}`;
  };

  const copyCoordinates = (lat, lng) => {
    if (!lat || !lng) return;
    const text = `${lat}, ${lng}`;
    navigator.clipboard.writeText(text);
    showToast(`Coordinates copied: ${text}`, 'success');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) return (
    <div className="driver-loading">
      <Loader text="Loading delivery dashboard..." />
    </div>
  );

  return (
    <div className="driver-dashboard">
      {/* Header */}
      <header className="driver-header">
        <div className="driver-header-left">
          <div className="driver-avatar">
            {(user?.name || 'D').charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="driver-name">{user?.name || 'Driver'}</h3>
            <span className="driver-role">🟢 Online Shift • ARTÉVA Driver</span>
          </div>
        </div>
        <div className="driver-header-right">
          <button type="button" className="driver-refresh-btn" onClick={loadOrders} title="Refresh orders">
            🔄
          </button>
          <button type="button" className="driver-logout-btn" onClick={handleLogout}>
            {t('logout')}
          </button>
        </div>
      </header>

      {/* Driver Stats */}
      <div className="driver-stats">
        <div className="driver-stat glass-card-component">
          <span className="driver-stat-num">{activeOrders.length}</span>
          <span className="driver-stat-label">Active Orders</span>
        </div>
        <div className="driver-stat glass-card-component">
          <span className="driver-stat-num">{historyOrders.filter(o => o.orderStatus === 'delivered').length}</span>
          <span className="driver-stat-label">Delivered Today</span>
        </div>
        <div className="driver-stat glass-card-component">
          <span className="driver-stat-num" style={{ color: '#059669', fontSize: '1.2rem' }}>
            {kwd(totalCodToCollect)}
          </span>
          <span className="driver-stat-label">COD Cash to Collect</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="driver-tabs">
        <button
          type="button"
          className={`driver-tab ${tab === 'active' ? 'active' : ''}`}
          onClick={() => setTab('active')}
        >
          Active ({activeOrders.length})
        </button>
        <button
          type="button"
          className={`driver-tab ${tab === 'delivering' ? 'active' : ''}`}
          onClick={() => setTab('delivering')}
        >
          Out for Delivery ({outForDeliveryOrders.length})
        </button>
        <button
          type="button"
          className={`driver-tab ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          Completed ({historyOrders.length})
        </button>
      </div>

      {/* Orders List */}
      <div className="driver-orders">
        {displayOrders.length === 0 ? (
          <div className="driver-empty-box">
            <p className="driver-empty">
              {tab === 'active'
                ? 'No active assigned deliveries right now.'
                : tab === 'delivering'
                ? 'No orders currently out for delivery.'
                : 'No completed orders in history yet.'}
            </p>
          </div>
        ) : displayOrders.map(order => {
          const statusColor = getStatusColor(order.orderStatus);
          const parsed = extractCoords(order.shippingAddress);
          const isCod = order.paymentMethod === 'cod' || order.paymentStatus !== 'paid';

          return (
            <div
              key={order._id}
              className="driver-order-card glass-card-component"
              onClick={() => openOrder(order)}
            >
              <div className="driver-order-header">
                <span className="driver-order-num">#{order.orderNumber}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {isCod ? (
                    <span className="driver-pay-badge cod">💵 COD: {kwd(order.total)}</span>
                  ) : (
                    <span className="driver-pay-badge paid">💳 PAID ONLINE</span>
                  )}
                  <span className="driver-order-badge" style={{ background: `${statusColor}20`, color: statusColor }}>
                    {(order.orderStatus || '').replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <div className="driver-order-info">
                <strong>👤 {order.user?.name || order.shippingAddress?.fullName || 'Customer'}</strong>
              </div>

              <div className="driver-order-info" style={{ marginTop: 2 }}>
                📍 <span>{order.shippingAddress?.street || 'Street'}, {order.shippingAddress?.city || 'Kuwait City'}</span>
                {order.shippingAddress?.state && <span style={{ color: '#64748b' }}> • Block {order.shippingAddress.state}</span>}
              </div>

              {/* Dynamic Mini Map */}
              <div style={{ marginTop: 10 }}>
                <MiniOrderMap
                  rawCoords={order.shippingAddress?.coordinates}
                  street={order.shippingAddress?.street}
                  state={order.shippingAddress?.state}
                  city={order.shippingAddress?.city}
                  country={order.shippingAddress?.country}
                />
              </div>

              {/* One-tap Quick Actions on Card */}
              <div className="driver-card-quick-actions" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className="driver-quick-btn nav-btn"
                  onClick={() => window.open(getGoogleMapsUrl(order), '_blank')}
                >
                  🗺️ Google Maps
                </button>
                <button
                  type="button"
                  className="driver-quick-btn call-btn"
                  onClick={() => window.open(`tel:${order.shippingAddress?.phone || order.user?.phone}`)}
                >
                  📞 Call
                </button>
                <button
                  type="button"
                  className="driver-quick-btn wa-btn"
                  onClick={() => window.open(getWhatsAppUrl(order), '_blank')}
                >
                  💬 WhatsApp
                </button>
              </div>

              <div className="driver-order-action-hint">
                Tap card to view full order details & delivery actions
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Detail Modal */}
      {showModal && activeOrder && (() => {
        const modalCoords = extractCoords(activeOrder.shippingAddress);
        return (
          <>
            <div className="driver-modal-overlay" onClick={() => setShowModal(false)} />
            <div className="driver-modal glass-card-component">
              <div className="driver-modal-header">
                <div>
                  <h3 style={{ margin: 0 }}>Order #{activeOrder.orderNumber}</h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {formatDate(activeOrder.createdAt)}
                  </span>
                </div>
                <button type="button" onClick={() => setShowModal(false)} className="driver-modal-close">✕</button>
              </div>

              <div className="driver-modal-body">
                {/* Payment status alert */}
                {(activeOrder.paymentMethod === 'cod' || activeOrder.paymentStatus !== 'paid') ? (
                  <div className="driver-alert cod">
                    💵 <strong>CASH ON DELIVERY (COD)</strong>
                    <div>Collect exact amount: <strong style={{ fontSize: '1.05rem', color: '#92400e' }}>{kwd(activeOrder.total)}</strong> from customer upon delivery.</div>
                  </div>
                ) : (
                  <div className="driver-alert paid">
                    💳 <strong>PAID ONLINE ({activeOrder.paymentMethod.toUpperCase()})</strong>
                    <div>Order is fully paid online. Do NOT collect money from customer.</div>
                  </div>
                )}

                {/* Customer Info */}
                <div className="driver-modal-section">
                  <strong>Customer Information</strong>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>
                    {activeOrder.user?.name || activeOrder.shippingAddress?.fullName || 'Customer'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.88rem', color: '#475569' }}>
                    📞 Phone: {activeOrder.shippingAddress?.phone || activeOrder.user?.phone || 'N/A'}
                  </p>
                  {activeOrder.user?.email && (
                    <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                      ✉️ Email: {activeOrder.user.email}
                    </p>
                  )}
                </div>

                {/* Delivery Address & Pinned Map */}
                <div className="driver-modal-section">
                  <strong>Delivery Address & Pinned Location</strong>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>
                    {activeOrder.shippingAddress?.street}, {activeOrder.shippingAddress?.city}, {activeOrder.shippingAddress?.country || 'Kuwait'}
                  </p>
                  {activeOrder.shippingAddress?.state && (
                    <p style={{ margin: '2px 0', fontSize: '0.84rem', color: '#475569' }}>
                      Block / Area: {activeOrder.shippingAddress.state}
                    </p>
                  )}

                  {/* Map Coordinates & Copy button */}
                  {modalCoords ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, background: '#f1f5f9', padding: '6px 10px', borderRadius: 6 }}>
                      <span style={{ fontSize: '0.82rem', color: '#334155', fontFamily: 'monospace' }}>
                        📌 {modalCoords.lat.toFixed(5)}, {modalCoords.lng.toFixed(5)}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                        onClick={() => copyCoordinates(modalCoords.lat, modalCoords.lng)}
                      >
                        📋 Copy
                      </button>
                    </div>
                  ) : null}

                  {/* Map Preview */}
                  <div style={{ marginTop: 10 }}>
                    <MiniOrderMap
                      rawCoords={activeOrder.shippingAddress?.coordinates}
                      street={activeOrder.shippingAddress?.street}
                      state={activeOrder.shippingAddress?.state}
                      city={activeOrder.shippingAddress?.city}
                      country={activeOrder.shippingAddress?.country}
                    />
                  </div>
                </div>

                {/* Delivery Notes */}
                {activeOrder.notes && (
                  <div className="driver-modal-section" style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: 12, borderRadius: 8 }}>
                    <strong style={{ color: '#b45309' }}>📝 Customer Delivery Notes</strong>
                    <p style={{ margin: '4px 0 0', color: '#92400e', fontSize: '0.88rem' }}>
                      {activeOrder.notes}
                    </p>
                  </div>
                )}

                {/* Navigation & Communication Grid */}
                <div className="driver-modal-actions">
                  <button
                    type="button"
                    className="driver-action-btn"
                    style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
                    onClick={() => window.open(getGoogleMapsUrl(activeOrder), '_blank')}
                  >
                    🗺️ Google Maps
                  </button>
                  <button
                    type="button"
                    className="driver-action-btn"
                    style={{ background: '#f0f9ff', color: '#0369a1', borderColor: '#bae6fd' }}
                    onClick={() => window.open(getWazeUrl(activeOrder), '_blank')}
                  >
                    🚗 Waze Navigation
                  </button>
                  <button
                    type="button"
                    className="driver-action-btn"
                    onClick={() => window.open(`tel:${activeOrder.shippingAddress?.phone || activeOrder.user?.phone}`)}
                  >
                    📞 Call Customer
                  </button>
                  <button
                    type="button"
                    className="driver-action-btn"
                    style={{ background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}
                    onClick={() => window.open(getWhatsAppUrl(activeOrder), '_blank')}
                  >
                    💬 WhatsApp Direct
                  </button>
                </div>

                {/* Package Items Checklist Accordion */}
                <div style={{ marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  <button
                    type="button"
                    style={{ width: '100%', padding: '10px 14px', background: '#f8fafc', border: 'none', textAlign: 'left', fontWeight: 600, fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setShowItemsChecklist(!showItemsChecklist)}
                  >
                    <span>📦 Package Contents ({activeOrder.items?.length || 0} items)</span>
                    <span>{showItemsChecklist ? '▲ Hide' : '▼ View Items'}</span>
                  </button>
                  {showItemsChecklist && (
                    <div style={{ padding: 12, background: '#fff' }}>
                      {(activeOrder.items || []).map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottom: i < activeOrder.items.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
                          {resolveImageUrl(item.image || getProductImage(item)) && (
                            <img
                              src={resolveImageUrl(item.image || getProductImage(item))}
                              alt=""
                              style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid #cbd5e1' }}
                            />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.name}</div>
                            {item.sku && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SKU: {item.sku}</div>}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
                            x{item.quantity}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Main Driver Status Actions */}
                {activeOrder.orderStatus === 'delivered' ? (
                  <div className="driver-completed-badge">
                    Order Delivery Completed ✅
                  </div>
                ) : activeOrder.orderStatus === 'out_for_delivery' ? (
                  <>
                    <button
                      type="button"
                      className="driver-main-btn finish"
                      onClick={captureProof}
                      disabled={updatingStatus}
                    >
                      {updatingStatus ? 'Uploading Proof...' : '📷 Take Photo & Complete Delivery'}
                    </button>
                    <button
                      type="button"
                      className="driver-main-btn secondary"
                      onClick={() => markDelivered(activeOrder._id)}
                      disabled={updatingStatus}
                    >
                      ✓ Mark Delivered (No Photo)
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={uploadProof}
                    />
                  </>
                ) : (
                  <button
                    type="button"
                    className="driver-main-btn"
                    onClick={() => startDelivery(activeOrder._id, activeOrder.orderNumber)}
                    disabled={updatingStatus}
                  >
                    {updatingStatus ? 'Updating Status...' : '🚀 Start Delivery (Out For Delivery)'}
                  </button>
                )}
              </div>
            </div>
          </>
        );
      })()}

      <Toast />
    </div>
  );
}
