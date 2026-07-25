import { apiRequest } from './client';

/** ProductsAPI — direct port, same endpoints */
export const ProductsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/products${query ? '?' + query : ''}`);
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
