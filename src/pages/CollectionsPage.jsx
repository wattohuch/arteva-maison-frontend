import { useI18n } from '../contexts/I18nContext';
import { useCategories } from '../contexts/CategoriesContext';
import Loader from '../components/ui/Loader';
import CollectionCard from '../components/product/CollectionCard';
import { GridIcon } from '../components/ui/Icons';

export default function CollectionsPage() {
  const { t } = useI18n();
  const { categories, loading, error } = useCategories();

  if (loading) {
    return <div className="page-loading"><Loader text={t('loading')} /></div>;
  }

  if (error && categories.length === 0) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty-state">
            <span className="empty-state-icon"><GridIcon size={28} /></span>
            <h3>{t('categories_unavailable')}</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <div className="section-header-text">
            <span className="eyebrow">{t('collections')}</span>
            <h1>{t('all_collections')}</h1>
            <p>{t('browse_collections')}</p>
          </div>
        </div>

        <div className="collections-grid">
          {categories.map(cat => (
            <CollectionCard key={cat._id || cat.id || cat.slug} category={cat} />
          ))}
        </div>
      </div>
    </div>
  );
}
