import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { MailIcon, KeyIcon, CheckCircleIcon } from '../components/ui/Icons';
import { LockMark } from '../components/ui/PaymentMarks';
import { AuthAPI } from '../api/auth';
import { showToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';

const STEPS = ['email', 'otp', 'reset', 'success'];

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMsg = (text, type) => { setMessage({ text, type }); setTimeout(() => setMessage({ text: '', type: '' }), 5000); };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!email.trim()) { showMsg(t('enter_email'), 'error'); return; }
    setLoading(true);
    try {
      const data = await AuthAPI.requestPasswordReset(email.trim());
      if (data.success) {
        showMsg(t('otp_sent'), 'success');
        setTimeout(() => setStep(1), 1500);
      } else showMsg(data.message || t('otp_failed'), 'error');
    } catch (err) { showMsg(err.message || t('otp_failed'), 'error'); }
    finally { setLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) { showMsg(t('enter_valid_otp'), 'error'); return; }
    setLoading(true);
    try {
      const data = await AuthAPI.verifyOTP(email, otp);
      if (data.success) {
        showMsg(t('otp_verified'), 'success');
        setTimeout(() => setStep(2), 1200);
      } else showMsg(data.message || t('otp_invalid'), 'error');
    } catch (err) { showMsg(err.message || t('otp_invalid'), 'error'); }
    finally { setLoading(false); }
  };

  const handleResendOTP = async () => {
    try {
      await AuthAPI.requestPasswordReset(email);
      showMsg(t('otp_resent'), 'success');
    } catch (err) { showMsg(err.message || t('otp_failed'), 'error'); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { showMsg(t('password_min_length'), 'error'); return; }
    if (newPassword !== confirmPassword) { showMsg(t('passwords_mismatch'), 'error'); return; }
    setLoading(true);
    try {
      const data = await AuthAPI.resetPassword(email, otp, newPassword);
      if (data.success) {
        showMsg(t('password_reset_success'), 'success');
        setTimeout(() => setStep(3), 1200);
      } else showMsg(data.message || t('password_reset_failed'), 'error');
    } catch (err) { showMsg(err.message || t('password_reset_failed'), 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: '440px', margin: '0 auto' }}>
        <div className="glass-card-component" style={{ padding: 'var(--space-8)' }}>
          {/* Progress */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
            {STEPS.slice(0, 3).map((s, i) => (
              <div key={s} style={{ width: 40, height: 4, borderRadius: 2,
                background: i <= step ? 'var(--color-gold)' : 'var(--border-light)',
                transition: 'background 0.3s' }} />
            ))}
          </div>

          {/* Message */}
          {message.text && (
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)',
              fontSize: 'var(--fs-sm)', fontWeight: 500,
              background: message.type === 'error' ? 'rgba(205,92,92,0.1)' : message.type === 'success' ? 'rgba(46,139,87,0.1)' : 'rgba(201,169,98,0.1)',
              color: message.type === 'error' ? '#CD5C5C' : message.type === 'success' ? '#2E8B57' : 'var(--color-gold-dark)',
            }}>
              {message.text}
            </div>
          )}

          {/* Step 1: Request OTP */}
          {step === 0 && (
            <form onSubmit={handleRequestOTP} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ textAlign: 'center' }}>
                <span className="status-icon"><LockMark /></span>
                <h2 style={{ marginBottom: 'var(--space-2)' }}>{t('forgot_password')}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{t('forgot_password_desc')}</p>
              </div>
              <input type="email" className="control" aria-label={t('email_address')} placeholder={t('email_address')} value={email}
                onChange={e => setEmail(e.target.value)} required autoFocus />
              <Button type="submit" variant="primary" fullWidth loading={loading}>{t('send_otp')}</Button>
              <Link to="/account" style={{ textAlign: 'center', color: 'var(--color-gold)', fontSize: 'var(--fs-sm)' }}>
                {t('back_to_login')}
              </Link>
            </form>
          )}

          {/* Step 2: Verify OTP */}
          {step === 1 && (
            <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ textAlign: 'center' }}>
                <span className="status-icon"><MailIcon size={26} /></span>
                <h2 style={{ marginBottom: 'var(--space-2)' }}>{t('verify_otp')}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{t('otp_sent_to')} <strong>{email}</strong></p>
              </div>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" className="control" aria-label={t('otp_code')} placeholder={t('enter_otp')} value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6} style={{ textAlign: 'center', fontSize: 'var(--fs-xl)', letterSpacing: '8px' }}
                autoFocus required />
              <Button type="submit" variant="primary" fullWidth loading={loading}>{t('verify')}</Button>
              <button type="button" onClick={handleResendOTP}
                style={{ background: 'none', border: 'none', color: 'var(--color-gold)', fontSize: 'var(--fs-sm)', cursor: 'pointer', textAlign: 'center' }}>
                {t('resend_otp')}
              </button>
            </form>
          )}

          {/* Step 3: Reset Password */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ textAlign: 'center' }}>
                <span className="status-icon"><KeyIcon size={26} /></span>
                <h2 style={{ marginBottom: 'var(--space-2)' }}>{t('new_password')}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{t('new_password_desc')}</p>
              </div>
              <input type="password" autoComplete="new-password" className="control" aria-label={t('new_password')} placeholder={t('new_password')} value={newPassword}
                onChange={e => setNewPassword(e.target.value)} required minLength={6} />
              <input type="password" autoComplete="new-password" className="control" aria-label={t('confirm_password')} placeholder={t('confirm_password')} value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} required />
              <Button type="submit" variant="primary" fullWidth loading={loading}>{t('reset_password')}</Button>
            </form>
          )}

          {/* Step 4: Success */}
          {step === 3 && (
            <div style={{ textAlign: 'center' }}>
              <span className="status-icon status-icon-success"><CheckCircleIcon size={36} /></span>
              <h2 style={{ marginBottom: 'var(--space-3)' }}>{t('password_reset_success')}</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>{t('password_reset_success_desc')}</p>
              <Link to="/account" className="btn btn-primary">{t('go_to_login')}</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
