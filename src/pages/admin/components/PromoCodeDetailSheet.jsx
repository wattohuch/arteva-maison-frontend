import { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '../../../api/admin';
import { showToast } from '../../../components/ui/Toast';
import { resolveImageUrl } from '../../../utils/imageHelpers';
import { TrashIcon, SearchIcon, CheckIcon } from '../../../components/ui/Icons';
import AppSheet from '../../../components/ui/AppSheet';

const kwd = (n) => `${(Number(n) || 0).toFixed(3)} KWD`;

export default function PromoCodeDetailSheet({ promo, onClose, onUpdated }) {
  const [details, setDetails] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Category & Product search state
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [isAddingAll, setIsAddingAll] = useState(false);

  // Editing state for attached products
  const [editingValues, setEditingValues] = useState({});
  const [savingProductId, setSavingProductId] = useState(null);

  // Load Categories on mount
  useEffect(() => {
    AdminAPI.getCategories()
      .then(res => setCategories(res.data || res || []))
      .catch(() => setCategories([]));
  }, []);

  const loadDetails = useCallback(async () => {
    if (!promo?._id) return;
    setLoading(true);
    try {
      const [resDetails, resStats] = await Promise.all([
        AdminAPI.getPromoCodeDetails(promo._id),
        AdminAPI.getPromoCodeStats(promo._id).catch(() => null),
      ]);
      const det = resDetails.data || promo;
      setDetails(det);
      if (resStats?.data) setStats(resStats.data);

      // Initialize editing state for products
      const editState = {};
      (det.products || []).forEach(pItem => {
        const pId = pItem.product?._id || pItem.product;
        editState[pId] = {
          discountType: pItem.discountType || det.discountType || 'percentage',
          discountValue: pItem.discountValue !== undefined ? pItem.discountValue : (det.discountValue || 0),
          maxDiscountedQuantity: pItem.maxDiscountedQuantity || '',
        };
      });
      setEditingValues(editState);
    } catch (err) {
      showToast(err.message || 'Failed to load promo code details', 'error');
    } finally {
      setLoading(false);
    }
  }, [promo]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // Search & Filter products for adding
  const fetchProductsToSelect = useCallback(async () => {
    setSearching(true);
    try {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedCategory) params.category = selectedCategory;
      params.limit = 50;

      const res = await AdminAPI.getProducts(params);
      setAllProducts(res.data || []);
    } catch {
      setAllProducts([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProductsToSelect();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchProductsToSelect]);

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
      loadDetails();
      onUpdated?.();
    } catch (err) {
      showToast(err.message || 'Failed to add product to promo', 'error');
    } finally {
      setAddingId(null);
    }
  };

  const handleSelectAllProducts = async () => {
    if (allProducts.length === 0) return;
    setIsAddingAll(true);
    try {
      const discountType = details.discountType || 'percentage';
      const discountValue = details.discountValue || 10;
      const productsPayload = allProducts.map(p => ({
        product: p._id,
        discountType,
        discountValue,
      }));

      await AdminAPI.addProductsToPromo(details._id, productsPayload);
      showToast(`Added all ${allProducts.length} products to promo code`, 'success');
      loadDetails();
      onUpdated?.();
    } catch (err) {
      showToast(err.message || 'Failed to add all products to promo', 'error');
    } finally {
      setIsAddingAll(false);
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

  const handleSaveProductCustomValue = async (productId, productName) => {
    const edit = editingValues[productId];
    if (!edit) return;
    setSavingProductId(productId);
    try {
      await AdminAPI.addProductsToPromo(details._id, [{
        product: productId,
        discountType: edit.discountType,
        discountValue: Number(edit.discountValue) || 0,
        maxDiscountedQuantity: edit.maxDiscountedQuantity ? Number(edit.maxDiscountedQuantity) : null,
      }]);
      showToast(`Updated settings for ${productName}`, 'success');
      loadDetails();
      onUpdated?.();
    } catch (err) {
      showToast(err.message || 'Failed to update product settings', 'error');
    } finally {
      setSavingProductId(null);
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, padding: 12, background: 'var(--bg-card, #faf9f6)', borderRadius: 8, border: '1px solid var(--border-color, #e5e0d8)' }}>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Status</span>
            <strong style={{ textTransform: 'capitalize', color: currentPromo.isActive ? '#16a34a' : '#ef4444' }}>
              {currentPromo.isActive ? '✅ Active' : '❌ Inactive'}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Min Order Amount</span>
            <strong>{kwd(currentPromo.minOrderAmount || 0)}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Usage Count</span>
            <strong>{currentPromo.usedCount || currentPromo.usageCount || 0} {currentPromo.usageLimit ? `/ ${currentPromo.usageLimit}` : '(Unlimited)'}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Expiration</span>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {attachedProducts.map((pItem, idx) => {
                const prod = pItem.product || {};
                const pId = prod._id || pItem.product;
                const origPrice = prod.price || 0;
                const edit = editingValues[pId] || {
                  discountType: pItem.discountType || currentPromo.discountType || 'percentage',
                  discountValue: pItem.discountValue !== undefined ? pItem.discountValue : (currentPromo.discountValue || 0),
                  maxDiscountedQuantity: pItem.maxDiscountedQuantity || '',
                };

                let discPrice = origPrice;
                if (edit.discountType === 'percentage') {
                  discPrice = origPrice * (1 - (Number(edit.discountValue) / 100));
                } else {
                  discPrice = Math.max(0, origPrice - Number(edit.discountValue));
                }

                return (
                  <div
                    key={pId || idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      padding: 12,
                      border: '1px solid var(--border-color, #e5e0d8)',
                      borderRadius: 8,
                      background: 'var(--bg-card, #fff)',
                    }}
                  >
                    {/* Top Row: Product Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img
                        src={resolveImageUrl(prod.images?.[0] || prod.image)}
                        alt={prod.name || 'Product'}
                        style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }}
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
                        onClick={() => handleRemoveProduct(pId, prod.name)}
                        title="Remove product from promo"
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>

                    {/* Bottom Controls: Individual Discount & Max Usage Editing */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', background: '#faf9f6', padding: '8px 10px', borderRadius: 6, fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Discount:</label>
                        <input
                          type="number"
                          step="0.1"
                          style={{ width: 70, padding: '3px 6px', fontSize: '0.8rem' }}
                          value={edit.discountValue}
                          onChange={e => setEditingValues(prev => ({
                            ...prev,
                            [pId]: { ...prev[pId], discountValue: e.target.value }
                          }))}
                        />
                        <select
                          style={{ padding: '3px 6px', fontSize: '0.8rem' }}
                          value={edit.discountType}
                          onChange={e => setEditingValues(prev => ({
                            ...prev,
                            [pId]: { ...prev[pId], discountType: e.target.value }
                          }))}
                        >
                          <option value="percentage">%</option>
                          <option value="fixed">KWD</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Max Uses/Prod:</label>
                        <input
                          type="number"
                          placeholder="Unlimited"
                          style={{ width: 85, padding: '3px 6px', fontSize: '0.8rem' }}
                          value={edit.maxDiscountedQuantity}
                          onChange={e => setEditingValues(prev => ({
                            ...prev,
                            [pId]: { ...prev[pId], maxDiscountedQuantity: e.target.value }
                          }))}
                        />
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: '0.75rem' }}
                        disabled={savingProductId === pId}
                        onClick={() => handleSaveProductCustomValue(pId, prod.name)}
                      >
                        {savingProductId === pId ? 'Saving...' : 'Save Settings'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add product search & category filter box */}
          <div style={{ padding: 12, background: 'var(--bg-card, #faf9f6)', borderRadius: 8, border: '1px solid var(--border-color, #e5e0d8)' }}>
            <h5 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', color: 'var(--text-color)' }}>+ Add Products by Category / Search</h5>
            
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {/* Category selector */}
              <select
                className="field-input"
                style={{ flex: '1 1 150px', fontSize: '0.85rem' }}
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                ))}
              </select>

              {/* Search input */}
              <input
                type="text"
                className="field-input"
                style={{ flex: '2 1 200px', fontSize: '0.85rem' }}
                placeholder="Search products by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Select All Button */}
            {allProducts.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '4px 0' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Found {allProducts.length} matching products
                </span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={isAddingAll}
                  onClick={handleSelectAllProducts}
                >
                  {isAddingAll ? 'Adding All...' : `+ Select All ${allProducts.length} Products`}
                </button>
              </div>
            )}

            {searching && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '6px 0' }}>Searching products...</div>
            )}

            {allProducts.length > 0 && (
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border-color, #ddd)', borderRadius: 6, background: '#fff' }}>
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
