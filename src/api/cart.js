import { apiRequest } from './client';
import { getAuthToken } from './client';

export const CartAPI = {
  get: () => {
    if (!getAuthToken()) return Promise.resolve({ success: true, data: { items: [] } });
    return apiRequest('/cart');
  },

  add: (productId, quantity = 1) =>
    apiRequest('/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    }),

  update: (productId, quantity) =>
    apiRequest(`/cart/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    }),

  remove: (productId) =>
    apiRequest(`/cart/${productId}`, { method: 'DELETE' }),

  clear: () => {
    if (!getAuthToken()) return Promise.resolve({ success: true });
    return apiRequest('/cart', { method: 'DELETE' });
  },
};
