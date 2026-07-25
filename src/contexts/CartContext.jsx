import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CartAPI } from '../api/cart';
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

  const count = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 1;
    return sum + (price * qty);
  }, 0);

  const addItem = useCallback((product, quantity = 1) => {
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

  return (
    <CartContext.Provider value={{
      items, count, subtotal,
      addItem, updateQuantity, removeItem, clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
