import { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '../../../api/admin';
import { useAuth } from '../../../contexts/AuthContext';
import { showToast } from '../../../components/ui/Toast';
import Loader from '../../../components/ui/Loader';
import { CoinsIcon } from '../../../components/ui/Icons';
import './RevenueGate.css';

/**
 * Password gate in front of the revenue view.
 *
 * Two separate questions, and both have to be answered before any figure is
 * rendered:
 *
 *   1. Is this the owner? `superuser` is the developer account and is refused
 *      here — it administers the shop but the takings are not its business.
 *   2. Has the owner re-entered the revenue password in this session? Being
 *      logged in is not enough; a dashboard left open on a counter should not
 *      show the day's revenue to whoever walks past.
 *
 * The password is a second secret, distinct from the login password, and the
 * unlock it buys is a short-lived token the server insists on for every revenue
 * read. Nothing here is decorative: failing the gate means the API refuses to
 * return the numbers at all.
 */

export default function RevenueGate({ children }) {
  const { user } = useAuth();

  const [status, setStatus] = useState(null);   // { isOwner, hasPassword }
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  /* Forgotten-password recovery.
   *
   * The prompt used to say "use forgot password to reset" while offering no way
   * to do it: the OTP endpoints verified a code and then granted nothing, so an
   * owner who forgot this password was locked out of their own revenue with no
   * route back short of a database edit. The OTP now buys a scoped reset ticket
   * the API accepts in place of the current password.
   */
  const [mode, setMode] = useState('unlock');   // unlock | otp | reset
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    AdminAPI.getRevenueAccessStatus()
      .then(res => { if (!cancelled) setStatus(res); })
      .catch(() => { if (!cancelled) setStatus({ isOwner: false, hasPassword: false }); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, []);

  // Any stale token from a previous visit is dropped on mount, so the password
  // is always asked for once per visit to this section.
  useEffect(() => {
    AdminAPI.lockRevenue();
  }, []);

  const handleUnlock = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!password) { setError('Enter your revenue password.'); return; }

    setBusy(true);
    try {
      const settingNew = !status?.hasPassword || mode === 'reset';

      if (settingNew) {
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        if (password !== confirm) throw new Error('The two passwords do not match.');
        // `resetToken` is only present on the forgotten-password path; the
        // first-time setup case sends none and the API allows it because there
        // is no existing password to protect.
        await AdminAPI.setRevenuePassword(password, { resetToken });
        // Setting it does not unlock: the owner immediately proves they can
        // reproduce it, which catches a typo before it locks them out.
        await AdminAPI.authenticateRevenueAccess(password);
        showToast('Revenue password set.', 'success');
        setResetToken(null);
        setMode('unlock');
        setStatus(prev => ({ ...prev, hasPassword: true, lockedUntil: null }));
      } else {
        await AdminAPI.authenticateRevenueAccess(password);
      }
      setPassword('');
      setConfirm('');
      setUnlocked(true);
    } catch (err) {
      /* A wrong password no longer signs the owner out — the API answers 403
         with a typed code rather than 401, and the client only clears a session
         on a SESSION_* code. Surface the remaining attempts so the lockout is
         not a surprise. */
      if (err.code === 'REVENUE_LOCKED_OUT') {
        setError(err.message || 'Too many attempts. Revenue is locked for a while.');
        setStatus(prev => ({ ...prev, lockedUntil: Date.now() + 15 * 60 * 1000 }));
      } else if (err.code === 'REVENUE_PASSWORD_INVALID') {
        const left = err.details?.attemptsRemaining;
        setError(
          typeof left === 'number' && left > 0
            ? `Invalid revenue password. ${left} attempt${left === 1 ? '' : 's'} left.`
            : 'Invalid revenue password.'
        );
      } else {
        setError(err.message || 'Could not unlock revenue.');
      }
    } finally {
      setBusy(false);
    }
  }, [password, confirm, status, mode, resetToken]);

  const requestOtp = useCallback(async () => {
    setError('');
    setBusy(true);
    try {
      await AdminAPI.requestRevenueOTP();
      setMode('otp');
      setNotice('We have emailed a 6-digit code to your account address.');
    } catch (err) {
      setError(err.message || 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  }, []);

  const verifyOtp = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await AdminAPI.verifyRevenueOTP(otp.trim());

      /* A 200 with no reset ticket means the code WAS accepted but the server
         predates the reset flow — it verified and granted nothing, which is the
         original bug. Saying "that code was not accepted" here would blame the
         owner for a correct code and send them hunting for the wrong problem,
         which is exactly what it did. */
      if (!res?.resetToken) {
        throw new Error(
          'This server does not support resetting the revenue password yet. ' +
          'The backend needs updating — the code itself was correct.'
        );
      }
      setResetToken(res.resetToken);
      setOtp('');
      setPassword('');
      setConfirm('');
      setMode('reset');
      setNotice('Code verified. Choose a new revenue password.');
    } catch (err) {
      setError(err.message || 'That code was not accepted.');
    } finally {
      setBusy(false);
    }
  }, [otp]);

  const handleLock = useCallback(() => {
    AdminAPI.lockRevenue();
    setUnlocked(false);
  }, []);

  // The unlock is timed, so it can lapse while the section is open. When the
  // API reports that, drop back to the prompt instead of leaving a dead view.
  useEffect(() => {
    window.addEventListener('revenue_locked', handleLock);
    return () => window.removeEventListener('revenue_locked', handleLock);
  }, [handleLock]);

  if (checking) {
    return <div className="admin-view"><div className="admin-loading"><Loader /></div></div>;
  }

  if (!status?.isOwner) {
    return (
      <div className="admin-view">
        <h2 className="admin-view-title">Revenue</h2>
        <div className="revgate revgate--denied">
          <span className="revgate-icon"><CoinsIcon size={22} /></span>
          <h3>Owner access only</h3>
          <p>
            Revenue is visible to the shop owner account alone.
            {user?.role === 'superuser' && ' The superuser account administers the system but does not have access to the takings.'}
          </p>
        </div>
      </div>
    );
  }

  if (unlocked) {
    return (
      <>
        <div className="revgate-bar">
          <span>Revenue unlocked for this session.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLock}>
            Lock revenue
          </button>
        </div>
        {children}
      </>
    );
  }

  const firstTime = !status.hasPassword;
  const settingNew = firstTime || mode === 'reset';

  const lockedUntil = status.lockedUntil ? new Date(status.lockedUntil) : null;
  const isLockedOut = lockedUntil && lockedUntil.getTime() > Date.now();

  // ── Emailed-code step ──
  if (mode === 'otp') {
    return (
      <div className="admin-view">
        <h2 className="admin-view-title">Revenue</h2>
        <form className="revgate" onSubmit={verifyOtp}>
          <span className="revgate-icon"><CoinsIcon size={22} /></span>
          <h3>Enter the emailed code</h3>
          <p>{notice || 'We have emailed a 6-digit code to your account address.'}</p>

          <label className="revgate-field">
            <span>6-digit code</span>
            <input
              type="text"
              className="control"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
            />
          </label>

          {error && <p className="revgate-error" role="alert">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={busy || otp.length !== 6}>
            {busy ? 'Checking…' : 'Verify code'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { setMode('unlock'); setError(''); setNotice(''); }}
          >
            Back
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-view">
      <h2 className="admin-view-title">Revenue</h2>

      <form className="revgate" onSubmit={handleUnlock}>
        <span className="revgate-icon"><CoinsIcon size={22} /></span>
        <h3>
          {settingNew
            ? (mode === 'reset' ? 'Choose a new revenue password' : 'Set your revenue password')
            : 'Enter your revenue password'}
        </h3>
        <p>
          {settingNew
            ? 'Choose a password that is separate from your login password. It will be required every time revenue is opened.'
            : 'This is separate from your login password. It is asked for each time revenue is opened.'}
        </p>

        {notice && <p className="revgate-notice">{notice}</p>}

        {isLockedOut && (
          <p className="revgate-error" role="alert">
            Too many failed attempts. Try again after{' '}
            {lockedUntil.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
          </p>
        )}

        <label className="revgate-field">
          <span>{settingNew ? 'New revenue password' : 'Revenue password'}</span>
          <input
            type="password"
            className="control"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={settingNew ? 'new-password' : 'current-password'}
            disabled={isLockedOut}
            autoFocus
          />
        </label>

        {settingNew && (
          <label className="revgate-field">
            <span>Confirm password</span>
            <input
              type="password"
              className="control"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>
        )}

        {error && <p className="revgate-error" role="alert">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={busy || isLockedOut}>
          {busy ? 'Checking…' : (settingNew ? 'Set password & open' : 'Open revenue')}
        </button>

        {/* Only offered once a password exists — there is nothing to recover
            before that, and the first-time form is already a "set" form. */}
        {!firstTime && mode === 'unlock' && (
          <button
            type="button"
            className="revgate-link"
            onClick={requestOtp}
            disabled={busy}
          >
            Forgotten your revenue password?
          </button>
        )}
      </form>
    </div>
  );
}
