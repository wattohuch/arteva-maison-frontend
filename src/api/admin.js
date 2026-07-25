import { apiRequest, apiUpload, apiText } from './client';

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
    apiRequest('/admin/products/reorder', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),

  // ── Discounts ──
  applyDiscount: (id, discountedPrice, compareAtPrice) =>
    apiRequest(`/admin/products/${id}/discount`, {
      method: 'PUT',
      body: JSON.stringify({ discountedPrice, compareAtPrice }),
    }),

  // ── Orders ──
  getOrders: () => apiRequest('/admin/orders'),
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

  // ── Revenue / Auth ──
  checkSuperuser: () => apiRequest('/admin/check-superuser'),
  setRevenuePassword: (revenuePassword) =>
    apiRequest('/admin/set-revenue-password', {
      method: 'POST',
      body: JSON.stringify({ revenuePassword }),
    }),
  authenticateRevenueAccess: (revenuePassword) =>
    apiRequest('/admin/revenue-auth', {
      method: 'POST',
      body: JSON.stringify({ revenuePassword }),
    }),
  requestRevenueOTP: () =>
    apiRequest('/admin/revenue-otp/request', { method: 'POST' }),
  verifyRevenueOTP: (otp) =>
    apiRequest('/admin/revenue-otp/verify', {
      method: 'POST',
      body: JSON.stringify({ otp }),
    }),
  getRevenueHistory: () => apiRequest('/admin/revenue-history'),
  getRevenueAnalytics: () => apiRequest('/admin/revenue-analytics'),
  getReceipt: (orderId) => apiText(`/admin/receipt/${orderId}`),

  // ── Analytics ──
  getProductAnalytics: () => apiRequest('/admin/analytics/product-views'),
  getVisitorLog: () => apiRequest('/admin/analytics/visitor-log'),

  // ── Visitors (Site Visits) ──
  getSiteVisits: (params = '') => apiRequest(`/admin/site-visits${params}`),
  getSiteVisitLog: (params = '') => apiRequest(`/admin/site-visits/log${params}`),

  // ── Categories Admin ──
  getCategories: () => apiRequest('/categories'),
  createCategory: (formData) => apiUpload('/admin/categories', 'POST', formData),
  updateCategory: (id, formData) => apiUpload(`/admin/categories/${id}`, 'PUT', formData),
  deleteCategory: (id) => apiRequest(`/admin/categories/${id}`, { method: 'DELETE' }),
  reorderCategories: (items) =>
    apiRequest('/admin/categories/reorder', {
      method: 'PUT',
      body: JSON.stringify({ items }),
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
