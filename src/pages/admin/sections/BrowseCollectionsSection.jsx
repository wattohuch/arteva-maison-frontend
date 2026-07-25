import { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '../../../api/admin';
import { resolveImageUrl } from '../../../utils/imageHelpers';
import Loader from '../../../components/ui/Loader';
import AdminTable from '../components/AdminTable';
import AdminToolbar from '../components/AdminToolbar';

export default function BrowseCollectionsSection() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    AdminAPI.getProducts()
      .then(res => {
        const data = res.data || [];
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
      (p.nameAr && p.nameAr.toLowerCase().includes(q)) ||
      (p.category?.name || '').toLowerCase().includes(q)
    ));
  }, [search, products]);

  const toggleFeatured = async (id, checked) => {
    try {
      const formData = new FormData();
      formData.append('isCollectionFeatured', checked);
      await AdminAPI.updateProduct(id, formData);
      // Update local state
      setProducts(prev => prev.map(p => p._id === id ? { ...p, isCollectionFeatured: checked } : p));
    } catch {
      load(); // revert on error
    }
  };

  return (
    <div className="admin-view">
      <div className="admin-section-header">
        <h2 className="admin-view-title">Browse Collections</h2>
      </div>

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
            render: p => <img src={resolveImageUrl(p.images?.[0]?.url)} alt={p.name} className="admin-product-img" />,
          },
          { key: 'name', header: 'Product', render: p => <strong>{p.name}</strong> },
          { key: 'category', header: 'Category', render: p => p.category?.name || '—' },
          {
            key: 'featured', header: 'Collection Featured', align: 'center',
            render: p => (
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={p.isCollectionFeatured || false}
                  onChange={e => toggleFeatured(p._id, e.target.checked)}
                />
                <span className="admin-toggle-slider" />
              </label>
            ),
          },
        ]}
      />
    </div>
  );
}
