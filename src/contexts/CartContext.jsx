import {
  createContext, useContext, useState, useCallback, useEffect, useMemo,
} from 'react';
import { CartAPI } from '../api/cart';
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

  const clearCart = useCallback(() => {
    if (isLoggedIn) CartAPI.clear().catch(() => {});
    persist([]);
  }, [persist, isLoggedIn]);

  const uid = user?._id || user?.id || null;

  // Sync with server when logged in.
  useEffect(() => {
    if (!isLoggedIn) return;

    CartAPI.get().then(res => {
      if (!res.success) return;
      const serverItems = res.data?.items || [];

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
    items, count, subtotal,
    addItem, updateQuantity, removeItem, clearCart,
  }), [items, count, subtotal, addItem, updateQuantity, removeItem, clearCart]);

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
