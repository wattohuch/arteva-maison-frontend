import { apiRequest } from './client';

export const DriverAPI = {
  getAssignedOrders: () => apiRequest('/driver/orders'),
  updateStatus: (orderId, status) =>
    apiRequest(`/driver/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
};
