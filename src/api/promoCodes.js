import { apiRequest } from './client';

export const PromoAPI = {
  /** Price a code against a basket. Returns the same numbers checkout will charge. */
  validate: (code, cartItems) =>
    apiRequest('/promo-codes/validate', {
      method: 'POST',
      body: JSON.stringify({ code, cartItems }),
    }),

  /**
   * Record that a visitor arrived carrying a code.
   *
   * Fire-and-forget by design: tracking must never delay or break a page load,
   * so callers ignore the rejection. `keepalive` lets the request survive the
   * navigation that follows a promo link.
   */
  trackVisit: (payload) =>
    apiRequest('/promo-codes/track-visit', {
      method: 'POST',
      body: JSON.stringify(payload),
      keepalive: true,
      timeout: 8000,
    }),

  // ── Admin ──
  getAnalytics: (params = '') => apiRequest(`/admin/promo-codes/analytics${params}`),
  getStats: (id) => apiRequest(`/admin/promo-codes/${id}/stats`),
};
