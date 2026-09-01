import { apiRequest } from './client';

/**
 * Prices the storefront displays but never decides.
 *
 * Public, because a signed-out shopper sees the gift wrapping price on the
 * product page long before there is a cart to quote it alongside. Every order
 * is still priced server-side from the server's own copy of the bag; this is
 * for display only.
 */
export const PricingAPI = {
  get: () => apiRequest('/pricing'),
};
