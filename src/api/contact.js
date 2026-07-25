import { apiRequest } from './client';

export const ContactAPI = {
  sendMessage: (contactData) =>
    apiRequest('/contact', {
      method: 'POST',
      body: JSON.stringify(contactData),
    }),
};
