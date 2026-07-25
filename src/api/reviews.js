import { apiRequest } from './client';

export const ReviewsAPI = {
  getByProduct: (productId) => apiRequest(`/products/${productId}/reviews`),
  create: (productId, rating, comment) =>
    apiRequest(`/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    }),
  update: (productId, reviewId, rating, comment) =>
    apiRequest(`/products/${productId}/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify({ rating, comment }),
    }),
  delete: (productId, reviewId) =>
    apiRequest(`/products/${productId}/reviews/${reviewId}`, { method: 'DELETE' }),
};
