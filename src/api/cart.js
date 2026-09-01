import { apiRequest } from './client';
import { getAuthToken } from './client';

export const CartAPI = {
  get: () => {
    if (!getAuthToken()) return Promise.resolve({ success: true, data: { items: [] } });
    return apiRequest('/cart');
  },

  /**
   * Add to the bag, saying in the same breath whether this line is a gift.
   *
   * The wrap choice travels with the add rather than in a request behind it.
   * Two requests race, and on a first-ever add the second one arrived before
   * the cart existed and came back an error the storefront rolled back — which
   * is what made the tick appear to undo itself.
   */
  add: (productId, quantity = 1, giftWrap) =>
    apiRequest('/cart', {
      method: 'POST',
      body: JSON.stringify(
        giftWrap === undefined
          ? { productId, quantity }
          : { productId, quantity, giftWrap }
      ),
    }),

  update: (productId, quantity) =>
    apiRequest(`/cart/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    }),

  remove: (productId) =>
    apiRequest(`/cart/${productId}`, { method: 'DELETE' }),

  clear: () => {
    if (!getAuthToken()) return Promise.resolve({ success: true });
    return apiRequest('/cart', { method: 'DELETE' });
  },

  /**
   * Ask for gift wrapping on one line of this bag.
   *
   * Stored on the cart rather than sent with the order, because checkout hands
   * the customer to a payment gateway and gets them back on a different
   * request — a choice held only in the browser would not survive that. The
   * price is not sent; the server applies it when the order is created,
   * charging once per wrapped line.
   */
  setItemGiftWrap: (productId, enabled) => {
    if (!getAuthToken()) return Promise.resolve({ success: false });
    return apiRequest('/cart/gift-wrap', {
      method: 'PUT',
      body: JSON.stringify({ productId, enabled }),
    });
  },

  /** The one card message that goes with the parcel, whatever is wrapped. */
  setGiftMessage: (message = '') => {
    if (!getAuthToken()) return Promise.resolve({ success: false });
    return apiRequest('/cart/gift-wrap', {
      method: 'PUT',
      body: JSON.stringify({ message }),
    });
  },

  /**
   * Replace the whole bag in one write.
   *
   * Checkout used to sync by clearing the cart and re-adding every line.
   * Clearing a cart drops its wrapping, so the selection was destroyed a
   * moment before the order was built from it: the customer saw the fee in
   * the total they agreed to and the gift went out unwrapped.
   */
  replace: (items, message) => {
    if (!getAuthToken()) return Promise.resolve({ success: false });
    return apiRequest('/cart', {
      method: 'PUT',
      body: JSON.stringify({ items, message }),
    });
  },
};
