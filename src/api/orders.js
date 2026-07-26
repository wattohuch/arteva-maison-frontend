import { apiRequest } from './client';

export const OrdersAPI = {
  create: (orderData) =>
    apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),

  getMyOrders: (page = 1, limit = 10) =>
    apiRequest(`/orders?page=${page}&limit=${limit}`),

  getById: (id) => apiRequest(`/orders/${id}`),

  /**
   * Look an order up by its human-readable number rather than its database id.
   * Backed by GET /orders/by-number/:orderNumber, which enforces that the
   * caller owns the order (or is staff).
   */
  trackByNumber: (orderNumber) =>
    apiRequest(`/orders/by-number/${encodeURIComponent(orderNumber)}`),

  cancelOrder: (id, reason) =>
    apiRequest(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  checkCanCancel: (id) => apiRequest(`/orders/${id}/can-cancel`),
};
