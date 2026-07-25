import { apiRequest } from './client';

export const PaymentsAPI = {
  getPaymentMethods: (amount = 1) =>
    apiRequest(`/payments/methods?amount=${amount}`),

  createPaymentSession: (shippingAddress) =>
    apiRequest('/payments/create-session', {
      method: 'POST',
      body: JSON.stringify({ shippingAddress }),
    }),

  executePayment: (paymentMethodId, shippingAddress, promoCode) => {
    const payload = { paymentMethodId, shippingAddress };
    if (promoCode) payload.promoCode = promoCode;
    return apiRequest('/payments/execute', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  verifyPayment: (paymentId) =>
    apiRequest(`/payments/verify/${paymentId}`),

  processCOD: (shippingAddress, notes) =>
    apiRequest('/payments/cod', {
      method: 'POST',
      body: JSON.stringify({ shippingAddress, notes }),
    }),

  // Deema BNPL
  createDeemaCheckout: (data) =>
    apiRequest('/payments/deema/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyDeemaPayment: (chargeId) =>
    apiRequest(`/payments/deema/verify/${chargeId}`),
};
