import {
  createContext, useContext, useState, useCallback, useEffect, useMemo, useRef,
} from 'react';
import { CartAPI } from '../api/cart';
import { PricingAPI } from '../api/pricing';
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

  /* The login sync runs on isLoggedIn/uid alone — re-running it whenever the
   * bag changed would re-fetch the cart on every add. It still needs to see
   * the current bag to push a guest's up, so it reads these rather than
   * closing over stale state. */
  const itemsRef = useRef(items);
  const giftMessageRef = useRef('');

  // Derived once per basket change rather than on every provider render.
  /* Gift wrapping is chosen line by line, so the flag lives on each item and
   * only what applies to the whole parcel is held here: the one card message,
   * and the per-item price the server last quoted.
   *
   * `unitFee` is never computed here — a price the browser decides is a price
   * a customer can edit. It is quoted with the cart and only ever displayed;
   * the server charges from its own copy of the bag. */
  const [giftMessage, setGiftMessage] = useState('');
  /* Quoted by the server, for display only — a price the browser decides is a
   * price a customer can edit. Held in this single place; it used to be
   * written as `|| 3` on the product page, at checkout and on the admin
   * receipt, three copies to fall out of step the moment the real fee changed.
   *
   * 3 is the standing price and stands in only for the moment before the
   * quote lands, so the row is never blank. */
  const [unitFee, setUnitFee] = useState(3);

  /* Asked for once, on mount, because a signed-out shopper sees the wrapping
   * price on a product page without ever fetching a cart. */
  useEffect(() => {
    PricingAPI.get()
      .then(res => {
        const fee = Number(res?.data?.giftWrapFee);
        if (Number.isFinite(fee)) setUnitFee(fee);
      })
      .catch(() => {});
  }, []);

  const { count, subtotal } = useMemo(() => items.reduce(
    (acc, item) => {
      const qty = Number(item.quantity) || 1;
      acc.count += qty;
      acc.subtotal += (Number(item.price) || 0) * qty;
      return acc;
    },
    { count: 0, subtotal: 0 }
  ), [items]);

  const addItem = useCallback((product, quantity = 1, giftWrap = false) => {
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
      if (isLoggedIn) CartAPI.add(id, added, giftWrap).catch(() => {});

      let next;
      if (existing) {
        next = prev.map(i =>
          (i._id || i.id) === id
            ? {
              ...i,
              quantity: inCart + added,
              stock: available ?? i.stock,
              /* Adding a second one of something already in the bag can turn
                 wrapping on for that line, but must not turn it off — the
                 product page passes false simply by not asking. */
              giftWrap: giftWrap ? true : Boolean(i.giftWrap),
            }
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
          // Wrapping is a property of the line, not of the order.
          giftWrap: Boolean(giftWrap),
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
   * Wrap this line, or stop wrapping it.
   *
   * Applied locally first so the tick responds immediately, then confirmed by
   * the server, which is what actually decides the fee. A failure puts the
   * tick back where it was rather than leaving the customer believing an item
   * will be wrapped when the server never heard about it — and says so, which
   * is what was missing when the box appeared to untick itself for no reason.
   */
  const setItemGiftWrap = useCallback(async (id, enabled) => {
    /* Read before the optimistic write, not inside the updater: an updater is
       run by React when it chooses, so a value assigned from inside one is not
       reliably there by the time the request comes back and needs to undo it. */
    const line = itemsRef.current.find(i => (i._id || i.id) === id);
    const previous = line ? Boolean(line.giftWrap) : null;

    setItems(prev => {
      const next = prev.map(i => (
        (i._id || i.id) === id ? { ...i, giftWrap: Boolean(enabled) } : i
      ));
      localStorage.setItem('arteva_cart', JSON.stringify(next));
      return next;
    });

    // A guest's bag lives in localStorage and has no server copy to update.
    // The choice is carried up by the sync that runs when they sign in.
    if (!isLoggedIn) return { success: true };

    try {
      const res = await CartAPI.setItemGiftWrap(id, enabled);
      if (!res.success) throw new Error(res.message || 'Could not save gift wrapping');
      const quoted = Number(res.data?.unitFee);
      if (Number.isFinite(quoted)) setUnitFee(quoted);
      return res;
    } catch (err) {
      if (previous !== null) {
        setItems(prev => {
          const next = prev.map(i => (
            (i._id || i.id) === id ? { ...i, giftWrap: previous } : i
          ));
          localStorage.setItem('arteva_cart', JSON.stringify(next));
          return next;
        });
      }
      showToast(t('gift_wrap_failed'), 'error');
      return { success: false, message: err.message };
    }
  }, [isLoggedIn, t]);

  /** The one card message that goes with the parcel, whatever is wrapped. */
  const setGiftWrapMessage = useCallback(async (message = '') => {
    const previous = giftMessage;
    setGiftMessage(message);

    if (!isLoggedIn) return { success: true };

    try {
      const res = await CartAPI.setGiftMessage(message);
      if (!res.success) throw new Error(res.message || 'Could not save the message');
      return res;
    } catch (err) {
      setGiftMessage(previous);
      return { success: false, message: err.message };
    }
  }, [isLoggedIn, giftMessage]);

  const clearCart = useCallback(() => {
    if (isLoggedIn) CartAPI.clear().catch(() => {});
    // The server drops the wrapping request with the bag; mirror that here so
    // a card message does not survive into the next order. The per-line ticks
    // go with the lines.
    setGiftMessage('');
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

  /* What the whole parcel costs, derived from the lines rather than stored.
   *
   * One place decides whether this bag is being wrapped at all, so a screen
   * showing the totals and a screen showing the ticks cannot disagree. The
   * count is of wrapped lines, not units: two of the same candle ticked is
   * one gift and one fee, which is what the server charges.
   *
   * `fee` is a quote for display. The server prices the order from its own
   * copy of the bag and never trusts this number. */
  const giftWrap = useMemo(() => {
    const wrapped = items.filter(i => i.giftWrap);
    return {
      enabled: wrapped.length > 0,
      count: wrapped.length,
      /* A card message with nothing left to wrap is dead weight, and would
         reappear if the customer wrapped something else having forgotten it
         was there. The server drops it on the same condition. */
      message: wrapped.length > 0 ? giftMessage : '',
      unitFee,
      fee: parseFloat((wrapped.length * unitFee).toFixed(3)),
    };
  }, [items, giftMessage, unitFee]);

  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { giftMessageRef.current = giftMessage; }, [giftMessage]);

  const uid = user?._id || user?.id || null;

  // Sync with server when logged in.
  useEffect(() => {
    if (!isLoggedIn) return;

    CartAPI.get().then(res => {
      if (!res.success) return;
      const serverItems = res.data?.items || [];

      /* Restored on load, which is what carries the choice back across a
       * payment redirect and across devices. */
      if (res.data?.giftWrap) setGiftMessage(res.data.giftWrap.message || '');
      if (res.data?.giftWrapFee !== undefined) setUnitFee(Number(res.data.giftWrapFee) || 0);

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
            // Which lines are gifts, restored with the lines themselves.
            giftWrap: item.giftWrap === true,
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
        } else if (itemsRef.current.length) {
          /* The local bag survived, so it is now this account's bag. Push it
           * up whole — including which lines are gifts, which the server has
           * never been told about because the choice was made while signed
           * out. Without this the ticks a guest made are lost at sign-in. */
          CartAPI.replace(
            itemsRef.current.map(i => ({
              productId: i._id || i.id,
              quantity: i.quantity,
              giftWrap: Boolean(i.giftWrap),
            })),
            giftMessageRef.current
          ).catch(() => {});
        }
      }

      if (uid) localStorage.setItem(CART_OWNER_KEY, uid);
    }).catch(() => {});
  }, [isLoggedIn, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // A fresh object literal here would give every consumer a new context value
  // on every provider render — the header badge, each product card and the
  // drawer would all re-render whenever anything above them changed.
  const value = useMemo(() => ({
    items, count, subtotal, giftWrap, giftWrapUnitFee: unitFee,
    addItem, updateQuantity, removeItem, clearCart, refreshStock,
    setItemGiftWrap, setGiftWrapMessage,
  }), [
    items, count, subtotal, giftWrap, unitFee,
    addItem, updateQuantity, removeItem, clearCart, refreshStock,
    setItemGiftWrap, setGiftWrapMessage,
  ]);

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
