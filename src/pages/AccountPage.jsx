import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { showToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import './AccountPage.css';

export default function AccountPage() {
  const { isLoggedIn, login, register: registerFn } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [loading, setLoading] = useState(false);

  if (isLoggedIn) { navigate('/profile', { replace: true }); return null; }

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      showToast(t('login_success'), 'success');
      navigate('/profile');
    } catch (err) {
      showToast(err.message || t('login_failed'), 'error');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { showToast(t('passwords_mismatch'), 'error'); return; }
    setLoading(true);
    try {
      await registerFn(form.name, form.email, form.password, form.phone);
      showToast(t('account_created'), 'success');
      navigate('/profile');
    } catch (err) {
      showToast(err.message || t('registration_failed'), 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="section">
      <div className="container account-container">
        <div className="glass-card-component account-card">
          <div className="account-tabs">
            <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>{t('login')}</button>
            <button className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>{t('register')}</button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="account-form">
              <h2>{t('welcome_back')}</h2>
              <Input
                label={t('email_address')} name="email" type="email" required
                value={form.email} onChange={handleChange} autoComplete="email"
              />
              <Input
                label={t('password')} name="password" type="password" required
                value={form.password} onChange={handleChange} autoComplete="current-password"
              />
              <Button type="submit" variant="primary" fullWidth loading={loading}>{t('sign_in')}</Button>
              <Link to="/forgot-password" className="forgot-link">{t('forgot_password')}</Link>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="account-form">
              <h2>{t('create_account')}</h2>
              <Input
                label={t('full_name')} name="name" required
                value={form.name} onChange={handleChange} autoComplete="name"
              />
              <Input
                label={t('email_address')} name="email" type="email" required
                value={form.email} onChange={handleChange} autoComplete="email"
              />
              <Input
                label={t('phone_number')} name="phone" type="tel"
                placeholder={t('phone_placeholder')}
                value={form.phone} onChange={handleChange} autoComplete="tel"
              />
              <Input
                label={t('password')} name="password" type="password" required
                value={form.password} onChange={handleChange} autoComplete="new-password"
              />
              <Input
                label={t('confirm_password')} name="confirmPassword" type="password" required
                value={form.confirmPassword} onChange={handleChange} autoComplete="new-password"
              />
              <Button type="submit" variant="primary" fullWidth loading={loading}>{t('create_account')}</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
