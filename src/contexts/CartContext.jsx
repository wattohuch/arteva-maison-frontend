import {
  createContext, useContext, useState, useCallback, useEffect, useMemo,
} from 'react';
import { CartAPI } from '../api/cart';
import { trackAddToCart } from '../utils/metaPixel';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

/** Whose cart is currently sitting in localStorage — set on every login-time
 *  sync so a later login can tell "my own cart, still here" apart from
 *  "someone else's leftovers on this device". */
const CART_OWNER_KEY = 'arteva_cart_owner';

export function CartProvider({ children }) {
  const { isLoggedIn, user } = useAuth();

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
    // Reported here rather than in each button, so every route into the basket
    // — card, detail page, drawer — is counted exactly once.
    trackAddToCart(product, quantity);

    const id = product._id || product.id;
    // Fire-and-forget: so the admin cart view (and any other device the same
    // account is logged into) sees this without waiting on checkout.
    if (isLoggedIn) CartAPI.add(id, quantity).catch(() => {});

    setItems(prev => {
      const existing = prev.find(i => (i._id || i.id) === id);
      let next;
      if (existing) {
        next = prev.map(i =>
          (i._id || i.id) === id ? { ...i, quantity: (Number(i.quantity) || 1) + quantity } : i
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
          quantity: Number(quantity) || 1,
        }];
      }
      localStorage.setItem('arteva_cart', JSON.stringify(next));
      return next;
    });
  }, [isLoggedIn]);

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
        const next = prev.map(i => (i._id || i.id) === id ? { ...i, quantity } : i);
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
          return {
            id,
            _id: id,
            name,
            nameAr,
            price,
            image,
            quantity,
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
