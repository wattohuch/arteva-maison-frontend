import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react';
import { CategoriesAPI } from '../api/categories';
import { useI18n } from './I18nContext';

const CategoriesContext = createContext(null);

export function CategoriesProvider({ children }) {
  const { lang } = useI18n();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await CategoriesAPI.getAll();
      const catData = Array.isArray(res) ? res : (res?.data || res?.categories || []);
      // Sort by sortOrder if present, preserving backend order
      const sorted = [...catData].sort((a, b) => (a.sortOrder ?? a.displayOrder ?? a.order ?? 0) - (b.sortOrder ?? b.displayOrder ?? b.order ?? 0));
      setCategories(sorted);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError('Unable to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  /**
   * Helper to get localized category name
   */
  const getCategoryName = useCallback((category) => {
    if (!category) return '';
    if (lang === 'ar' && category.nameAr) return category.nameAr;
    return category.name || category.title || '';
  }, [lang]);

  const value = useMemo(() => ({
    categories,
    loading,
    error,
    getCategoryName,
    refetchCategories: fetchCategories,
  }), [categories, loading, error, getCategoryName, fetchCategories]);

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) {
    throw new Error('useCategories must be used within CategoriesProvider');
  }
  return ctx;
}
