import { useState, useRef } from 'react';
import { AdminAPI } from '../../../api/admin';

export default function MarketingSection() {
  const [sending, setSending] = useState(false);
  const [previews, setPreviews] = useState([]);
  const fileRef = useRef(null);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    const form = e.target;

    try {
      const formData = new FormData();
      formData.append('subject', form.subject.value);
      formData.append('message', form.message.value);
      formData.append('recipientType', form.recipientType.value);

      const images = fileRef.current?.files;
      if (images) {
        for (let i = 0; i < images.length; i++) {
          formData.append('images', images[i]);
        }
      }

      await AdminAPI.sendEmailWithImages(formData);
      alert('Campaign emails sent!');
      form.reset();
      setPreviews([]);
    } catch {
      alert('Failed to send emails');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="admin-view">
      <h2 className="admin-view-title">Email Marketing</h2>

      <form onSubmit={handleSubmit} className="admin-form" style={{ maxWidth: 700 }}>
        <label className="admin-form-label">
          Recipient Group
          <select name="recipientType" className="field-input" defaultValue="all">
            <option value="all">All Users</option>
            <option value="customers">Customers Only</option>
            <option value="admins">Admins Only</option>
          </select>
        </label>

        <label className="admin-form-label" style={{ marginTop: 16 }}>
          Subject *
          <input name="subject" className="field-input" required placeholder="Email subject line" />
        </label>

        <label className="admin-form-label" style={{ marginTop: 16 }}>
          Message *
          <textarea name="message" className="field-input" rows={6} required placeholder="Write your email content here..." />
        </label>

        <label className="admin-form-label" style={{ marginTop: 16 }}>
          Attach Images
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="admin-file"
            onChange={handleImageChange}
          />
        </label>

        {previews.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {previews.map((url, i) => (
              <img key={i} src={url} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid var(--border-light)' }} />
            ))}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <button type="submit" className="btn btn--primary" disabled={sending}>
            {sending ? 'Sending...' : '📧 Send Campaign'}
          </button>
        </div>
      </form>
    </div>
  );
}
