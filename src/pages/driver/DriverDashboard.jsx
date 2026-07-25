import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { DriverAPI } from '../../api/driver';
import { formatDate, timeAgo, getStatusColor } from '../../utils/formatters';
import { showToast } from '../../components/ui/Toast';
import { API_BASE_URL } from '../../api/client';
import Loader from '../../components/ui/Loader';
import Toast from '../../components/ui/Toast';
import './DriverDashboard.css';

const DEFAULT_LAT = 29.3759;
const DEFAULT_LNG = 47.9774;

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
  const fileInputRef = useRef(null);

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn || (user?.role !== 'driver' && user?.role !== 'admin')) {
      navigate('/account');
    }
  }, [isLoggedIn, user, navigate]);

  // Load orders
  const loadOrders = useCallback(async () => {
    try {
      const res = await DriverAPI.getAssignedOrders();
      if (res.success) setOrders(res.data || []);
    } catch (err) { showToast('Failed to load orders', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const activeOrders = orders.filter(o => o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled');
  const historyOrders = orders.filter(o => o.orderStatus === 'delivered' || o.orderStatus === 'cancelled');
  const displayOrders = tab === 'active' ? activeOrders : historyOrders;

  const openOrder = (order) => {
    setActiveOrder(order);
    setShowModal(true);
  };

  const startDelivery = async (orderId) => {
    if (!window.confirm('Start delivering this order? Customer will be notified.')) return;
    setUpdatingStatus(true);
    try {
      await DriverAPI.updateStatus(orderId, 'out_for_delivery');
      showToast('Delivery started! 🚀', 'success');
      setActiveOrder(prev => prev ? { ...prev, orderStatus: 'out_for_delivery' } : null);
      loadOrders();
    } catch (err) { showToast(err.message || 'Failed to start delivery', 'error'); }
    finally { setUpdatingStatus(false); }
  };

  const markDelivered = async (orderId) => {
    setUpdatingStatus(true);
    try {
      await DriverAPI.updateStatus(orderId, 'delivered');
      showToast('Order delivered! 🎉', 'success');
      setShowModal(false);
      loadOrders();
    } catch (err) { showToast(err.message || 'Failed', 'error'); }
    finally { setUpdatingStatus(false); }
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
      showToast('Delivered + photo sent to customer! 🎉', 'success');
      setShowModal(false);
      loadOrders();
    } catch (err) { showToast(err.message || 'Upload failed', 'error'); }
    finally { setUpdatingStatus(false); }
  };

  const getNavigateUrl = (order) => {
    const c = order.shippingAddress?.coordinates;
    if (c && c.lat && c.lng && !(c.lat === 0 && c.lng === 0)) {
      return `https://maps.google.com/?q=${c.lat},${c.lng}`;
    }
    return `https://maps.google.com/?q=${encodeURIComponent(order.shippingAddress.street + ', ' + order.shippingAddress.city)}`;
  };

  const handleLogout = () => { logout(); navigate('/'); };

  if (loading) return (
    <div className="driver-loading"><Loader text="Loading orders..." /></div>
  );

  return (
    <div className="driver-dashboard">
      {/* Header */}
      <header className="driver-header">
        <div className="driver-header-left">
          <div className="driver-avatar">{(user?.name || 'D').charAt(0).toUpperCase()}</div>
          <div>
            <h3 className="driver-name">{user?.name}</h3>
            <span className="driver-role">{t('driver')}</span>
          </div>
        </div>
        <button className="driver-logout-btn" onClick={handleLogout}>{t('logout')}</button>
      </header>

      {/* Stats */}
      <div className="driver-stats">
        <div className="driver-stat glass-card-component">
          <span className="driver-stat-num">{activeOrders.length}</span>
          <span className="driver-stat-label">{t('active')}</span>
        </div>
        <div className="driver-stat glass-card-component">
          <span className="driver-stat-num">{historyOrders.filter(o => o.orderStatus === 'delivered').length}</span>
          <span className="driver-stat-label">{t('delivered')}</span>
        </div>
        <div className="driver-stat glass-card-component">
          <span className="driver-stat-num">{orders.length}</span>
          <span className="driver-stat-label">{t('total')}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="driver-tabs">
        <button className={`driver-tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
          {t('active')} ({activeOrders.length})
        </button>
        <button className={`driver-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          {t('history')} ({historyOrders.length})
        </button>
      </div>

      {/* Orders */}
      <div className="driver-orders">
        {displayOrders.length === 0 ? (
          <p className="driver-empty">{tab === 'active' ? 'No active orders.' : 'No past orders.'}</p>
        ) : displayOrders.map(order => {
          const statusColor = getStatusColor(order.orderStatus);
          return (
            <div key={order._id} className="driver-order-card glass-card-component" onClick={() => openOrder(order)}>
              <div className="driver-order-header">
                <span className="driver-order-num">#{order.orderNumber}</span>
                <span className="driver-order-badge" style={{ background: `${statusColor}18`, color: statusColor }}>
                  {(order.orderStatus || '').replace(/_/g, ' ')}
                </span>
              </div>
              <div className="driver-order-info">
                <span>👤 {order.user?.name || order.shippingAddress?.firstName || 'Customer'}</span>
              </div>
              <div className="driver-order-info">
                <span>📍 {order.shippingAddress?.street}, {order.shippingAddress?.city}</span>
              </div>
              {tab === 'active' && <div className="driver-order-action-hint">Tap to view details & actions</div>}
            </div>
          );
        })}
      </div>

      {/* Order Detail Modal */}
      {showModal && activeOrder && (
        <>
          <div className="driver-modal-overlay" onClick={() => setShowModal(false)} />
          <div className="driver-modal glass-card-component">
            <div className="driver-modal-header">
              <h3>#{activeOrder.orderNumber}</h3>
              <button onClick={() => setShowModal(false)} className="driver-modal-close">✕</button>
            </div>

            <div className="driver-modal-body">
              <div className="driver-modal-section">
                <strong>Customer</strong>
                <p>{activeOrder.user?.name || 'Customer'}</p>
              </div>
              <div className="driver-modal-section">
                <strong>Address</strong>
                <p>{activeOrder.shippingAddress?.street}, {activeOrder.shippingAddress?.city}</p>
              </div>
              {activeOrder.notes && (
                <div className="driver-modal-section">
                  <strong>Notes</strong>
                  <p>{activeOrder.notes}</p>
                </div>
              )}

              <div className="driver-modal-actions">
                <button className="driver-action-btn" onClick={() => window.open(`tel:${activeOrder.shippingAddress?.phone || activeOrder.user?.phone}`)}>
                  📞 Call
                </button>
                <button className="driver-action-btn" onClick={() => window.open(getNavigateUrl(activeOrder))}>
                  🗺️ Navigate
                </button>
              </div>

              {activeOrder.orderStatus === 'delivered' ? (
                <div className="driver-completed-badge">Order Completed ✅</div>
              ) : activeOrder.orderStatus === 'out_for_delivery' ? (
                <>
                  <button className="driver-main-btn finish" onClick={captureProof} disabled={updatingStatus}>
                    {updatingStatus ? 'Uploading...' : '📷 Take Photo & Mark Delivered'}
                  </button>
                  <button className="driver-main-btn secondary" onClick={() => markDelivered(activeOrder._id)} disabled={updatingStatus}>
                    ✓ Mark Delivered (No Photo)
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={uploadProof} />
                </>
              ) : (
                <button className="driver-main-btn" onClick={() => startDelivery(activeOrder._id)} disabled={updatingStatus}>
                  {updatingStatus ? 'Updating...' : '🚀 Start Delivery'}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <Toast />
    </div>
  );
}
