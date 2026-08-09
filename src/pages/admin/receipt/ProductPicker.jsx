import { useMemo, useState } from 'react';
import { SearchIcon } from '../../../components/ui/Icons';
import {
  resolveImageUrl, getProductImage, cloudinaryImage, handleImageError,
} from '../../../utils/imageHelpers';
import './ProductPicker.css';

/* ============================================
   ARTÉVA — Catalogue product picker

   Replaces a single <select> holding the whole catalogue. Two products in
   this catalogue are routinely distinguishable only by their photo and their
   size suffix — "Emerald serving plate ( small )" against "( Large )", three
   sizes of the same vase — and a dropdown of names asks whoever is at the
   counter to remember which is which. So: choose a category, then see that
   category's products as tiles with their pictures.

   Categories are derived from the products themselves rather than fetched,
   which costs no request and means a category with nothing in it never
   appears as an empty shelf. Grouping is by primary category only; anything
   filed elsewhere as well is still reachable through the search box.
   ============================================ */

const ALL = '__all__';
const UNCATEGORISED = '__none__';

const kwd = (n) => `${(Number(n) || 0).toFixed(3)} KWD`;

function categoryOf(product) {
  const cat = product?.category;
  if (cat && typeof cat === 'object') {
    return { id: String(cat._id || UNCATEGORISED), name: cat.name || 'Uncategorised' };
  }
  return { id: UNCATEGORISED, name: 'Uncategorised' };
}

export default function ProductPicker({
  products,
  selectedId = '',
  onSelect,
  label = 'Add a product',
  hint = 'Pick a category, then tap a product to add it.',
}) {
  const [categoryId, setCategoryId] = useState('');
  const [query, setQuery] = useState('');

  const categories = useMemo(() => {
    const byId = new Map();
    products.forEach(p => {
      const { id, name } = categoryOf(p);
      const entry = byId.get(id) || { id, name, count: 0 };
      entry.count += 1;
      byId.set(id, entry);
    });
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const term = query.trim().toLowerCase();

  const visible = useMemo(() => {
    // A search with no category chosen looks through everything — that is the
    // point of reaching for the search box rather than the chips.
    const scope = (!categoryId || categoryId === ALL)
      ? products
      : products.filter(p => categoryOf(p).id === categoryId);

    if (!term) return scope;
    return scope.filter(p =>
      (p.name || '').toLowerCase().includes(term)
      || (p.nameAr || '').toLowerCase().includes(term)
      || (p.sku || '').toLowerCase().includes(term)
    );
  }, [products, categoryId, term]);

  const chosenNothing = !categoryId && !term;

  return (
    <div className="pp">
      <div className="pp-head">
        <span className="pp-label">{label}</span>
        <span className="pp-hint">{hint}</span>
      </div>

      <div className="pp-cats" role="tablist" aria-label="Product categories">
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={categoryId === cat.id}
            className={`pp-cat ${categoryId === cat.id ? 'is-active' : ''}`}
            onClick={() => setCategoryId(categoryId === cat.id ? '' : cat.id)}
          >
            {cat.name}
            <span className="pp-cat-count">{cat.count}</span>
          </button>
        ))}
        {categories.length > 1 && (
          <button
            type="button"
            role="tab"
            aria-selected={categoryId === ALL}
            className={`pp-cat pp-cat--all ${categoryId === ALL ? 'is-active' : ''}`}
            onClick={() => setCategoryId(categoryId === ALL ? '' : ALL)}
          >
            All products
            <span className="pp-cat-count">{products.length}</span>
          </button>
        )}
      </div>

      <div className="pp-search">
        <SearchIcon size={15} />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name or SKU"
          aria-label="Search products"
          spellCheck={false}
        />
      </div>

      {chosenNothing ? (
        <p className="pp-empty">Choose a category above to see its products.</p>
      ) : visible.length === 0 ? (
        <p className="pp-empty">No products match.</p>
      ) : (
        <div className="pp-grid">
          {visible.map(p => {
            const stock = typeof p.stock === 'number' ? p.stock : null;
            const image = cloudinaryImage(resolveImageUrl(getProductImage(p)), 240);

            return (
              <button
                key={p._id}
                type="button"
                className={`pp-tile ${selectedId === p._id ? 'is-selected' : ''}`}
                onClick={() => onSelect(p)}
                title={p.name}
              >
                <span className="pp-tile-media">
                  <img src={image} alt="" loading="lazy" onError={handleImageError} />
                  {stock === 0 && <span className="pp-tile-flag">Out of stock</span>}
                </span>
                <span className="pp-tile-name">{p.name}</span>
                {p.sku && <span className="pp-tile-sku">{p.sku}</span>}
                <span className="pp-tile-foot">
                  <strong>{kwd(p.price)}</strong>
                  {stock !== null && (
                    <em className={stock === 0 ? 'is-out' : ''}>{stock} in stock</em>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
