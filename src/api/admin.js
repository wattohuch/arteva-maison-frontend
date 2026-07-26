import { apiRequest, apiUpload, apiText, getRevenueToken, setRevenueToken } from './client';

/** Header carrying the revenue unlock token, when one has been obtained. */
const revenueHeaders = () => {
  const token = getRevenueToken();
  return token ? { 'X-Revenue-Token': token } : {};
};

/** AdminAPI — all admin endpoints matching vanilla admin.js */
export const AdminAPI = {
  // ── Dashboard ──
  getStats: () => apiRequest('/admin/stats'),

  // ── Products ──
  getProducts: () => apiRequest('/admin/products'),
  createProduct: (formData) => apiUpload('/admin/products', 'POST', formData),
  updateProduct: (id, formData) => apiUpload(`/admin/products/${id}`, 'PUT', formData),
  deleteProduct: (id) => apiRequest(`/admin/products/${id}`, { method: 'DELETE' }),
  reorderProducts: (items) =>
    apiRequest('/products/reorder', {
      method: 'PUT',
      body: JSON.stringify({ products: items }),
    }),

  // ── Discounts ──
  applyDiscount: (id, discountedPrice, compareAtPrice) =>
    apiRequest(`/admin/products/${id}/discount`, {
      method: 'PUT',
      body: JSON.stringify({ discountedPrice, compareAtPrice }),
    }),

  // ── Orders ──
  /**
   * @param {Object} params source|status|paymentStatus|search|from|to|page|limit
   * Filtering happens server-side; the client no longer downloads every order
   * on every visit to the Orders page.
   */
  getOrders: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return apiRequest(`/admin/orders${qs ? `?${qs}` : ''}`);
  },
  updateOrderStatus: (id, status) =>
    apiRequest(`/admin/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  assignDriver: (orderId, driverId) =>
    apiRequest(`/admin/orders/${orderId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ driverId }),
    }),

  // ── Manual receipts (orders created in the receipt generator) ──
  createOrder: (data) =>
    apiRequest('/admin/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateOrderReceipt: (id, data) =>
    apiRequest(`/admin/orders/${id}/receipt`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  refundOrder: (id, payload) =>
    apiRequest(`/admin/orders/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  /** Owner only — restores stock and releases the promo use. */
  deleteOrder: (id) => apiRequest(`/admin/orders/${id}`, { method: 'DELETE' }),

  // ── Revenue ──
  // Every read here also carries the unlock token from the revenue password
  // prompt; without it the server answers 403 REVENUE_LOCKED.
  getRevenueOverview: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return apiRequest(`/admin/revenue/overview${qs ? `?${qs}` : ''}`, { headers: revenueHeaders() });
  },

  // ── Users ──
  getUsers: () => apiRequest('/admin/users'),
  updateUserRole: (id, role) =>
    apiRequest(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
  deleteUser: (id) => apiRequest(`/admin/users/${id}`, { method: 'DELETE' }),

  // ── Email Marketing ──
  sendEmail: (data) =>
    apiRequest('/admin/send-email', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  sendEmailWithImages: (formData) => apiUpload('/admin/send-email', 'POST', formData),

  /** What Mailgun itself reports: domain state, and why recent sends failed. */
  getEmailDiagnostics: () => apiRequest('/admin/email-diagnostics'),

  // ── Revenue / Auth ──
  checkSuperuser: () => apiRequest('/admin/check-superuser'),

  /** Whether this account can open revenue, and whether a password exists yet. */
  getRevenueAccessStatus: () => apiRequest('/admin/revenue/status'),

  setRevenuePassword: (revenuePassword) =>
    apiRequest('/admin/set-revenue-password', {
      method: 'POST',
      body: JSON.stringify({ revenuePassword }),
    }),

  /**
   * Exchange the revenue password for a short-lived unlock token.
   *
   * `persist: false` returns the token without storing it, for the dashboard
   * tile: holding it in component state alone means the reveal cannot outlive
   * the component's own timer, so the password is genuinely required again
   * once the tile re-blurs.
   */
  authenticateRevenueAccess: async (revenuePassword, { persist = true } = {}) => {
    const res = await apiRequest('/admin/revenue-auth', {
      method: 'POST',
      body: JSON.stringify({ revenuePassword }),
    });
    if (persist && res?.revenueToken) setRevenueToken(res.revenueToken);
    return res;
  },

  /** Headline revenue total. Needs an explicit unlock token. */
  getRevenueTotal: (token) =>
    apiRequest('/admin/revenue/total', {
      headers: token ? { 'X-Revenue-Token': token } : revenueHeaders(),
    }),

  /** Drops the unlock token — the next revenue read will require the password. */
  lockRevenue: () => setRevenueToken(null),
  requestRevenueOTP: () =>
    apiRequest('/admin/revenue-otp/request', { method: 'POST' }),
  verifyRevenueOTP: (otp) =>
    apiRequest('/admin/revenue-otp/verify', {
      method: 'POST',
      body: JSON.stringify({ otp }),
    }),
  getRevenueHistory: () => apiRequest('/admin/revenue-history', { headers: revenueHeaders() }),
  getRevenueAnalytics: () => apiRequest('/admin/revenue-analytics', { headers: revenueHeaders() }),
  getReceipt: (orderId) => apiText(`/admin/receipt/${orderId}`),

  // ── Analytics ──
  getProductAnalytics: () => apiRequest('/admin/analytics/product-views'),
  getVisitorLog: () => apiRequest('/admin/analytics/visitor-log'),

  // ── Visitors (Site Visits) ──
  getSiteVisits: (params = '') => apiRequest(`/admin/analytics/site-visits${params}`),
  getSiteVisitLog: (params = '') => apiRequest(`/admin/analytics/visitor-log${params}`),

  // ── Categories Admin ──
  getCategories: () => apiRequest('/categories'),
  createCategory: (formData) => apiUpload('/admin/categories', 'POST', formData),
  updateCategory: (id, formData) => apiUpload(`/admin/categories/${id}`, 'PUT', formData),
  deleteCategory: (id) => apiRequest(`/admin/categories/${id}`, { method: 'DELETE' }),
  reorderCategories: (items) =>
    apiRequest('/categories/reorder', {
      method: 'PUT',
      body: JSON.stringify({ categories: items }),
    }),

  // ── Hero Slides ──
  getHeroSlides: () => apiRequest('/hero/all'),
  createHeroSlide: (formData) => apiUpload('/hero', 'POST', formData),
  updateHeroSlide: (id, formData) => apiUpload(`/hero/${id}`, 'PUT', formData),
  deleteHeroSlide: (id) => apiRequest(`/hero/${id}`, { method: 'DELETE' }),

  // ── Site Settings (Social Contacts) ──
  getSiteSettings: () => apiRequest('/admin/site-settings'),
  updateSiteSettings: (data) =>
    apiRequest('/admin/site-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // ── Promo Codes ──
  getPromoCodes: () => apiRequest('/admin/promo-codes'),
  createPromoCode: (data) =>
    apiRequest('/admin/promo-codes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePromoCode: (id, data) =>
    apiRequest(`/admin/promo-codes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deletePromoCode: (id) => apiRequest(`/admin/promo-codes/${id}`, { method: 'DELETE' }),
  getPromoCodeDetails: (id) => apiRequest(`/admin/promo-codes/${id}`),
  getPromoCodeStats: (id) => apiRequest(`/admin/promo-codes/${id}/stats`),
  addProductsToPromo: (promoId, productsArray) =>
    apiRequest(`/admin/promo-codes/${promoId}/products`, {
      method: 'POST',
      body: JSON.stringify({ products: productsArray }),
    }),
  removeProductFromPromo: (promoId, productId) =>
    apiRequest(`/admin/promo-codes/${promoId}/products/${productId}`, { method: 'DELETE' }),
  addPromoProduct: (promoId, data) =>
    apiRequest(`/admin/promo-codes/${promoId}/products`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removePromoProduct: (promoId, productId) =>
    apiRequest(`/admin/promo-codes/${promoId}/products/${productId}`, { method: 'DELETE' }),
  updatePromoProducts: (promoId, data) =>
    apiRequest(`/admin/promo-codes/${promoId}/products`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  enablePromoForAllProducts: (promoId, data) =>
    apiRequest(`/admin/promo-codes/${promoId}/enable-all`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ── Delivery Tracking ──
  trackDelivery: (orderNumber) => apiRequest(`/delivery/track/${orderNumber}`),
};
