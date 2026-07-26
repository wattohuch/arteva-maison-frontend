import { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { MailIcon, PhoneIcon, ClockIcon } from '../components/ui/Icons';
import { PinMark } from '../components/ui/PaymentMarks';
import { ContactAPI } from '../api/contact';
import { showToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import { Input, Textarea, FieldRow } from '../components/ui/Field';
import './ContactPage.css';

/** Reachable by email as well as WhatsApp; the number itself comes from site
 *  settings so it stays in step with the footer and the support button. */
const EMAIL = 'artevamaison@gmail.com';

export default function ContactPage() {
  const { t } = useI18n();
  const { whatsappDisplay, whatsappNumber } = useSiteSettings();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { showToast(t('fill_required_fields'), 'error'); return; }
    setLoading(true);
    try {
      // The form asks for one name; /api/contact requires it split, and rejects
      // the request outright if lastName is missing.
      const [firstName, ...rest] = form.name.trim().split(/\s+/);
      await ContactAPI.sendMessage({
        ...form,
        firstName,
        lastName: rest.join(' ') || '-',
      });
      setSubmitted(true);
      showToast(t('message_sent'), 'success');
    } catch (err) {
      showToast(err.message || t('message_failed'), 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="section">
      <div className="container contact-container">
        <header className="contact-header">
          <h1>{t('contact_us')}</h1>
          <p>{t('contact_subtitle')}</p>
        </header>

        <div className="contact-layout">
          {/* Contact Form */}
          <div className="glass-card-component contact-form-card">
            {submitted ? (
              <div className="contact-sent">
                <span className="status-icon status-icon-success"><MailIcon size={30} /></span>
                <h3>{t('message_sent_title')}</h3>
                <p>{t('message_sent_desc')}</p>
                <Button
                  variant="secondary" size="sm"
                  onClick={() => {
                    setSubmitted(false);
                    setForm({ name: '', email: '', phone: '', subject: '', message: '' });
                  }}
                >
                  {t('send_another')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
                <h3 className="contact-form-title">{t('send_message')}</h3>
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
                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                  {t('send_message')}
                </Button>
              </form>
            )}
          </div>

          {/* Contact details — one card of rows rather than four floating tiles,
              so the eye reads down a single column. */}
          <aside className="glass-card-component contact-info-card">
            <ul className="contact-info-list">
              <li className="contact-info-row">
                <span className="contact-info-icon"><PinMark width="20" height="20" /></span>
                <div>
                  <h4 className="contact-info-label">{t('our_location')}</h4>
                  <p className="contact-info-value">Kuwait City, Kuwait</p>
                </div>
              </li>

              <li className="contact-info-row">
                <span className="contact-info-icon"><MailIcon size={20} /></span>
                <div>
                  <h4 className="contact-info-label">{t('email_us')}</h4>
                  <a className="contact-info-value contact-info-link" href={`mailto:${EMAIL}`}>
                    {EMAIL}
                  </a>
                </div>
              </li>

              <li className="contact-info-row">
                <span className="contact-info-icon"><PhoneIcon size={20} /></span>
                <div>
                  <h4 className="contact-info-label">{t('call_us')}</h4>
                  <a
                    className="contact-info-value contact-info-link"
                    href={`tel:+${whatsappNumber}`}
                    dir="ltr"
                  >
                    {whatsappDisplay}
                  </a>
                </div>
              </li>

              <li className="contact-info-row">
                <span className="contact-info-icon"><ClockIcon size={20} /></span>
                <div>
                  <h4 className="contact-info-label">{t('working_hours')}</h4>
                  <p className="contact-info-value">{t('working_hours_value')}</p>
                  <p className="contact-info-value contact-info-value-alt">{t('working_hours_friday')}</p>
                </div>
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
