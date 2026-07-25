import { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '../../../api/admin';
import { resolveImageUrl } from '../../../utils/imageHelpers';
import Loader from '../../../components/ui/Loader';
import AdminTable from '../components/AdminTable';
import AdminToolbar from '../components/AdminToolbar';
import AdminModal from '../components/AdminModal';

export default function HeroSlidesSection() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    AdminAPI.getHeroSlides()
      .then(res => setSlides(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditingSlide(null); setModalOpen(true); };
  const openEdit = (slide) => { setEditingSlide(slide); setModalOpen(true); };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this slide?')) return;
    try {
      await AdminAPI.deleteHeroSlide(id);
      load();
    } catch { /* toast handled globally */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const form = e.target;
    const formData = new FormData(form);
    formData.set('isActive', form.isActive.checked);

    if (!editingSlide && !form.image.files[0]) {
      alert('Image is required for new slides');
      setSaving(false);
      return;
    }

    try {
      if (editingSlide) {
        await AdminAPI.updateHeroSlide(editingSlide._id, formData);
      } else {
        await AdminAPI.createHeroSlide(formData);
      }
      setModalOpen(false);
      load();
    } catch { /* toast */ }
    setSaving(false);
  };

  if (loading) return <div className="admin-loading"><Loader /></div>;

  return (
    <div className="admin-view">
      <div className="admin-section-header">
        <h2 className="admin-view-title">Hero Slides <span className="admin-count">{slides.length}</span></h2>
        <button className="btn btn--primary btn--sm" onClick={openAdd}>+ Add Slide</button>
      </div>

      {slides.length === 0 ? (
        <div className="admin-empty">No hero slides yet. Click + Add Slide to create one.</div>
      ) : (
        <div className="admin-hero-grid">
          {slides.map(slide => (
            <div key={slide._id} className="admin-hero-card">
              <div
                className="admin-hero-card-img"
                style={{ backgroundImage: `url('${resolveImageUrl(slide.image)}')` }}
              />
              <div className="admin-hero-card-body">
                <h3 className="admin-hero-card-title">{slide.title || 'Untitled Slide'}</h3>
                <p className="admin-hero-card-sub">{slide.subtitle || 'No subtitle'}</p>
                <div className="admin-hero-card-footer">
                  <span className={`admin-status-pill ${slide.isActive ? 'tone-green' : ''}`} style={slide.isActive ? { '--pill': '#3A6C4F' } : {}}>
                    {slide.isActive ? 'Active' : 'Inactive'} • Order: {slide.order}
                  </span>
                  <div className="admin-row-actions">
                    <button className="admin-icon-btn" onClick={() => openEdit(slide)} title="Edit">✏️</button>
                    <button className="admin-icon-btn admin-icon-danger" onClick={() => handleDelete(slide._id)} title="Delete">🗑️</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminModal open={modalOpen} onClose={() => setModalOpen(false)} title={editingSlide ? 'Edit Hero Slide' : 'Add Hero Slide'}>
        <form onSubmit={handleSubmit} className="admin-modal-form">
          <div className="admin-form-grid">
            <label className="admin-form-label">
              Title (EN)
              <input name="title" className="field-input" defaultValue={editingSlide?.title || ''} />
            </label>
            <label className="admin-form-label">
              Title (AR)
              <input name="titleAr" className="field-input" defaultValue={editingSlide?.titleAr || ''} dir="rtl" />
            </label>
            <label className="admin-form-label">
              Subtitle (EN)
              <input name="subtitle" className="field-input" defaultValue={editingSlide?.subtitle || ''} />
            </label>
            <label className="admin-form-label">
              Subtitle (AR)
              <input name="subtitleAr" className="field-input" defaultValue={editingSlide?.subtitleAr || ''} dir="rtl" />
            </label>
            <label className="admin-form-label">
              Description (EN)
              <textarea name="description" className="field-input" rows={2} defaultValue={editingSlide?.description || ''} />
            </label>
            <label className="admin-form-label">
              Description (AR)
              <textarea name="descriptionAr" className="field-input" rows={2} defaultValue={editingSlide?.descriptionAr || ''} dir="rtl" />
            </label>
            <label className="admin-form-label">
              Button Text (EN)
              <input name="buttonText" className="field-input" defaultValue={editingSlide?.buttonText || ''} />
            </label>
            <label className="admin-form-label">
              Button Text (AR)
              <input name="buttonTextAr" className="field-input" defaultValue={editingSlide?.buttonTextAr || ''} dir="rtl" />
            </label>
            <label className="admin-form-label">
              Button Link
              <input name="buttonLink" className="field-input" defaultValue={editingSlide?.buttonLink || ''} />
            </label>
            <label className="admin-form-label">
              Display Order
              <input name="order" type="number" className="field-input" defaultValue={editingSlide?.order ?? 0} />
            </label>
          </div>
          <label className="admin-form-label" style={{ marginTop: 16 }}>
            Slide Image
            <input name="image" type="file" accept="image/*" className="admin-file" />
          </label>
          {editingSlide?.image && (
            <img src={resolveImageUrl(editingSlide.image)} alt="" style={{ maxWidth: '100%', height: 100, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, cursor: 'pointer' }}>
            <input name="isActive" type="checkbox" defaultChecked={editingSlide?.isActive ?? true} />
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
