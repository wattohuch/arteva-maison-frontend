import {
  createContext, useContext, useState, useCallback, useEffect, useMemo,
} from 'react';
import { CartAPI } from '../api/cart';
import { ProductsAPI } from '../api/products';
import { trackAddToCart } from '../utils/metaPixel';
import { showToast } from '../components/ui/Toast';
import { useAuth } from './AuthContext';
import { useI18n } from './I18nContext';

const CartContext = createContext(null);

/** Whose cart is currently sitting in localStorage — set on every login-time
 *  sync so a later login can tell "my own cart, still here" apart from
 *  "someone else's leftovers on this device". */
const CART_OWNER_KEY = 'arteva_cart_owner';

export function CartProvider({ children }) {
  const { isLoggedIn, user } = useAuth();
  const { t } = useI18n();

  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('arteva_cart') || '[]'); }
    catch { return []; }
  });

  const persist = useCallback((newItems) => {
    setItems(newItems);
    localStorage.setItem('arteva_cart', JSON.stringify(newItems));
  }, []);

  // Derived once per basket change rather than on every provider render.
  /* Gift wrapping is per-order, so it lives here rather than on any one
   * screen. `fee` is whatever the server last quoted — never computed here,
   * because a price the browser decides is a price a customer can edit. */
  const [giftWrap, setGiftWrapState] = useState({ enabled: false, message: '', fee: 0 });

  const { count, subtotal } = useMemo(() => items.reduce(
    (acc, item) => {
      const qty = Number(item.quantity) || 1;
      acc.count += qty;
      acc.subtotal += (Number(item.price) || 0) * qty;
      return acc;
    },
    { count: 0, subtotal: 0 }
  ), [items]);

  const addItem = useCallback((product, quantity = 1) => {
    const id = product._id || product.id;

    /* Cap the basket at what is on the shelf.
     *
     * The server refuses an oversell either way, but the guest basket lives
     * entirely in localStorage and never asked, so a guest could build a
     * quantity of five against two units and only discover it at checkout —
     * after entering an address and choosing a payment method.
     *
     * `stock` absent means unknown (an older cart entry, or a product summary
     * that did not include it) and is left uncapped, so this can never make a
     * previously-working basket un-addable.
     */
    const available = Number.isFinite(Number(product?.stock)) ? Number(product.stock) : null;

    setItems(prev => {
      const existing = prev.find(i => (i._id || i.id) === id);
      const inCart = existing ? (Number(existing.quantity) || 0) : 0;

      const wanted = Math.max(1, Number(quantity) || 1);
      const room = available === null ? wanted : Math.max(0, available - inCart);
      const added = Math.min(wanted, room);

      if (added <= 0) {
        // Nothing to add. Report it rather than silently doing nothing.
        showToast(
          available === 0
            ? t('out_of_stock')
            : `Only ${available} in stock — already in your bag.`,
          'error'
        );
        return prev;
      }

      // Counted here, with the quantity actually added rather than the one
      // asked for, so the analytics match the basket.
      trackAddToCart(product, added);

      // Fire-and-forget: so the admin cart view (and any other device the same
      // account is logged into) sees this without waiting on checkout.
      if (isLoggedIn) CartAPI.add(id, added).catch(() => {});

      let next;
      if (existing) {
        next = prev.map(i =>
          (i._id || i.id) === id
            ? { ...i, quantity: inCart + added, stock: available ?? i.stock }
            : i
        );
      } else {
        const image = product.images?.length
          ? (product.images.find(img => img.isPrimary) || product.images[0]).url
          : product.image || '';
        const priceNum = Number(product.price) || 0;
        next = [...prev, {
          id, _id: id,
          name: product.name,
          nameAr: product.nameAr || '',
          price: priceNum,
          image,
          quantity: added,
          // Carried onto the line so the cart page's stepper can cap itself
          // without re-fetching every product.
          stock: available ?? undefined,
        }];
      }

      if (added < wanted) {
        showToast(`Only ${available} in stock — added ${added}.`, 'info');
      }

      localStorage.setItem('arteva_cart', JSON.stringify(next));
      return next;
    });
  }, [isLoggedIn, t]);

  const updateQuantity = useCallback((id, quantity) => {
    if (isLoggedIn) {
      if (quantity <= 0) CartAPI.remove(id).catch(() => {});
      else CartAPI.update(id, quantity).catch(() => {});
    }

    if (quantity <= 0) {
      setItems(prev => {
        const next = prev.filter(i => (i._id || i.id) !== id);
        localStorage.setItem('arteva_cart', JSON.stringify(next));
        return next;
      });
    } else {
      setItems(prev => {
        const next = prev.map(i => {
          if ((i._id || i.id) !== id) return i;
          // Same cap as addItem: a known stock figure on the line bounds it,
          // an unknown one leaves it alone.
          const available = Number.isFinite(Number(i.stock)) ? Number(i.stock) : null;
          const capped = available === null ? quantity : Math.min(quantity, available);
          if (capped < quantity) showToast(`Only ${available} in stock.`, 'info');
          return { ...i, quantity: capped };
        });
        localStorage.setItem('arteva_cart', JSON.stringify(next));
        return next;
      });
    }
  }, [isLoggedIn]);

  const removeItem = useCallback((id) => {
    if (isLoggedIn) CartAPI.remove(id).catch(() => {});

    setItems(prev => {
      const next = prev.filter(i => (i._id || i.id) !== id);
      localStorage.setItem('arteva_cart', JSON.stringify(next));
      return next;
    });
  }, [isLoggedIn]);

  /**
   * Turn wrapping on or off, and keep the note with it.
   *
   * Applied locally first so the tick responds immediately, then confirmed by
   * the server, which is what actually decides the fee. A failure puts the
   * toggle back rather than leaving the customer believing their order will
   * be wrapped when the server never heard about it.
   */
  const setGiftWrap = useCallback(async (enabled, message = '') => {
    const previous = giftWrap;
    setGiftWrapState(g => ({ ...g, enabled, message }));

    if (!isLoggedIn) return { success: false };

    try {
      const res = await CartAPI.setGiftWrap(enabled, message);
      if (!res.success) throw new Error(res.message || 'Could not save gift wrapping');
      setGiftWrapState({
        enabled: Boolean(res.data?.giftWrap?.enabled),
        message: res.data?.giftWrap?.message || '',
        fee: Number(res.data?.fee) || 0,
      });
      return res;
    } catch (err) {
      setGiftWrapState(previous);
      return { success: false, message: err.message };
    }
  }, [isLoggedIn, giftWrap]);

  const clearCart = useCallback(() => {
    if (isLoggedIn) CartAPI.clear().catch(() => {});
    // The server drops the wrapping request with the bag; mirror that here so
    // the tick does not survive into the next order.
    setGiftWrapState({ enabled: false, message: '', fee: 0 });
    persist([]);
  }, [persist, isLoggedIn]);

  /**
   * Re-read stock for everything in the basket, and clamp anything over.
   *
   * Two holes this closes, both of which let a shopper reach checkout holding
   * more than exists:
   *
   *   · a basket restored from localStorage carries whatever `stock` was true
   *     when the item was added — or none at all, for a basket saved before
   *     stock was tracked on the line, in which case the cap was skipped
   *     entirely and the + button ran free;
   *   · stock moves while the basket sits open. Someone else buys the last one,
   *     or an admin refunds and the count goes up.
   *
   * Clamping here rather than only disabling the + button matters: the excess
   * is already in the basket by the time this runs, and a disabled button does
   * not remove it.
   *
   * Returns what it had to change, so the caller can say so.
   */
  const refreshStock = useCallback(async () => {
    const ids = items.map(i => i._id || i.id).filter(Boolean);
    if (!ids.length) return [];

    let fresh;
    try {
      fresh = await ProductsAPI.getByIds(ids);
    } catch {
      // Offline or the request failed. Leave the basket alone — the server
      // refuses an oversell at checkout regardless, so this is a convenience
      // layer and not the guarantee.
      return [];
    }

    const stockById = new Map(
      (fresh?.data || []).map(p => [String(p._id), Number(p.stock) || 0])
    );

    const adjustments = [];

    setItems(prev => {
      let changed = false;

      const next = prev.flatMap(item => {
        const id = String(item._id || item.id);
        if (!stockById.has(id)) return item;   // product no longer listed

        const available = stockById.get(id);
        const held = Number(item.quantity) || 0;

        if (available <= 0) {
          changed = true;
          adjustments.push({ id, name: item.name, from: held, to: 0 });
          return [];                            // sold out — drop the line
        }

        if (held > available) {
          changed = true;
          adjustments.push({ id, name: item.name, from: held, to: available });
          return { ...item, quantity: available, stock: available };
        }

        // In range, but record the current figure so the steppers can cap.
        if (item.stock !== available) {
          changed = true;
          return { ...item, stock: available };
        }

        return item;
      });

      if (!changed) return prev;
      localStorage.setItem('arteva_cart', JSON.stringify(next));
      return next;
    });

    /* Keep the server basket in step with what was clamped, so the two do not
     * disagree the next time it is read.
     *
     * The id travels on the adjustment. Looking the line back up by `name` —
     * which this did — breaks whenever two lines share a name and silently does
     * nothing when a name is missing.
     *
     * Failures are ignored on purpose, and are expected rather than
     * exceptional: the product may not be in the SERVER basket at all (a guest
     * basket that has not been synced yet), in which case removing it answers
     * 404 — which is the outcome we wanted anyway. The local basket is already
     * correct by this point, and the server refuses an oversell at checkout
     * regardless, so nothing downstream depends on these landing.
     */
    if (isLoggedIn) {
      for (const change of adjustments) {
        if (!change.id) continue;
        if (change.to === 0) CartAPI.remove(change.id).catch(() => {});
        else CartAPI.update(change.id, change.to).catch(() => {});
      }
    }

    for (const change of adjustments) {
      showToast(
        change.to === 0
          ? `${change.name} is now out of stock and was removed from your bag.`
          : `Only ${change.to} of ${change.name} left — your bag was updated.`,
        'info'
      );
    }

    return adjustments;
  }, [items, isLoggedIn]);

  const uid = user?._id || user?.id || null;

  // Sync with server when logged in.
  useEffect(() => {
    if (!isLoggedIn) return;

    CartAPI.get().then(res => {
      if (!res.success) return;
      const serverItems = res.data?.items || [];

      /* Restored on load, which is what carries the choice back across a
       * payment redirect and across devices. */
      if (res.data?.giftWrap) {
        setGiftWrapState({
          enabled: Boolean(res.data.giftWrap.enabled),
          message: res.data.giftWrap.message || '',
          fee: Number(res.data.giftWrapFee) || 0,
        });
      }

      if (serverItems.length) {
        const normalized = serverItems.map(item => {
          const prod = item.product || {};
          const id = prod._id || prod.id || item._id || item.id;
          const image = prod.images?.length
            ? (prod.images.find(img => img.isPrimary) || prod.images[0]).url
            : prod.image || item.image || '';
          const name = prod.name || item.name || 'Product';
          const nameAr = prod.nameAr || item.nameAr || '';
          const price = Number(prod.price ?? item.price ?? 0);
          const quantity = Number(item.quantity || 1);
          // The server populates `stock` on cart products, so this is the
          // freshest figure available — it keeps the cart stepper honest even
          // if the item has been sitting in the basket for days.
          const stock = Number.isFinite(Number(prod.stock)) ? Number(prod.stock) : undefined;
          return {
            id,
            _id: id,
            name,
            nameAr,
            price,
            image,
            quantity,
            stock,
          };
        });
        persist(normalized);
      } else {
        // Server cart is empty. That's expected the first time a guest logs
        // in mid-checkout — their about-to-buy local cart is real and should
        // survive. But if this device's local cart was stamped by a
        // *different* account (a shared/public computer, or a session that
        // expired without an explicit logout), it isn't this user's to see —
        // drop it rather than handing over whatever the previous person had.
        const lastOwner = localStorage.getItem(CART_OWNER_KEY);
        if (lastOwner && uid && lastOwner !== uid) {
          persist([]);
        }
      }

      if (uid) localStorage.setItem(CART_OWNER_KEY, uid);
    }).catch(() => {});
  }, [isLoggedIn, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // A fresh object literal here would give every consumer a new context value
  // on every provider render — the header badge, each product card and the
  // drawer would all re-render whenever anything above them changed.
  const value = useMemo(() => ({
    items, count, subtotal, giftWrap,
    addItem, updateQuantity, removeItem, clearCart, refreshStock, setGiftWrap,
  }), [items, count, subtotal, giftWrap, addItem, updateQuantity, removeItem, clearCart, refreshStock, setGiftWrap]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
