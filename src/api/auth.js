import { apiRequest } from './client';

/** AuthAPI — direct port, same endpoints + payloads */
export const AuthAPI = {
  register: (name, email, password, phone = '') =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone }),
    }),

  login: (email, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => apiRequest('/auth/me'),

  updateProfile: (updates) =>
    apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  addAddress: (address) =>
    apiRequest('/auth/addresses', {
      method: 'POST',
      body: JSON.stringify(address),
    }),

  deleteAddress: (addressId) =>
    apiRequest(`/auth/addresses/${addressId}`, { method: 'DELETE' }),

  requestPasswordReset: (email) =>
    apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyOTP: (email, otp) =>
    apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  resetPassword: (email, otp, newPassword) =>
    apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    }),
};
