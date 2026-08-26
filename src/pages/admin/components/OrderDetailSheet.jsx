import { useState, useEffect } from 'react';
import { resolveCustomer as buyerOf } from '../../../utils/receiptCustomer';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../contexts/I18nContext';
import { useAuth } from '../../../contexts/AuthContext';
import { AdminAPI } from '../../../api/admin';
import { formatDate, getStatusColor } from '../../../utils/formatters';
import { showToast } from '../../../components/ui/Toast';
import { resolveImageUrl } from '../../../utils/imageHelpers';
import { TrashIcon, ReceiptIcon } from '../../../components/ui/Icons';
import AppSheet from '../../../components/ui/AppSheet';

const ORDER_STATUSES = [
  'pending', 'confirmed', 'processing', 'packed',
  'handed_over', 'out_for_delivery', 'delivered', 'cancelled',
];

const label = (s) => (s || '').replace(/_/g, ' ');
const kwd = (n) => `${(Number(n) || 0).toFixed(3)} KWD`;

export default function OrderDetailSheet({ order, onClose, onUpdated, drivers = [] }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentOrder, setCurrentOrder] = useState(order);
  const [unlocked, setUnlocked] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setCurrentOrder(order);
    setUnlocked(false);
  }, [order]);

  if (!currentOrder) return null;

  const canDelete = user?.role === 'owner' || user?.role === 'superuser';
  const address = currentOrder.shippingAddress || {};
  const currentStatus = currentOrder.orderStatus || 'pending';
  const isLocked = currentStatus === 'delivered' && !unlocked;

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true);
      await AdminAPI.updateOrderStatus(currentOrder._id, newStatus);
      const updated = { ...currentOrder, orderStatus: newStatus };
      setCurrentOrder(updated);
      showToast(`Status updated to ${label(newStatus)}`, 'success');
      onUpdated?.(updated);
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignDriver = async (driverId) => {
    try {
      setUpdating(true);
      await AdminAPI.assignDriver(currentOrder._id, driverId);
      const selectedDriver = drivers.find(d => d._id === driverId);
      const updated = { ...currentOrder, deliveryPilot: selectedDriver || driverId };
      setCurrentOrder(updated);
      showToast('Driver assigned successfully', 'success');
      onUpdated?.(updated);
    } catch (err) {
      showToast(err.message || 'Failed to assign driver', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const hasCoords = address.coordinates && (address.coordinates.lat || address.coordinates.latitude);
  const mapLat = address.coordinates?.lat || address.coordinates?.latitude;
  const mapLng = address.coordinates?.lng || address.coordinates?.longitude;

  return (
    <AppSheet
      open={!!currentOrder}
      onClose={onClose}
      title={`Order #${currentOrder.orderNumber}`}
      subtitle={`${currentOrder.orderSource === 'manual' ? 'Manual Receipt' : 'Online Order'} · ${formatDate(currentOrder.createdAt)}`}
      headerAction={
        isLocked ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setUnlocked(true)}
            title="Unlock order status editing"
          >
            🔓 Unlock
          </button>
        ) : null
      }
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
          {currentOrder.orderSource === 'manual' && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => { onClose(); navigate('/admin/receipt-generator'); }}
            >
              <ReceiptIcon size={15} /> Edit Receipt
            </button>
          )}
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div className="admin-order-detail-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Quick controls bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 12, background: 'var(--bg-card, #faf9f6)', borderRadius: 8, border: '1px solid var(--border-color, #e5e0d8)' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Order Status</label>
            <select
              className="field-input"
              value={currentStatus}
              disabled={isLocked || updating}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{ color: getStatusColor(currentStatus), fontWeight: 600, width: '100%' }}
            >
              {ORDER_STATUSES.map(s => (
                <option key={s} value={s}>{label(s)}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Assigned Driver</label>
            <select
              className="field-input"
              value={currentOrder.deliveryPilot?._id || currentOrder.deliveryPilot || ''}
              disabled={isLocked || updating}
              onChange={(e) => handleAssignDriver(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">Select Driver</option>
              {drivers.map(d => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Customer & Shipping Info */}
        <div className="ord-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div className="ord-detail-block" style={{ padding: 12, border: '1px solid var(--border-color, #e5e0d8)', borderRadius: 8 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--color-gold-text, #a88a44)' }}>👤 Customer Details</h4>
            <p style={{ margin: '0 0 4px 0', fontWeight: 600 }}>{buyerOf(currentOrder).name || 'Guest Customer'}</p>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{buyerOf(currentOrder).email || 'No email provided'}</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>📞 {address.phone || currentOrder.user?.phone || 'No phone provided'}</p>
          </div>

          <div className="ord-detail-block" style={{ padding: 12, border: '1px solid var(--border-color, #e5e0d8)', borderRadius: 8 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--color-gold-text, #a88a44)' }}>📍 Shipping Address</h4>
            <p style={{ margin: '0 0 4px 0', fontWeight: 600 }}>{address.label ? `[${address.label}] ` : ''}{address.street || 'Address not specified'}</p>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {[address.city, address.state, address.zipCode, address.country || 'Kuwait'].filter(Boolean).join(', ')}
            </p>
            {hasCoords && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapLat},${mapLng}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.8rem', color: 'var(--color-gold, #c5a059)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}
              >
                🗺️ View Location Pin on Google Maps
              </a>
            )}
          </div>

          <div className="ord-detail-block" style={{ padding: 12, border: '1px solid var(--border-color, #e5e0d8)', borderRadius: 8 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--color-gold-text, #a88a44)' }}>💳 Payment & Promo</h4>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem' }}><strong>Method:</strong> {currentOrder.paymentMethod ? currentOrder.paymentMethod.toUpperCase() : '—'}</p>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem' }}><strong>Payment Status:</strong> <span style={{ textTransform: 'capitalize' }}>{currentOrder.paymentStatus || 'pending'}</span></p>
            {currentOrder.promoCode?.code && (
              <div style={{ marginTop: 8, padding: '4px 8px', background: 'rgba(197, 160, 89, 0.1)', borderRadius: 4, border: '1px solid rgba(197, 160, 89, 0.3)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-gold-text, #a88a44)' }}>🏷️ Promo Code: {currentOrder.promoCode.code}</span>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Discount applied: −{kwd(currentOrder.promoCode.totalDiscount)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Products List with Pictures */}
        <div>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>🛍️ Ordered Products ({currentOrder.items?.length || 0})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(currentOrder.items || []).map((item, i) => (
              <div
                key={item._id || i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 10,
                  border: '1px solid var(--border-color, #e5e0d8)',
                  borderRadius: 8,
                  background: item.isRefunded ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                }}
              >
                <img
                  src={resolveImageUrl(item.image)}
                  alt={item.name}
                  style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-color, #ddd)' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-color, #1a1a1a)' }}>{item.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {kwd(item.price)} × {item.quantity} {item.variant ? `(${item.variant})` : ''}
                  </div>
                  {item.isRefunded && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>Refunded</span>
                  )}
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-color)' }}>
                  {kwd(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary & Financials */}
        <div style={{ background: 'var(--bg-card, #faf9f6)', padding: 14, borderRadius: 8, border: '1px solid var(--border-color, #e5e0d8)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span>Subtotal</span>
            <span>{kwd(currentOrder.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span>Delivery Fee</span>
            <span>{kwd(currentOrder.shippingCost || 0)}</span>
          </div>
          {currentOrder.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#16a34a' }}>
              <span>Promo Discount</span>
              <span>−{kwd(currentOrder.discount)}</span>
            </div>
          )}
          {currentOrder.refundAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#ef4444' }}>
              <span>Refunded</span>
              <span>−{kwd(currentOrder.refundAmount)}</span>
            </div>
          )}
          <hr style={{ border: 0, borderTop: '1px dashed var(--border-color, #ccc)', margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700 }}>
            <span>Total Amount</span>
            <span style={{ color: 'var(--color-gold-text, #a88a44)' }}>{kwd(currentOrder.total)}</span>
          </div>
        </div>
      </div>
    </AppSheet>
  );
}
