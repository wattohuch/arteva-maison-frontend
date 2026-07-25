import { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { AdminAPI } from '../../../api/admin';
import { resolveImageUrl } from '../../../utils/imageHelpers';
import { showToast } from '../../../components/ui/Toast';
import Button from '../../../components/ui/Button';
import { Input, Textarea, FieldRow } from '../../../components/ui/Field';
import { TrashIcon, PlusIcon, SearchIcon } from '../../../components/ui/Icons';
import AdminTable from '../components/AdminTable';
import AdminToolbar from '../components/AdminToolbar';
import AdminModal from '../components/AdminModal';

const EMPTY_FORM = {
  name: '', nameAr: '', price: '', compareAtPrice: '', stock: '10',
  description: '', descriptionAr: '', sku: '', category: '',
  sizeText: '', isFeatured: false, isNewArrival: false, isComingSoon: false,
};

export default function ProductsSection() {
  const { t } = useI18n();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedAddCats, setSelectedAddCats] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      AdminAPI.getProducts(),
      AdminAPI.getCategories().catch(() => ({ data: [] })),
    ]).then(([prodRes, catRes]) => {
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
    }).catch(err => {
      showToast(err.message || t('admin_load_failed'), 'error');
    }).finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const toggleAddCat = (catId) => {
    setSelectedAddCats(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedAddCats([]);
    setNewImages([]);
    setExistingImages([]);
    setEditing(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          formData.append(k, v);
        }
      });

      selectedAddCats.forEach(id => formData.append('additionalCategories', id));
      newImages.forEach(f => formData.append('images', f));

      if (editing) {
        formData.append('existingImages', JSON.stringify(existingImages));
        await AdminAPI.updateProduct(editing._id, formData);
        showToast(t('admin_product_updated'), 'success');
      } else {
        await AdminAPI.createProduct(formData);
        showToast(t('admin_product_created'), 'success');
      }

      setShowForm(false);
      resetForm();
      loadData();
    } catch (err) {
      showToast(err.message || t('admin_save_failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || '',
      nameAr: p.nameAr || '',
      price: p.price?.toString() || '',
      compareAtPrice: p.compareAtPrice?.toString() || '',
      stock: p.stock?.toString() || '0',
      description: p.description || '',
      descriptionAr: p.descriptionAr || '',
      sku: p.sku || '',
      category: p.category?._id || p.category || '',
      sizeText: p.sizeText || '',
      isFeatured: p.isFeatured || false,
      isNewArrival: p.isNewArrival || false,
      isComingSoon: p.isComingSoon || false,
    });
    const addCats = p.additionalCategories ? p.additionalCategories.map(c => typeof c === 'object' ? c._id : c) : [];
    setSelectedAddCats(addCats);
    setExistingImages(p.images || []);
    setNewImages([]);
    setShowForm(true);
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`${t('admin_confirm_delete')} — ${product.name}`)) return;
    const previous = products;
    setProducts(prev => prev.filter(p => p._id !== product._id));
    try {
      await AdminAPI.deleteProduct(product._id);
      showToast(t('admin_deleted'), 'success');
    } catch (err) {
      setProducts(previous);
      showToast(err.message || t('admin_delete_failed'), 'error');
    }
  };

  const handleMove = async (id, direction) => {
    const arr = [...products];
    arr.forEach((p, idx) => { p.sortOrder = idx; });
    const idx = arr.findIndex(p => p._id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    [arr[idx].sortOrder, arr[swapIdx].sortOrder] = [arr[swapIdx].sortOrder, arr[idx].sortOrder];
    const items = arr.map(p => ({ id: p._id, sortOrder: p.sortOrder }));
    try {
      await AdminAPI.reorderProducts(items);
      loadData();
    } catch { /* toast */ }
  };

  const removeExistingImage = (index) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.trim().toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.nameAr && p.nameAr.toLowerCase().includes(q)) ||
      (p.category?.name && p.category.name.toLowerCase().includes(q))
    );
  }, [products, search]);

  return (
    <div className="admin-view">
      <div className="admin-section-header">
        <h2 className="admin-view-title">
          {t('products')} <span className="admin-count">{products.length}</span>
        </h2>
        <Button
          variant="primary" size="sm"
          onClick={() => { setShowForm(v => !v); resetForm(); }}
        >
          {showForm ? t('admin_cancel') : <><PlusIcon size={15} /> {t('admin_add_product')}</>}
        </Button>
      </div>

      <AdminToolbar>
        <Input
          type="search"
          placeholder="Search products by name or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<SearchIcon size={17} />}
          wrapperClassName="admin-search field-sm"
        />
      </AdminToolbar>

      {showForm && (
        <form onSubmit={handleSave} className="admin-form">
          <h3 className="admin-section-title">
            {editing ? t('admin_edit_product') : t('admin_add_product')}
          </h3>

          <FieldRow>
            <Input label={t('admin_product_name_en')} name="name" required
              value={form.name} onChange={handleChange} />
            <Input label={t('admin_product_name_ar')} name="nameAr" dir="rtl"
              value={form.nameAr} onChange={handleChange} />
          </FieldRow>

          <FieldRow>
            <Input label={t('admin_price') + ' (KWD)'} name="price" type="number" step="0.001" min="0" required
              value={form.price} onChange={handleChange} />
            <Input label="Compare At Price (KWD)" name="compareAtPrice" type="number" step="0.001" min="0"
              value={form.compareAtPrice} onChange={handleChange} />
            <Input label="Stock Quantity" name="stock" type="number" min="0" required
              value={form.stock} onChange={handleChange} />
          </FieldRow>

          <FieldRow>
            <div className="field">
              <label className="field-label">Category</label>
              <select name="category" className="field-input" value={form.category} onChange={handleChange}>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <Input label="SKU" name="sku" value={form.sku} onChange={handleChange} />
            <Input label="Dimensions / Size Text" name="sizeText" placeholder="e.g. 25cm x 15cm"
              value={form.sizeText} onChange={handleChange} />
          </FieldRow>

          {categories.length > 0 && (
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field-label">Additional Categories</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {categories.map(c => (
                  <label key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'var(--color-champagne)', fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedAddCats.includes(c._id)}
                      onChange={() => toggleAddCat(c._id)}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 20, margin: '16px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} />
              Featured Product
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" name="isNewArrival" checked={form.isNewArrival} onChange={handleChange} />
              New Arrival
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" name="isComingSoon" checked={form.isComingSoon} onChange={handleChange} />
              Coming Soon
            </label>
          </div>

          <Textarea label={t('admin_description_en')} name="description" rows={3}
            value={form.description} onChange={handleChange} />
          <Textarea label={t('admin_description_ar')} name="descriptionAr" rows={3} dir="rtl"
            value={form.descriptionAr} onChange={handleChange} />

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field-label">Existing Images</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                {existingImages.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img src={resolveImageUrl(img.url)} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-light)' }} />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(idx)}
                      style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyCenter: 'center' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload New Images */}
          <div className="field" style={{ marginBottom: 20 }}>
            <label className="field-label" htmlFor="admin-images">{t('admin_images')}</label>
            <input
              id="admin-images" type="file" multiple accept="image/*"
              className="admin-file"
              onChange={e => setNewImages([...e.target.files])}
            />
            <p className="field-message field-hint">{t('admin_first_image_primary')}</p>
          </div>

          <Button type="submit" variant="primary" loading={saving}>
            {editing ? t('admin_update') : t('admin_create')}
          </Button>
        </form>
      )}

      <AdminTable
        caption={t('products')}
        loading={loading}
        rows={filtered}
        empty={t('admin_no_products')}
        columns={[
          {
            key: 'image', header: t('admin_image'), width: 60,
            render: p => (
              <img
                src={resolveImageUrl(p.images?.[0]?.url || p.image)}
                alt={p.name} loading="lazy"
                className="admin-product-img"
                onClick={() => setViewProduct(p)}
                style={{ cursor: 'pointer' }}
              />
            ),
          },
          {
            key: 'name', header: t('admin_product_name_en'),
            render: p => <strong onClick={() => setViewProduct(p)} style={{ cursor: 'pointer' }}>{p.name}</strong>,
          },
          {
            key: 'category', header: 'Category',
            render: p => p.category?.name || '—',
          },
          { key: 'price', header: t('admin_price'), render: p => `${p.price?.toFixed(3) ?? '—'} KWD` },
          { key: 'stock', header: 'Stock', render: p => p.stock ?? '—' },
          {
            key: 'actions', header: t('admin_actions'), align: 'end',
            render: (p, i) => (
              <div className="admin-row-actions">
                <button type="button" className="admin-icon-btn" onClick={() => handleMove(p._id, 'up')} title="Move Up" disabled={i === 0}>⬆️</button>
                <button type="button" className="admin-icon-btn" onClick={() => handleMove(p._id, 'down')} title="Move Down" disabled={i === filtered.length - 1}>⬇️</button>
                <button type="button" className="admin-icon-btn" onClick={() => handleEdit(p)} title="Edit">✏️</button>
                <button
                  type="button"
                  className="admin-icon-btn admin-icon-danger"
                  onClick={() => handleDelete(p)}
                  title="Delete"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            ),
          },
        ]}
      />

      {/* Product Quick View Modal */}
      {viewProduct && (
        <AdminModal open={true} onClose={() => setViewProduct(null)} title={viewProduct.name}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {viewProduct.images?.map((img, i) => (
              <img key={i} src={resolveImageUrl(img.url)} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
            <div><strong>Category:</strong> {viewProduct.category?.name || 'Uncategorized'}</div>
            <div><strong>Price:</strong> {viewProduct.price?.toFixed(3)} KWD</div>
            <div><strong>Compare At:</strong> {viewProduct.compareAtPrice ? `${viewProduct.compareAtPrice.toFixed(3)} KWD` : 'None'}</div>
            <div><strong>Stock:</strong> {viewProduct.stock}</div>
            <div><strong>SKU:</strong> {viewProduct.sku || 'N/A'}</div>
            <div><strong>Dimensions:</strong> {viewProduct.sizeText || 'N/A'}</div>
          </div>
          {viewProduct.description && (
            <div style={{ marginTop: 16 }}>
              <strong>Description:</strong>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{viewProduct.description}</p>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
            <button className="btn btn--primary btn--sm" onClick={() => setViewProduct(null)}>Close</button>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
