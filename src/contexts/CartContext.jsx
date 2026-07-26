import {
  createContext, useContext, useState, useCallback, useEffect, useMemo,
} from 'react';
import { CartAPI } from '../api/cart';
import { trackAddToCart } from '../utils/metaPixel';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isLoggedIn } = useAuth();

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

    setItems(prev => {
      const id = product._id || product.id;
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
  }, []);

  const updateQuantity = useCallback((id, quantity) => {
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
  }, []);

  const removeItem = useCallback((id) => {
    setItems(prev => {
      const next = prev.filter(i => (i._id || i.id) !== id);
      localStorage.setItem('arteva_cart', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    persist([]);
  }, [persist]);

  // Sync with server when logged in
  useEffect(() => {
    if (isLoggedIn) {
      CartAPI.get().then(res => {
        if (res.success && res.data?.items?.length) {
          const normalized = res.data.items.map(item => {
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
        }
      }).catch(() => {});
    }
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

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
