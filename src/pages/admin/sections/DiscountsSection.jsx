import { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '../../../api/admin';
import { resolveImageUrl } from '../../../utils/imageHelpers';
import Loader from '../../../components/ui/Loader';
import AdminTable from '../components/AdminTable';
import AdminToolbar from '../components/AdminToolbar';

export default function DiscountsSection() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    AdminAPI.getProducts()
      .then(res => {
        const data = res.data || res.products || [];
        setProducts(data);
        setFiltered(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search) { setFiltered(products); return; }
    const q = search.toLowerCase();
    setFiltered(products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.nameAr && p.nameAr.toLowerCase().includes(q))
    ));
  }, [search, products]);

  const showDiscountPrompt = (product) => {
    const currentPrice = product.price || 0;
    const input = prompt(
      `Set discounted price for "${product.name}"\n\nCurrent price: ${currentPrice.toFixed(3)} KWD\n\nEnter new discounted price (KWD):`
    );
    if (input === null) return;
    const newPrice = parseFloat(input);
    if (isNaN(newPrice) || newPrice <= 0) {
      alert('Please enter a valid price');
      return;
    }
    if (newPrice >= currentPrice) {
      alert(`Discounted price must be less than current price (${currentPrice.toFixed(3)})`);
      return;
    }
    applyDiscount(product._id, newPrice, currentPrice);
  };

  const applyDiscount = async (productId, discountedPrice, originalPrice) => {
    try {
      await AdminAPI.applyDiscount(productId, discountedPrice, originalPrice);
      load();
    } catch {
      alert('Failed to apply discount');
    }
  };

  const removeDiscount = async (product) => {
    if (!confirm('Remove discount from this product? Price will be restored to the compare-at price.')) return;
    const originalPrice = product.compareAtPrice || product.price;
    try {
      await AdminAPI.applyDiscount(product._id, originalPrice, 0);
      load();
    } catch {
      alert('Failed to remove discount');
    }
  };

  return (
    <div className="admin-view">
      <h2 className="admin-view-title">Discounts & Pricing</h2>

      <AdminToolbar>
        <input
          type="text"
          className="field-input admin-search"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </AdminToolbar>

      <AdminTable
        loading={loading}
        empty="No products found"
        rows={filtered}
        columns={[
          {
            key: 'image', header: 'Image', width: '60px',
            render: p => {
              const imgSrc = p.images?.length ? resolveImageUrl(p.images[0]?.url) : '';
              return <img src={imgSrc} alt={p.name} className="admin-product-img" />;
            },
          },
          {
            key: 'name', header: 'Product',
            render: p => (
              <div>
                <strong>{p.name}</strong>
                {p.nameAr && <><br /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.nameAr}</span></>}
              </div>
            ),
          },
          {
            key: 'original', header: 'Original Price',
            render: p => {
              const hasDiscount = p.compareAtPrice > 0 && p.compareAtPrice > p.price;
              return hasDiscount
                ? <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{p.compareAtPrice.toFixed(3)} KWD</span>
                : <span>{(p.price || 0).toFixed(3)} KWD</span>;
            },
          },
          {
            key: 'discounted', header: 'Sale Price',
            render: p => {
              const hasDiscount = p.compareAtPrice > 0 && p.compareAtPrice > p.price;
              return hasDiscount
                ? <span style={{ color: '#ef4444', fontWeight: 700 }}>{p.price.toFixed(3)} KWD</span>
                : <span style={{ color: 'var(--text-muted)' }}>—</span>;
            },
          },
          {
            key: 'pct', header: 'Discount',
            render: p => {
              const hasDiscount = p.compareAtPrice > 0 && p.compareAtPrice > p.price;
              if (!hasDiscount) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
              const pct = Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100);
              return (
                <span style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                  -{pct}%
                </span>
              );
            },
          },
          {
            key: 'actions', header: '', align: 'right',
            render: p => {
              const hasDiscount = p.compareAtPrice > 0 && p.compareAtPrice > p.price;
              return hasDiscount
                ? <button className="admin-icon-btn admin-icon-danger" onClick={() => removeDiscount(p)} title="Remove discount">✕</button>
                : <button className="admin-icon-btn" onClick={() => showDiscountPrompt(p)} title="Add discount">🏷️</button>;
            },
          },
        ]}
      />
    </div>
  );
}
