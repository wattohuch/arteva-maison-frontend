import { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { MailIcon, PhoneIcon, ClockIcon } from '../components/ui/Icons';
import { PinMark } from '../components/ui/PaymentMarks';
import { ContactAPI } from '../api/contact';
import { showToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import { Input, Textarea, FieldRow } from '../components/ui/Field';
import './ContactPage.css';

export default function ContactPage() {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { showToast(t('fill_required_fields'), 'error'); return; }
    setLoading(true);
    try {
      await ContactAPI.submit(form);
      setSubmitted(true);
      showToast(t('message_sent'), 'success');
    } catch (err) {
      showToast(err.message || t('message_failed'), 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: '800px' }}>
        <div className="section-header">
          <h1>{t('contact_us')}</h1>
          <p>{t('contact_subtitle')}</p>
        </div>

        <div className="contact-layout">
          {/* Contact Form */}
          <div className="glass-card-component contact-form-card">
            {submitted ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <span className="status-icon"><MailIcon size={30} /></span>
                <h3>{t('message_sent_title')}</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>{t('message_sent_desc')}</p>
                <Button variant="secondary" size="sm" onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', subject: '', message: '' }); }}
                  style={{ marginTop: 'var(--space-4)' }}>{t('send_another')}</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
                <h3 style={{ marginBottom: 'var(--space-5)' }}>{t('send_message')}</h3>
                <FieldRow>
                  <Input label={t('your_name')} name="name" required
                    value={form.name} onChange={handleChange} autoComplete="name" />
                  <Input label={t('email_address')} name="email" type="email" required
                    value={form.email} onChange={handleChange} autoComplete="email" />
                </FieldRow>
                <FieldRow>
                  <Input label={t('phone_number')} name="phone" type="tel"
                    value={form.phone} onChange={handleChange} autoComplete="tel" />
                  <Input label={t('subject')} name="subject"
                    value={form.subject} onChange={handleChange} />
                </FieldRow>
                <Textarea label={t('message')} name="message" rows={5} required
                  value={form.message} onChange={handleChange} />
                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>{t('send_message')}</Button>
              </form>
            )}
          </div>

          {/* Contact Info */}
          <div className="contact-info-cards">
            <div className="glass-card-component contact-info-card">
              <span className="contact-info-icon"><PinMark /></span>
              <h4>{t('our_location')}</h4>
              <p>Kuwait City, Kuwait</p>
            </div>
            <div className="glass-card-component contact-info-card">
              <span className="contact-info-icon"><MailIcon size={20} /></span>
              <h4>{t('email_us')}</h4>
              <p>info@artevamaisonkw.com</p>
            </div>
            <div className="glass-card-component contact-info-card">
              <span className="contact-info-icon"><PhoneIcon size={20} /></span>
              <h4>{t('call_us')}</h4>
              <p>+965 XXXX XXXX</p>
            </div>
            <div className="glass-card-component contact-info-card">
              <span className="contact-info-icon"><ClockIcon size={20} /></span>
              <h4>{t('working_hours')}</h4>
              <p>{t('working_hours_value')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
