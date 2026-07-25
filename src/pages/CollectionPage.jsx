import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { ProductsAPI } from '../api/products';
import { CategoriesAPI } from '../api/categories';
import ProductCard from '../components/product/ProductCard';
import Loader from '../components/ui/Loader';
import './ProductListPage.css'; // shared listing toolbar

export default function CollectionPage() {
  const { slug } = useParams();
  const { t, lang } = useI18n();
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('featured');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      CategoriesAPI.getBySlug(slug).catch(() => null),
      ProductsAPI.getAll({ category: slug }),
    ]).then(([catRes, prodRes]) => {
      if (cancelled) return;
      if (catRes?.data) setCategory(catRes.data);
      setProducts(prodRes?.data || prodRes || []);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  const sorted = useMemo(() => {
    const list = [...products];
    switch (sort) {
      case 'price_low': return list.sort((a, b) => a.price - b.price);
      case 'price_high': return list.sort((a, b) => b.price - a.price);
      case 'newest': return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      default: return list;
    }
  }, [products, sort]);

  const catName = category ? (lang === 'ar' && category.nameAr ? category.nameAr : category.name) : slug;

  if (loading) return <div className="page-loading"><Loader text={t('loading')} /></div>;

  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <div className="section-header-text">
            <span className="eyebrow">{t('collections')}</span>
            <h1>{catName}</h1>
          </div>
        </div>
        <div className="list-toolbar">
          <span className="list-count">{sorted.length} {t('products_count')}</span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="sort-select"
            aria-label={t('sort_featured')}
          >
            <option value="featured">{t('sort_featured')}</option>
            <option value="price_low">{t('sort_price_low')}</option>
            <option value="price_high">{t('sort_price_high')}</option>
            <option value="newest">{t('sort_newest')}</option>
          </select>
        </div>
        {sorted.length === 0 ? (
          <div className="empty-state"><p>{t('no_products')}</p></div>
        ) : (
          <div className="products-grid">{sorted.map(p => <ProductCard key={p._id || p.id} product={p} />)}</div>
        )}
      </div>
    </div>
  );
}
