import {
  createContext, useContext, useState, useCallback, useEffect, useMemo,
} from 'react';
import { PromoAPI } from '../api/promoCodes';
import { useCart } from './CartContext';
import { useAuth } from './AuthContext';

/**
 * Promo codes — a direct port of the vanilla `assets/js/promo.js`, plus the
 * visitor attribution the vanilla site had no way to measure.
 *
 * Behaviour carried over unchanged:
 *  · the applied promo persists in localStorage under `arteva_promo`
 *  · the server is the only thing that decides a discount; the client never
 *    computes one
 *  · changing the cart re-validates, and the promo is dropped when none of its
 *    products remain
 *
 * Added:
 *  · a `?promo=CODE` link is captured on landing, recorded as a visit, and
 *    auto-applied once the basket qualifies — so a code can be shared as a URL
 *  · the resulting visit id rides along to checkout, which is what lets the
 *    backend attribute an order back to the click that produced it
 */

const PROMO_STORAGE_KEY = 'arteva_promo';
const VISITOR_KEY = 'arteva_visitor_id';
const PENDING_KEY = 'arteva_promo_pending';

const PromoContext = createContext(null);

/** Stable anonymous id for this browser. Not tied to an account. */
function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() || `v${Date.now()}${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // Private mode with storage blocked — tracking degrades, checkout does not.
    return null;
  }
}

function readStored(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStored(key, value) {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch { /* storage blocked */ }
}

export function PromoProvider({ children }) {
  const { items } = useCart();
  const { isLoggedIn } = useAuth();

  // Shape mirrors the validate response: { code, name, promoCodeId,
  // totalDiscount, discounts[], matchedProducts }
  const [promo, setPromo] = useState(() => readStored(PROMO_STORAGE_KEY));
  const [pending, setPending] = useState(() => readStored(PENDING_KEY));
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);

  // The visit this session's code came from, forwarded to checkout. State
  // rather than a ref: the context value read during render depends on it, and
  // a ref's `.current` must never be read outside an effect or handler — doing
  // so can observe a stale value under concurrent rendering.
  const [visitId, setVisitId] = useState(pending?.visitId || null);

  /** Cart in the shape the validate endpoint expects. */
  const cartItems = useMemo(
    () => items.map(i => ({
      product: i._id || i.id,
      quantity: i.quantity,
      price: i.price,
    })),
    [items]
  );

  const persist = useCallback((next) => {
    setPromo(next);
    writeStored(PROMO_STORAGE_KEY, next);
  }, []);

  const remove = useCallback(() => {
    persist(null);
    setError(null);
  }, [persist]);

  /**
   * Validate and apply a code.
   * @returns {Promise<{ok: boolean, message?: string, data?: object}>}
   */
  const apply = useCallback(async (rawCode, { silent = false } = {}) => {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) return { ok: false, message: 'Please enter a promo code' };

    if (!cartItems.length) {
      const message = 'Your cart is empty';
      if (!silent) setError(message);
      return { ok: false, message };
    }

    setApplying(true);
    setError(null);

    try {
      const res = await PromoAPI.validate(code, cartItems);
      const data = res?.data;

      if (!data || !data.matchedProducts) {
        const message = "This promo code doesn't apply to any items in your cart";
        if (!silent) setError(message);
        return { ok: false, message };
      }

      persist({ ...data, visitId: visitId || undefined });
      return { ok: true, data };
    } catch (err) {
      const message = err?.message || 'Failed to validate promo code';
      if (!silent) setError(message);
      return { ok: false, message };
    } finally {
      setApplying(false);
    }
  }, [cartItems, persist, visitId]);

  /**
   * Re-price the applied code whenever the basket changes.
   *
   * Cheap client-side checks come first so an empty cart or a cart that no
   * longer contains any discounted product clears the promo without a request.
   */
  useEffect(() => {
    if (!promo) return;

    if (!cartItems.length) { remove(); return; }

    if (promo.discounts?.length) {
      const inCart = new Set(cartItems.map(i => String(i.product)));
      const stillMatches = promo.discounts.some(d => inCart.has(String(d.product)));
      if (!stillMatches) { remove(); return; }
    }

    let cancelled = false;
    // Debounced: quantity steppers fire several updates in a row and each one
    // would otherwise cost a round trip.
    const timer = setTimeout(async () => {
      try {
        const res = await PromoAPI.validate(promo.code, cartItems);
        if (cancelled) return;
        if (res?.data?.matchedProducts) {
          persist({ ...res.data, visitId: visitId || promo.visitId });
        } else {
          remove();
        }
      } catch {
        // Server unreachable — keep the current state rather than dropping a
        // valid discount because of a flaky connection. Checkout re-validates
        // server-side regardless, so a stale figure can never be charged.
      }
    }, 400);

    return () => { cancelled = true; clearTimeout(timer); };
    // `promo.code` rather than `promo`: re-running on every re-price would loop.
  }, [cartItems, promo?.code]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Capture a promo code arriving in the URL (`?promo=` or `?ref=`).
   *
   * Runs once per load, before anything else touches the query string. The
   * code is recorded as a visit immediately — that is the measurement point,
   * and it happens whether or not the visitor ever buys anything.
   */
  useEffect(() => {
    let code = null;
    try {
      const params = new URLSearchParams(window.location.search);
      code = params.get('promo') || params.get('ref');
    } catch { /* malformed URL */ }

    if (!code) return;
    const normalised = code.trim().toUpperCase().slice(0, 32);
    if (!normalised) return;

    const visitorId = getVisitorId();

    const record = { code: normalised, capturedAt: Date.now() };
    setPending(record);
    writeStored(PENDING_KEY, record);

    if (visitorId) {
      PromoAPI.trackVisit({
        code: normalised,
        visitorId,
        referrer: document.referrer || '',
        landingPage: window.location.pathname,
        source: 'link',
      })
        .then(res => {
          const id = res?.data?.visitId;
          if (!id) return;
          setVisitId(id);
          const withVisit = { ...record, visitId: id };
          setPending(withVisit);
          writeStored(PENDING_KEY, withVisit);
        })
        .catch(() => { /* tracking never blocks the page */ });
    }

    // Take the code out of the address bar so it is not re-tracked on refresh
    // and does not end up shared onward by accident.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('promo');
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    } catch { /* history unavailable */ }
  }, []);

  /**
   * Auto-apply a captured link code once it can actually succeed — i.e. the
   * shopper is logged in and has qualifying items. Attempted silently so a
   * code that does not match the basket never shows an error the shopper did
   * not ask for.
   */
  useEffect(() => {
    if (!pending?.code || promo || !isLoggedIn || !cartItems.length) return;

    let cancelled = false;
    apply(pending.code, { silent: true }).then(result => {
      if (cancelled || !result.ok) return;
      setPending(null);
      writeStored(PENDING_KEY, null);
    });

    return () => { cancelled = true; };
  }, [pending?.code, promo, isLoggedIn, cartItems.length, apply]);

  /** Record a hand-typed code as a visit too, so both channels are comparable. */
  const trackManualEntry = useCallback((code) => {
    const visitorId = getVisitorId();
    if (!visitorId || !code) return;
    PromoAPI.trackVisit({
      code: code.trim().toUpperCase(),
      visitorId,
      landingPage: window.location.pathname,
      source: 'manual_entry',
    })
      .then(res => { if (res?.data?.visitId) setVisitId(res.data.visitId); })
      .catch(() => {});
  }, []);

  const discount = promo?.totalDiscount || 0;

  const value = useMemo(() => ({
    promo,
    discount,
    applying,
    error,
    pendingCode: pending?.code || null,
    /** Passed to the payment call so the server can re-price and attribute. */
    promoCode: promo?.code || null,
    promoVisitId: promo?.visitId || visitId || null,
    apply,
    remove,
    trackManualEntry,
    clearError: () => setError(null),
  }), [promo, discount, applying, error, pending?.code, visitId, apply, remove, trackManualEntry]);

  return <PromoContext.Provider value={value}>{children}</PromoContext.Provider>;
}

export function usePromo() {
  const ctx = useContext(PromoContext);
  if (!ctx) throw new Error('usePromo must be used within PromoProvider');
  return ctx;
}
