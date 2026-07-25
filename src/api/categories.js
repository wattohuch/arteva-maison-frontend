import { apiRequest } from './client';

export const CategoriesAPI = {
  getAll: () => apiRequest('/categories'),
  getById: (id) => apiRequest(`/categories/${id}`),
  getBySlug: (slug) => apiRequest(`/categories/slug/${slug}`),
};
