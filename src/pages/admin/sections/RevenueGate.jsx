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

    if (!password) { setError('Enter your revenue password.'); return; }

    setBusy(true);
    try {
      if (!status?.hasPassword) {
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        if (password !== confirm) throw new Error('The two passwords do not match.');
        await AdminAPI.setRevenuePassword(password);
        // Setting it does not unlock: the owner immediately proves they can
        // reproduce it, which catches a typo before it locks them out.
        await AdminAPI.authenticateRevenueAccess(password);
        showToast('Revenue password set.', 'success');
      } else {
        await AdminAPI.authenticateRevenueAccess(password);
      }
      setPassword('');
      setConfirm('');
      setUnlocked(true);
    } catch (err) {
      setError(err.message || 'Could not unlock revenue.');
    } finally {
      setBusy(false);
    }
  }, [password, confirm, status]);

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

  return (
    <div className="admin-view">
      <h2 className="admin-view-title">Revenue</h2>

      <form className="revgate" onSubmit={handleUnlock}>
        <span className="revgate-icon"><CoinsIcon size={22} /></span>
        <h3>{firstTime ? 'Set your revenue password' : 'Enter your revenue password'}</h3>
        <p>
          {firstTime
            ? 'Choose a password that is separate from your login password. It will be required every time revenue is opened.'
            : 'This is separate from your login password. It is asked for each time revenue is opened.'}
        </p>

        <label className="revgate-field">
          <span>Revenue password</span>
          <input
            type="password"
            className="control"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={firstTime ? 'new-password' : 'current-password'}
            autoFocus
          />
        </label>

        {firstTime && (
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

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Checking…' : (firstTime ? 'Set password & open' : 'Open revenue')}
        </button>
      </form>
    </div>
  );
}
