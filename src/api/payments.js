import { apiRequest } from './client';

export const PaymentsAPI = {
  getPaymentMethods: (amount = 1) =>
    apiRequest(`/payments/methods?amount=${amount}`),

  createPaymentSession: (shippingAddress) =>
    apiRequest('/payments/create-session', {
      method: 'POST',
      body: JSON.stringify({ shippingAddress }),
    }),

  executePayment: (paymentMethodId, shippingAddress, promoCode, promoVisitId) => {
    const payload = { paymentMethodId, shippingAddress };
    if (promoCode) payload.promoCode = promoCode;
    // Links the resulting order back to the click that brought the shopper in.
    if (promoVisitId) payload.promoVisitId = promoVisitId;
    return apiRequest('/payments/execute', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Open an Apple Pay merchant session.
   *
   * Merchant validation requires the gateway secret key, so it cannot happen
   * in the browser. Returns the gateway-resolved Apple Pay method id, which is
   * per-merchant and must not be hardcoded.
   */
  initApplePaySession: (amount) =>
    apiRequest('/payments/applepay/session', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

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
