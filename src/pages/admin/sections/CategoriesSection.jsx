import { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '../../../api/admin';
import { resolveImageUrl } from '../../../utils/imageHelpers';
import Loader from '../../../components/ui/Loader';
import AdminTable from '../components/AdminTable';
import AdminToolbar from '../components/AdminToolbar';
import AdminModal from '../components/AdminModal';
import StatusPill from '../components/StatusPill';

export default function CategoriesSection() {
  const [categories, setCategories] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    AdminAPI.getCategories()
      .then(res => {
        const data = res.data || [];
        setCategories(data);
        setFiltered(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search) { setFiltered(categories); return; }
    const q = search.toLowerCase();
    setFiltered(categories.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.nameAr && c.nameAr.toLowerCase().includes(q)) ||
      (c.slug && c.slug.toLowerCase().includes(q))
    ));
  }, [search, categories]);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (cat) => { setEditing(cat); setModalOpen(true); };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category? Products using it will become uncategorized.')) return;
    try {
      await AdminAPI.deleteCategory(id);
      load();
    } catch { /* toast */ }
  };

  const handleMove = async (id, direction) => {
    const arr = [...categories];
    arr.forEach((c, i) => { c.sortOrder = i; });
    const idx = arr.findIndex(c => c._id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    // Swap
    [arr[idx].sortOrder, arr[swapIdx].sortOrder] = [arr[swapIdx].sortOrder, arr[idx].sortOrder];
    const items = arr.map(c => ({ id: c._id, sortOrder: c.sortOrder }));
    try {
      await AdminAPI.reorderCategories(items);
      load();
    } catch { /* toast */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const form = e.target;
    const formData = new FormData(form);
    formData.set('isActive', form.isActive.checked);

    try {
      if (editing) {
        await AdminAPI.updateCategory(editing._id, formData);
      } else {
        await AdminAPI.createCategory(formData);
      }
      setModalOpen(false);
      load();
    } catch { /* toast */ }
    setSaving(false);
  };

  return (
    <div className="admin-view">
      <div className="admin-section-header">
        <h2 className="admin-view-title">Categories <span className="admin-count">{categories.length}</span></h2>
        <button className="btn btn--primary btn--sm" onClick={openAdd}>+ Add Category</button>
      </div>

      <AdminToolbar>
        <input
          type="text"
          className="field-input admin-search"
          placeholder="Search categories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </AdminToolbar>

      <AdminTable
        loading={loading}
        empty="No categories found"
        rows={filtered}
        columns={[
          {
            key: 'image', header: 'Image', width: '60px',
            render: c => <img src={resolveImageUrl(c.image)} alt={c.name} className="admin-product-img" />,
          },
          { key: 'name', header: 'Name (EN)', render: c => <strong>{c.name}</strong> },
          { key: 'nameAr', header: 'Name (AR)', render: c => c.nameAr || '—' },
          {
            key: 'slug', header: 'Slug',
            render: c => <code style={{ background: 'rgba(74,59,44,0.06)', padding: '2px 6px', borderRadius: 3, fontSize: 12 }}>{c.slug}</code>,
          },
          {
            key: 'status', header: 'Status',
            render: c => <StatusPill status={c.isActive ? 'confirmed' : 'cancelled'} />,
          },
          {
            key: 'actions', header: 'Actions', align: 'right',
            render: (c, i) => (
              <div className="admin-row-actions">
                <button className="admin-icon-btn" onClick={() => handleMove(c._id, 'up')} title="Move Up" disabled={i === 0}>⬆️</button>
                <button className="admin-icon-btn" onClick={() => handleMove(c._id, 'down')} title="Move Down" disabled={i === categories.length - 1}>⬇️</button>
                <button className="admin-icon-btn" onClick={() => openEdit(c)} title="Edit">✏️</button>
                <button className="admin-icon-btn admin-icon-danger" onClick={() => handleDelete(c._id)} title="Delete">🗑️</button>
              </div>
            ),
          },
        ]}
      />

      <AdminModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={handleSubmit} className="admin-modal-form">
          <div className="admin-form-grid">
            <label className="admin-form-label">
              Name (EN) *
              <input name="name" className="field-input" required defaultValue={editing?.name || ''} />
            </label>
            <label className="admin-form-label">
              Name (AR)
              <input name="nameAr" className="field-input" defaultValue={editing?.nameAr || ''} dir="rtl" />
            </label>
            <label className="admin-form-label" style={{ gridColumn: '1 / -1' }}>
              Description
              <textarea name="description" className="field-input" rows={2} defaultValue={editing?.description || ''} />
            </label>
          </div>
          <label className="admin-form-label" style={{ marginTop: 16 }}>
            Category Image
            <input name="image" type="file" accept="image/*" className="admin-file" />
          </label>
          {editing?.image && (
            <img src={resolveImageUrl(editing.image)} alt="" style={{ maxWidth: '100%', height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, cursor: 'pointer' }}>
            <input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} />
            Active
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
