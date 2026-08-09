import { apiRequest } from './client';

/**
 * Page size for the listing pages.
 *
 * `/api/products` defaults to 12 per page. The listing pages ask for no page
 * size, sort what comes back in the browser, and print `list.length` as the
 * product count — so every collection silently claimed to hold 12 products
 * and hid the rest. Asking for a page big enough to cover the catalogue is
 * what those pages already assume; `getEvery` below makes the assumption safe
 * if the catalogue ever outgrows it.
 */
const LISTING_PAGE_SIZE = 200;

/** ProductsAPI — direct port, same endpoints */
export const ProductsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/products${query ? '?' + query : ''}`);
  },

  /**
   * Every product matching `params`, not just the first page.
   *
   * One request in the normal case; a second only if the match set is larger
   * than a full page, which the catalogue is nowhere near today.
   */
  getEvery: async (params = {}) => {
    const first = await ProductsAPI.getAll({ ...params, limit: LISTING_PAGE_SIZE });
    const items = first?.data || [];
    const total = first?.pagination?.total ?? items.length;

    if (items.length >= total) return first;
    return ProductsAPI.getAll({ ...params, limit: total });
  },

  getById: (id) => apiRequest(`/products/${id}`),

  getBySlug: (slug) => apiRequest(`/products/slug/${slug}`),

  getFeatured: (limit = 8) => apiRequest(`/products/featured?limit=${limit}`),

  getCollectionFeatured: (limit = 12) =>
    apiRequest(`/products/collection-featured?limit=${limit}`),

  search: (query, options = {}) =>
    ProductsAPI.getAll({ search: query, ...options }),

  incrementView: (id) =>
    apiRequest(`/products/${id}/view`, { method: 'POST' }),
};
