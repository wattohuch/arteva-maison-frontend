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

  cancelOrder: (id, reason) =>
    apiRequest(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  checkCanCancel: (id) => apiRequest(`/orders/${id}/can-cancel`),
};
