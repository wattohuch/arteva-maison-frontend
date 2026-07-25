import { apiRequest, apiUpload } from './client';

export const HeroAPI = {
  getSlides: () => apiRequest('/hero'),
  getAllSlides: () => apiRequest('/hero/all'),
  createSlide: (formData) => apiUpload('/hero', 'POST', formData),
  updateSlide: (id, formData) => apiUpload(`/hero/${id}`, 'PUT', formData),
  deleteSlide: (id) => apiRequest(`/hero/${id}`, { method: 'DELETE' }),
  reorderSlides: (items) =>
    apiRequest('/hero/reorder', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),
};
