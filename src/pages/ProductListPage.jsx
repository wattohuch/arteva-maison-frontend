import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { ProductsAPI } from '../api/products';
import ProductCard from '../components/product/ProductCard';
import Loader from '../components/ui/Loader';
import './ProductListPage.css';

export default function ProductListPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('featured');

  const searchQuery = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = {};
    if (searchQuery) params.search = searchQuery;
    if (category) params.category = category;

    ProductsAPI.getAll(params).then(res => {
      if (!cancelled) {
        setProducts(res.data || res || []);
        setLoading(false);
      }
    }).catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [searchQuery, category]);

  const sorted = useMemo(() => {
    const list = [...products];
    switch (sort) {
      case 'price_low': return list.sort((a, b) => a.price - b.price);
      case 'price_high': return list.sort((a, b) => b.price - a.price);
      case 'newest': return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'name': return list.sort((a, b) => a.name.localeCompare(b.name));
      default: return list;
    }
  }, [products, sort]);

  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <div className="section-header-text">
            <span className="eyebrow">{searchQuery ? t('search') : t('collections')}</span>
            <h1>{searchQuery ? `“${searchQuery}”` : t('all_collections')}</h1>
            <p>{t('browse_collections')}</p>
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
            <option value="name">{t('sort_name')}</option>
          </select>
        </div>

        {loading ? (
          <div className="page-loading"><Loader text={t('loading')} /></div>
        ) : sorted.length === 0 ? (
          <div className="empty-state"><p>{t('no_products')}</p></div>
        ) : (
          <div className="products-grid">
            {sorted.map(p => <ProductCard key={p._id || p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
