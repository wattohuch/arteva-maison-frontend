import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';
import { useCategories } from '../../contexts/CategoriesContext';
import './CollectionCard.css';

const PLACEHOLDER = '/assets/images/categories/placeholder.jpg';

/** Image tile with an overlaid caption — shared by the home rail and the collections grid. */
const CollectionCard = memo(function CollectionCard({ category }) {
  const { t } = useI18n();
  const { getCategoryName } = useCategories();

  const slug = category.slug || category._id;
  const itemCount = category.productCount ?? category.count;

  return (
    <Link to={`/collection/${slug}`} className="collection-card">
      <div className="collection-media">
        <img
          src={category.image || PLACEHOLDER}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="collection-caption">
        <h3>{getCategoryName(category)}</h3>
        {Number.isFinite(itemCount) && <span>{itemCount} {t('items_unit')}</span>}
      </div>
    </Link>
  );
});

export default CollectionCard;
