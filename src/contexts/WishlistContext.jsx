import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

/**
 * Presentation-layer wishlist.
 *
 * The reference design puts a wishlist in the navbar and on every product
 * card, but there is no wishlist endpoint on the backend. This keeps the
 * saved items entirely in localStorage so the UI is complete without
 * touching the API, auth, or any business logic.
 */

const STORAGE_KEY = 'arteva_wishlist';
const WishlistContext = createContext(null);

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch { /* storage full or blocked — wishlist is non-critical */ }
  }, [items]);

  const has = useCallback(
    (id) => items.some(i => (i._id || i.id) === id),
    [items]
  );

  /** Returns true when the product ended up saved, false when removed. */
  const toggle = useCallback((product) => {
    const id = product?._id || product?.id;
    if (!id) return false;
    const exists = items.some(i => (i._id || i.id) === id);
    setItems(prev => exists
      ? prev.filter(i => (i._id || i.id) !== id)
      : [...prev, product]);
    return !exists;
  }, [items]);

  const remove = useCallback((id) => {
    setItems(prev => prev.filter(i => (i._id || i.id) !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, count: items.length, has, toggle, remove, clear }),
    [items, has, toggle, remove, clear]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
