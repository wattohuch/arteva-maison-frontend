import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useI18n } from '../contexts/I18nContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { OrdersAPI } from '../api/orders';
import { formatDate, getStatusColor } from '../utils/formatters';
import { TruckIcon } from '../components/ui/Icons';
import { PinMark } from '../components/ui/PaymentMarks';
import { API_BASE_URL } from '../api/client';
import { LuxuryLoader } from '../components/ui/loading';
import { showToast } from '../components/ui/Toast';
import Toast from '../components/ui/Toast';
import './OrderTrackingPage.css';

const TILE_SIZE = 256;
const STATUS_STEPS = ['placed', 'confirmed', 'processing', 'packed', 'handed_over', 'out_for_delivery', 'delivered'];

const lngToX = (lng, z) => ((lng + 180) / 360) * TILE_SIZE * 2 ** z;
const latToY = (lat, z) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE_SIZE * 2 ** z;
};

const parseNum = (val) => {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return !isNaN(n) && isFinite(n) && n !== 0 ? n : null;
};

const extractCoords = (input) => {
  if (!input) return null;
  const targets = [];
  if (typeof input === 'object') {
    if (input.shippingAddress?.coordinates) targets.push(input.shippingAddress.coordinates);
    if (input.shippingAddress?.location) targets.push(input.shippingAddress.location);
    if (input.coordinates) targets.push(input.coordinates);
    if (input.location) targets.push(input.location);
    if (input.shippingAddress) targets.push(input.shippingAddress);
    if (Array.isArray(input.user?.addresses)) {
      for (const addr of input.user.addresses) {
        if (addr.coordinates) targets.push(addr.coordinates);
      }
    }
    targets.push(input);
  }

  for (let c of targets) {
    if (!c) continue;
    let lat = null, lng = null;
    if (typeof c === 'object' && !Array.isArray(c)) {
      lat = parseNum(c.lat ?? c.latitude);
      lng = parseNum(c.lng ?? c.longitude);
    } else if (Array.isArray(c) && c.length >= 2) {
      const p1 = parseNum(c[0]), p2 = parseNum(c[1]);
      if (p1 !== null && p2 !== null) {
        if (p1 > 40 && p2 < 35) { lng = p1; lat = p2; }
        else { lat = p1; lng = p2; }
      }
    }
    if (lat !== null && lng !== null) return { lat, lng };
  }
  return null;
};

const getItemSku = (item, index) => {
  if (!item) return `ART-${String((index || 0) + 1).padStart(3, '0')}`;
  if (item.sku && String(item.sku).trim() !== '' && String(item.sku).toUpperCase() !== 'N/A') return String(item.sku).trim();
  if (item.product && typeof item.product === 'object') {
    if (item.product.sku && String(item.product.sku).trim() !== '' && String(item.product.sku).toUpperCase() !== 'N/A') return String(item.product.sku).trim();
    if (item.product.code && String(item.product.code).trim() !== '') return String(item.product.code).trim();
    if (item.product.productNumber && String(item.product.productNumber).trim() !== '') return String(item.product.productNumber).trim();
    if (item.product._id) return `ART-${String(item.product._id).slice(-6).toUpperCase()}`;
  }
  if (item.product && typeof item.product === 'string') return `ART-${item.product.slice(-6).toUpperCase()}`;
  if (item._id) return `ART-${String(item._id).slice(-6).toUpperCase()}`;
  return `ART-${String((index || 0) + 1).padStart(3, '0')}`;
};

/** Widest zoom (16) down to (10) that still fits both points in the viewport. */
function fitZoom(a, b, width, height) {
  for (let z = 16; z >= 10; z--) {
    const dx = Math.abs(lngToX(a.lng, z) - lngToX(b.lng, z));
    const dy = Math.abs(latToY(a.lat, z) - latToY(b.lat, z));
    if (dx < width * 0.66 && dy < height * 0.66) return z;
  }
  return 10;
}

/** Straight-line distance in km — enough for "how far away is he". */
function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/**
 * OpenStreetMap tiles with up to two markers on them: where the order is
 * going, and where the driver is right now. The tile maths is the same
 * projection the admin map uses; drawing it by hand avoids pulling Leaflet
 * (and its CSS) into the storefront bundle for one card.
 */
function TrackingMap({ destination, driver, height = 240 }) {
  const boxRef = useRef(null);
  const [width, setWidth] = useState(340);

  // The marker offsets are computed in pixels, so the map has to know how wide
  // it actually is — a hardcoded width drifts on every screen but one.
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points = [destination, driver].filter(Boolean);
  const zoom = points.length === 2 ? fitZoom(destination, driver, width, height) : 15;

  const projected = points.map(p => ({ x: lngToX(p.lng, zoom), y: latToY(p.lat, zoom) }));
  const cx = projected.reduce((sum, p) => sum + p.x, 0) / projected.length;
  const cy = projected.reduce((sum, p) => sum + p.y, 0) / projected.length;

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

  const at = (p) => ({
    left: lngToX(p.lng, zoom) - originX,
    top: latToY(p.lat, zoom) - originY,
  });

  return (
    <div ref={boxRef} className="tracking-map" style={{ height }}>
      <div className="tracking-map-tiles">
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

      {destination && (
        <span className="tracking-marker tracking-marker-dest" style={at(destination)}>
          <span className="tracking-marker-badge"><PinMark width="18" height="18" /></span>
        </span>
      )}

      {driver && (
        <span className="tracking-marker tracking-marker-driver" style={at(driver)}>
          <span className="tracking-marker-pulse" />
          <span className="tracking-marker-badge"><TruckIcon width="18" height="18" /></span>
        </span>
      )}
    </div>
  );
}

function MiniTrackingMap({ order }) {
  const parsed = useMemo(() => extractCoords(order), [order]);

  if (!parsed) {
    const addressStr = [
      order?.shippingAddress?.street,
      order?.shippingAddress?.city,
      order?.shippingAddress?.country || 'Kuwait'
    ].filter(Boolean).join(', ');

    return (
      <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <span style={{ fontSize: 24 }}>📍</span>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b', marginTop: 4 }}>
          Delivery Address: {addressStr || 'Kuwait'}
        </div>
      </div>
    );
  }

  const zoom = 15;
  const cx = lngToX(parsed.lng, zoom);
  const cy = latToY(parsed.lat, zoom);
  const width = 340;
  const height = 150;

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
    <div style={{ position: 'relative', width: '100%', height: 160, borderRadius: 12, overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {tiles.map(tile => (
          <img
            key={tile.key}
            src={tile.src}
            alt=""
            width={TILE_SIZE}
            height={TILE_SIZE}
            loading="lazy"
            style={{ position: 'absolute', transform: `translate3d(${tile.left}px, ${tile.top}px, 0)` }}
          />
        ))}
      </div>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -100%)', zIndex: 10, textAlign: 'center' }}>
        <div style={{ fontSize: 32, filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.3))' }}>📍</div>
      </div>
      <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: '0.76rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>📌 Customer Pinned Location</span>
        <span style={{ fontFamily: 'monospace' }}>({parsed.lat.toFixed(4)}, {parsed.lng.toFixed(4)})</span>
      </div>
    </div>
  );
}

export default function OrderTrackingPage() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const { format } = useCurrency();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [driverPos, setDriverPos] = useState(null);
  const [trackingOpen, setTrackingOpen] = useState(false);

  const socketRef = useRef(null);

  const loadOrderData = useCallback(async () => {
    try {
      const res = await OrdersAPI.getById(id);
      setOrder(res.data || res);
    } catch (err) {
      setError(err.message || t('order_not_found_error'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadOrderData();
  }, [loadOrderData]);

  // Real-Time Socket.io Connection
  useEffect(() => {
    if (!id) return;

    const backendOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
    const socket = io(backendOrigin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join_order_room', id);
      if (order?.orderNumber) {
        socket.emit('join_order_room', order.orderNumber);
      }
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    const handleOrderUpdate = (data) => {
      showToast(`📦 Live Update: Order status is now ${data.status || data.orderStatus || 'updated'}!`, 'info');
      loadOrderData();
    };

    socket.on('driver_order_update', handleOrderUpdate);
    socket.on('order_status_update', handleOrderUpdate);
    socket.on('order_updated', handleOrderUpdate);

    // The driver's app pushes its position into the order room every few
    // seconds. Moving the marker is all this needs — refetching the order on
    // each ping would hammer the API for a value the event already carries.
    socket.on('delivery_location_update', (data) => {
      const lat = parseNum(data?.lat);
      const lng = parseNum(data?.lng);
      if (lat !== null && lng !== null) setDriverPos({ lat, lng });
    });

    return () => {
      socket.disconnect();
    };
  }, [id, order?.orderNumber, loadOrderData]);

  // Last known position, so the map is not empty between two live pings.
  useEffect(() => {
    if (driverPos) return;
    const stored = extractCoords(order?.deliveryLocation)
      || extractCoords(order?.deliveryPilot?.currentLocation);
    if (stored) setDriverPos(stored);
  }, [order, driverPos]);

  if (loading) {
    return (
      <div className="page-loading">
        <LuxuryLoader size="inline" title={t('loading_tracking')} subtitle={t('please_wait')} />
      </div>
    );
  }
  if (error) return <div className="section container" style={{ textAlign: 'center', padding: '80px 0' }}><p style={{ color: '#CD5C5C' }}>{error}</p></div>;
  if (!order) return null;

  const currentStatus = (order.orderStatus || order.status || 'pending').toLowerCase().replace(/\s+/g, '_');
  const isCancelled = currentStatus === 'cancelled';
  const currentStepIndex = STATUS_STEPS.indexOf(currentStatus);
  const statusColor = getStatusColor(currentStatus);

  const driver = order.deliveryPilot;
  // Plain call rather than useMemo — the early returns above mean a hook here
  // would not run on every render.
  const destination = extractCoords(order);
  const driverName = driver?.name || 'Assigned Driver';
  const driverPhone = driver?.phone || order.shippingAddress?.phone || '';

  const getWhatsAppUrl = () => {
    const clean = driverPhone.replace(/[^0-9]/g, '');
    const waPhone = clean.startsWith('965') ? clean : `965${clean}`;
    const text = encodeURIComponent(`Hello! I am inquiring about my ARTÉVA order #${order.orderNumber}.`);
    return `https://wa.me/${waPhone}?text=${text}`;
  };

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
          <h1 style={{ margin: 0 }}>{t('order_status_title')}</h1>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: socketConnected ? '#059669' : '#d97706', background: socketConnected ? '#ecfdf5' : '#fffbeb', padding: '4px 10px', borderRadius: 20, border: '1px solid currentColor' }}>
            {socketConnected ? '🟢 Live Socket Tracking' : '🟡 Connecting Live Socket...'}
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
          {t('order_number')} #{order.orderNumber} • Placed on {formatDate(order.createdAt)}
        </p>

        {/* Live Status Progress Header */}
        <div className="glass-card-component" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <div className="tracking-status-header">
            <div>
              <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>{t('current_status_label')}</span>
              <h3 style={{ color: statusColor, textTransform: 'capitalize' }}>
                {t(`status_${currentStatus}`) || currentStatus.replace(/_/g, ' ')}
              </h3>
            </div>
            <span className="tracking-live-badge" style={{ background: isCancelled ? '#CD5C5C' : '#2E8B57' }}>
              {isCancelled ? '✕' : '●'} {isCancelled ? t('status_cancelled') : t('live_status')}
            </span>
          </div>

          {/* Progress Steps Bar */}
          {!isCancelled && (
            <div className="tracking-steps">
              {STATUS_STEPS.map((step, i) => {
                const isActive = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                return (
                  <div key={step} className={`tracking-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}>
                    <div className="tracking-step-dot">
                      {isActive ? '✓' : (i + 1)}
                    </div>
                    <span className="tracking-step-label">{t(`status_${step}`) || step.replace(/_/g, ' ')}</span>
                    {i < STATUS_STEPS.length - 1 && <div className={`tracking-step-line ${isActive ? 'active' : ''}`} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Assigned Driver Card */}
        {driver && (
          <div className="glass-card-component" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-6)', background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#166534', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem' }}>
                  {driverName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🚚 Assigned Delivery Driver
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                    {driverName}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {driverPhone && (
                  <button
                    type="button"
                    style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer' }}
                    onClick={() => window.open(`tel:${driverPhone}`)}
                  >
                    📞 Call Driver
                  </button>
                )}
                <button
                  type="button"
                  style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer' }}
                  onClick={() => window.open(getWhatsAppUrl(), '_blank')}
                >
                  💬 WhatsApp
                </button>
              </div>
            </div>

            {/* Live tracking. Collapsed by default — the map is only worth its
                tiles once the order is actually moving. */}
            <button
              type="button"
              className={`track-driver-btn ${trackingOpen ? 'is-open' : ''}`}
              onClick={() => setTrackingOpen(open => !open)}
              aria-expanded={trackingOpen}
            >
              <TruckIcon width="18" height="18" />
              {trackingOpen ? t('hide_driver_tracking') : t('track_driver')}
              {driverPos && destination && (
                <span className="track-driver-distance">
                  {haversineKm(driverPos, destination).toFixed(1)} km
                </span>
              )}
            </button>

            {trackingOpen && (
              driverPos || destination ? (
                <div className="track-driver-panel">
                  <TrackingMap destination={destination} driver={driverPos} />
                  <div className="tracking-legend">
                    <span><i className="tracking-legend-dot is-driver" />{t('driver')}</span>
                    <span><i className="tracking-legend-dot is-dest" />{t('shipping_address')}</span>
                    {!driverPos && <span className="tracking-legend-note">{t('driver_location_pending')}</span>}
                  </div>
                </div>
              ) : (
                <p className="tracking-legend-note">{t('driver_location_pending')}</p>
              )
            )}
          </div>
        )}

        {/* Interactive Pinned Location Map */}
        <div className="glass-card-component" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
          <h3 style={{ marginBottom: 'var(--space-3)' }}>📍 Pinned Delivery Destination</h3>
          <MiniTrackingMap order={order} />
        </div>

        {/* Order Package Items & SKUs */}
        <div className="glass-card-component" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>📦 {t('items')} & SKUs ({order.items?.length || 0})</h3>
          {(order.items || []).map((item, i) => {
            const name = lang === 'ar' && item.product?.nameAr ? item.product.nameAr : (item.product?.name || item.name || 'Item');
            const sku = getItemSku(item, i);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) 0', borderBottom: i < order.items.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <img
                  src={item.product?.images?.[0]?.url || item.image || '/assets/images/products/placeholder.png'}
                  alt={name}
                  style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 'var(--radius-sm)', background: 'var(--bg-sand)', border: '1px solid #cbd5e1' }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', margin: 0 }}>{name}</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Qty: ×{item.quantity}</span>
                    <span style={{ background: '#f1f5f9', color: '#334155', fontWeight: 700, fontSize: '0.74rem', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', border: '1px solid #cbd5e1' }}>
                      SKU: {sku}
                    </span>
                  </div>
                </div>
                <span style={{ fontWeight: 600, color: 'var(--color-gold)', fontSize: 'var(--fs-sm)' }}>
                  {format(item.price * item.quantity)}
                </span>
              </div>
            );
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--space-4)', fontWeight: 700, fontSize: 'var(--fs-lg)', borderTop: '2px solid #e2e8f0', marginTop: 8 }}>
            <span>{t('total')}</span>
            <span style={{ color: 'var(--color-gold)' }}>{format(order.totalAmount || order.total || 0)}</span>
          </div>
        </div>

        {/* Shipping Information */}
        {order.shippingAddress && (
          <div className="glass-card-component" style={{ padding: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 'var(--space-3)' }}>{t('shipping_address')}</h3>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              <strong>{order.shippingAddress.fullName || order.user?.name || 'Customer'}</strong><br />
              {order.shippingAddress.street}<br />
              {order.shippingAddress.city}{order.shippingAddress.state ? `, Block ${order.shippingAddress.state}` : ''}<br />
              {order.shippingAddress.country || 'Kuwait'}<br />
              📞 {order.shippingAddress.phone || order.user?.phone}
            </p>
          </div>
        )}
      </div>

      <Toast />
    </div>
  );
}
