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

  /**
   * Ask for gift wrapping on this bag.
   *
   * Stored on the cart rather than sent with the order, because checkout hands
   * the customer to a payment gateway and gets them back on a different
   * request — a choice held only in the browser would not survive that. The
   * price is not sent; the server applies it when the order is created.
   */
  setGiftWrap: (enabled, message = '') => {
    if (!getAuthToken()) return Promise.resolve({ success: false });
    return apiRequest('/cart/gift-wrap', {
      method: 'PUT',
      body: JSON.stringify({ enabled, message }),
    });
  },
};
