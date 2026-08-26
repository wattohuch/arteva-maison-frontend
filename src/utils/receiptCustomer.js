/**
 * Who the receipt is FOR.
 *
 * The order's `user` is who the sale is FILED UNDER, which is a different
 * question. On a manual receipt that is the member of staff who rang it up.
 *
 * Falling back to it did real damage: opening an existing receipt pre-filled
 * the customer fields from the staff account, and an admin who typed over the
 * name left the EMAIL untouched — so saving stored the cashier's email address
 * as the customer's. That is exactly how order U6T9U6UZ ended up reading
 * "Entesar / mohammadalawaji2@gmail.com".
 *
 *   · a snapshot on the order always wins — it is what was typed for this sale
 *   · a MANUAL receipt without one falls back to the shipping details, then to
 *     blank. Never to the account, because that account is staff.
 *   · an ONLINE order resolves through its account, which really is the buyer.
 */
export function resolveCustomer(order) {
  if (!order) return {};

  const snap = order.customer;
  if (snap && (snap.name || snap.email || snap.phone)) return snap;

  if (order.orderSource === 'manual') {
    const addr = order.shippingAddress || {};
    return { name: addr.fullName || '', email: '', phone: addr.phone || '' };
  }

  return order.user || {};
}
