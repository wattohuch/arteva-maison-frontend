import { useState, useEffect, useRef, useCallback } from 'react';
import { AdminAPI } from '../../../api/admin';
import { SparkleIcon, CoinsIcon } from '../../../components/ui/Icons';
import './RevenueStatCard.css';

/**
 * The revenue tile on the admin dashboard.
 *
 * Blurred for everybody by default. Only the owner can lift it, by entering
 * the revenue password, and only for five minutes — after that it re-blurs and
 * the password is required again.
 *
 * The blur is not the security boundary. Any admin can delete a CSS filter in
 * devtools, so the real figure is never sent to a browser that has not earned
 * it: /admin/stats no longer carries revenue at all, and the number behind
 * this tile comes from /admin/revenue/total, which demands the owner role plus
 * an unlock token. What is blurred here is a placeholder — removing the filter
 * by hand reveals nothing but dots.
 *
 * The unlock token is held in component state and never written to storage, so
 * the five-minute timer cannot be outlived by a token sitting in sessionStorage.
 */

const REVEAL_MS = 5 * 60 * 1000;

/** Digits of the same shape as a real figure, so the blur has something to bite on. */
const PLACEHOLDER = '••••.••• KWD';

const mmss = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export default function RevenueStatCard({ label, canUnlock }) {
  const [amount, setAmount] = useState(null);      // null while blurred
  const [remaining, setRemaining] = useState(0);
  const [prompting, setPrompting] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const expiryRef = useRef(0);

  const conceal = useCallback(() => {
    // Drop the figure itself, not just the styling — a re-blur that left the
    // number in the DOM would be theatre.
    setAmount(null);
    setRemaining(0);
    expiryRef.current = 0;
    setPrompting(false);
    setPassword('');
    setError('');
  }, []);

  // Ticks the countdown and conceals on expiry. Driven by a wall-clock
  // deadline rather than by counting ticks, so a backgrounded tab that stops
  // firing timers still comes back to a correctly expired tile.
  useEffect(() => {
    if (amount === null) return;

    const tick = () => {
      const left = expiryRef.current - Date.now();
      if (left <= 0) conceal();
      else setRemaining(left);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [amount, conceal]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!password) { setError('Enter your revenue password.'); return; }

    setBusy(true);
    setError('');
    try {
      // Not persisted: this token exists only for the fetch below.
      const auth = await AdminAPI.authenticateRevenueAccess(password, { persist: false });
      const res = await AdminAPI.getRevenueTotal(auth.revenueToken);
      expiryRef.current = Date.now() + REVEAL_MS;
      setAmount(res.data?.totalRevenue ?? 0);
      setPrompting(false);
      setPassword('');
    } catch (err) {
      setError(err.message || 'Could not unlock revenue.');
    } finally {
      setBusy(false);
    }
  };

  const revealed = amount !== null;

  return (
    <div className={`admin-stat-card tone-amber revstat ${revealed ? 'is-revealed' : 'is-hidden'}`}>
      <span className="admin-stat-icon"><SparkleIcon size={20} /></span>

      <div className="admin-stat-body">
        <span className={`admin-stat-value revstat-value ${revealed ? '' : 'is-blurred'}`}>
          {revealed ? `${amount.toFixed(3)} KWD` : PLACEHOLDER}
        </span>
        <span className="admin-stat-label">{label}</span>
      </div>

      {revealed ? (
        <div className="revstat-timer">
          <span className="revstat-countdown" aria-live="off">{mmss(remaining)}</span>
          <button type="button" className="revstat-link" onClick={conceal}>Hide</button>
        </div>
      ) : canUnlock ? (
        <div className="revstat-lock">
          {prompting ? (
            <form className="revstat-form" onSubmit={handleUnlock}>
              <input
                type="password"
                className="control revstat-input"
                placeholder="Revenue password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
              />
              <div className="revstat-form-actions">
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                  {busy ? '…' : 'Show'}
                </button>
                <button
                  type="button" className="revstat-link"
                  onClick={() => { setPrompting(false); setPassword(''); setError(''); }}
                >
                  Cancel
                </button>
              </div>
              {error && <span className="revstat-error" role="alert">{error}</span>}
            </form>
          ) : (
            <button
              type="button"
              className="revstat-unlock"
              onClick={() => setPrompting(true)}
              title="Enter your revenue password to reveal for 5 minutes"
            >
              <CoinsIcon size={14} />
              <span>Unlock</span>
            </button>
          )}
        </div>
      ) : (
        <span className="revstat-denied" title="Revenue is visible to the owner account only">
          Owner only
        </span>
      )}
    </div>
  );
}
