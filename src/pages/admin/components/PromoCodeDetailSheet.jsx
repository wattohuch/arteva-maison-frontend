import { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '../../../api/admin';
import { showToast } from '../../../components/ui/Toast';
import { resolveImageUrl } from '../../../utils/imageHelpers';
import { TrashIcon, SearchIcon } from '../../../components/ui/Icons';
import AppSheet from '../../../components/ui/AppSheet';

const kwd = (n) => `${(Number(n) || 0).toFixed(3)} KWD`;

export default function PromoCodeDetailSheet({ promo, onClose, onUpdated }) {
  const [details, setDetails] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & add product
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);

  const loadDetails = useCallback(async () => {
    if (!promo?._id) return;
    setLoading(true);
    try {
      const [resDetails, resStats] = await Promise.all([
        AdminAPI.getPromoCodeDetails(promo._id),
        AdminAPI.getPromoCodeStats(promo._id).catch(() => null),
      ]);
      setDetails(resDetails.data || promo);
      if (resStats?.data) setStats(resStats.data);
    } catch (err) {
      showToast(err.message || 'Failed to load promo code details', 'error');
    } finally {
      setLoading(false);
    }
  }, [promo]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // Search products for adding
  useEffect(() => {
    if (!searchQuery.trim()) {
      setAllProducts([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await AdminAPI.getProducts({ search: searchQuery, limit: 10 });
        setAllProducts(res.data || []);
      } catch {
        setAllProducts([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddProduct = async (productObj) => {
    try {
      setAddingId(productObj._id);
      const discountType = details.discountType || 'percentage';
      const discountValue = details.discountValue || 10;
      await AdminAPI.addProductsToPromo(details._id, [{
        product: productObj._id,
        discountType,
        discountValue,
      }]);
      showToast(`Added ${productObj.name} to promo code`, 'success');
      setSearchQuery('');
      setAllProducts([]);
      loadDetails();
      onUpdated?.();
    } catch (err) {
      showToast(err.message || 'Failed to add product to promo', 'error');
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveProduct = async (productId, productName) => {
    if (!confirm(`Remove ${productName} from this promo code?`)) return;
    try {
      await AdminAPI.removeProductFromPromo(details._id, productId);
      showToast(`Removed ${productName}`, 'success');
      loadDetails();
      onUpdated?.();
    } catch (err) {
      showToast(err.message || 'Failed to remove product', 'error');
    }
  };

  if (!promo) return null;
  const currentPromo = details || promo;
  const attachedProducts = currentPromo.products || [];

  return (
    <AppSheet
      open={!!promo}
      onClose={onClose}
      title={`Promo Code: ${currentPromo.code}`}
      subtitle={`Discount: ${currentPromo.discountType === 'percentage' ? `${currentPromo.discountValue}%` : kwd(currentPromo.discountValue)}`}
      footer={
        <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="promo-detail-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, padding: 12, background: 'var(--bg-card, #faf9f6)', borderRadius: 8, border: '1px solid var(--border-color, #e5e0d8)' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Status</span>
            <strong style={{ textTransform: 'capitalize', color: currentPromo.isActive ? '#16a34a' : '#ef4444' }}>
              {currentPromo.isActive ? '✅ Active' : '❌ Inactive / Expired'}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Min Order Amount</span>
            <strong>{kwd(currentPromo.minOrderAmount || 0)}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Usage Count</span>
            <strong>{currentPromo.usedCount || currentPromo.usageCount || 0} {currentPromo.usageLimit ? `/ ${currentPromo.usageLimit}` : '(Unlimited)'}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Expiration</span>
            <strong>{currentPromo.expiresAt ? new Date(currentPromo.expiresAt).toLocaleDateString() : 'Never'}</strong>
          </div>
        </div>

        {/* Stats Summary if available */}
        {stats?.stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, padding: 12, background: 'rgba(197, 160, 89, 0.08)', borderRadius: 8, border: '1px solid rgba(197, 160, 89, 0.2)' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Total Orders</span>
              <strong style={{ fontSize: '1.1rem' }}>{stats.stats.totalOrders || 0}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Attributed Revenue</span>
              <strong style={{ fontSize: '1.1rem', color: 'var(--color-gold-text, #a88a44)' }}>{kwd(stats.stats.totalRevenue || 0)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Total Discount Given</span>
              <strong style={{ fontSize: '1.1rem', color: '#16a34a' }}>{kwd(stats.stats.totalDiscountGiven || 0)}</strong>
            </div>
          </div>
        )}

        {/* Discounted Products Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>
              🛍️ Products Eligible for Discount ({attachedProducts.length})
            </h4>
          </div>

          {attachedProducts.length === 0 ? (
            <div style={{ padding: 16, background: 'rgba(59, 130, 246, 0.06)', borderRadius: 8, border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#1e40af' }}>
                🌐 <strong>Store-wide Discount:</strong> No specific products attached. This promo code applies to <strong>ALL products</strong> in your catalog at checkout!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {attachedProducts.map((pItem, idx) => {
                const prod = pItem.product || {};
                const origPrice = prod.price || 0;
                let discPrice = origPrice;
                if (currentPromo.discountType === 'percentage') {
                  discPrice = origPrice * (1 - (currentPromo.discountValue / 100));
                } else {
                  discPrice = Math.max(0, origPrice - currentPromo.discountValue);
                }

                return (
                  <div
                    key={prod._id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 10,
                      border: '1px solid var(--border-color, #e5e0d8)',
                      borderRadius: 8,
                      background: 'var(--bg-card, #fff)',
                    }}
                  >
                    <img
                      src={resolveImageUrl(prod.images?.[0] || prod.image)}
                      alt={prod.name || 'Product'}
                      style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-color, #1a1a1a)' }}>
                        {prod.name || 'Unnamed Product'}
                      </div>
                      <div style={{ fontSize: '0.8rem', display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{kwd(origPrice)}</span>
                        <strong style={{ color: '#16a34a' }}>{kwd(discPrice)}</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="admin-icon-btn admin-icon-danger"
                      onClick={() => handleRemoveProduct(prod._id, prod.name)}
                      title="Remove product from promo"
                    >
                      <TrashIcon size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add product search box */}
          <div style={{ padding: 12, background: 'var(--bg-card, #faf9f6)', borderRadius: 8, border: '1px solid var(--border-color, #e5e0d8)' }}>
            <h5 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>+ Add Specific Product to this Promo Code</h5>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="field-input"
                placeholder="Search products by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searching && (
                <span style={{ position: 'absolute', right: 10, top: 10, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Searching...</span>
              )}
            </div>

            {allProducts.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border-color, #ddd)', borderRadius: 6, background: '#fff' }}>
                {allProducts.map(p => (
                  <div
                    key={p._id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #eee' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img src={resolveImageUrl(p.images?.[0])} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                      <span style={{ fontSize: '0.85rem' }}>{p.name} ({kwd(p.price)})</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={addingId === p._id}
                      onClick={() => handleAddProduct(p)}
                    >
                      {addingId === p._id ? 'Adding...' : '+ Add'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppSheet>
  );
}
