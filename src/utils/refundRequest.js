/**
 * Refund requests are handled over WhatsApp, not by an API.
 *
 * The customer never triggers a refund in the system: pressing "Request
 * refund" opens a WhatsApp chat pre-filled with the order details, and an
 * admin settles it by hand. Inventory only ever moves when that admin edits
 * the order in the receipt generator — reducing a quantity returns stock,
 * adding one takes it.
 *
 * Keeping the message-building here (rather than inline at the button) means
 * the customer-facing text and the order-detail view can never quote different
 * details for the same order.
 */

const money = (n) => `${(Number(n) || 0).toFixed(3)} KWD`;

/** How long after delivery a refund can still be requested. */
export const REFUND_WINDOW_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When the order was completed, i.e. when the refund clock started.
 *
 * Prefers the timestamp the status history recorded for `delivered`, because
 * that is the only value that reflects when the customer actually received the
 * goods. `updatedAt` moves for unrelated edits and `createdAt` can be weeks
 * earlier, so both are fallbacks rather than equivalents.
 */
function completedAt(order) {
  const entry = (order?.statusHistory || [])
    .filter(h => String(h?.status || '').toLowerCase() === 'delivered')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

  const raw = entry?.timestamp || order?.deliveredAt || order?.updatedAt || order?.createdAt;
  const date = raw ? new Date(raw) : null;
  return date && !isNaN(date) ? date : null;
}

/**
 * Whether to offer "Request refund" on an order.
 *
 * Two conditions, both required: the order must be completed (delivered — there
 * is nothing to refund on an order still being packed, the customer cancels
 * that instead), and it must be inside the refund window. An order that has
 * already been fully refunded is excluded, since the request would be a no-op.
 *
 * @param {Object} order
 * @param {Date}  [now] injectable clock, for tests
 */
export function canRequestRefund(order, now = new Date()) {
  const status = String(order?.orderStatus || order?.status || '').toLowerCase().replace(/\s+/g, '_');
  if (status !== 'delivered' && status !== 'completed') return false;

  if (order?.refundStatus === 'Full' || order?.paymentStatus === 'refunded') return false;

  const since = completedAt(order);
  if (!since) return false;

  const elapsed = now.getTime() - since.getTime();
  return elapsed >= 0 && elapsed <= REFUND_WINDOW_DAYS * DAY_MS;
}

/**
 * Whole days left in the refund window, for the "x days left" hint.
 * Returns 0 once the window has closed.
 */
export function refundDaysLeft(order, now = new Date()) {
  const since = completedAt(order);
  if (!since) return 0;
  const left = REFUND_WINDOW_DAYS * DAY_MS - (now.getTime() - since.getTime());
  return left <= 0 ? 0 : Math.ceil(left / DAY_MS);
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Compose the refund request message for an order.
 *
 * @param {Object} order  order as returned by the API
 * @param {Object} [opts] { customerName, lang }
 * @returns {string} plain text, ready to be URL-encoded into a wa.me link
 */
export function buildRefundMessage(order, { customerName, lang = 'en' } = {}) {
  const orderNumber = order?.orderNumber || '';
  const name = customerName || order?.user?.name || order?.shippingAddress?.fullName || '';
  const placed = formatDate(order?.createdAt);

  const items = (order?.items || []).map(item => {
    const itemName = item.product?.name || item.name || 'Item';
    const qty = item.quantity || 1;
    return `• ${itemName} ×${qty} — ${money((item.price || 0) * qty)}`;
  });

  const total = money(order?.total ?? order?.totalAmount ?? 0);

  if (lang === 'ar') {
    return [
      `مرحباً، أود طلب استرجاع للطلب رقم #${orderNumber}.`,
      '',
      name ? `الاسم: ${name}` : null,
      placed ? `تاريخ الطلب: ${placed}` : null,
      '',
      items.length ? 'المنتجات:' : null,
      ...items,
      '',
      `الإجمالي: ${total}`,
    ].filter(l => l !== null).join('\n');
  }

  return [
    `Hello, I would like to request a refund for Order #${orderNumber}.`,
    '',
    name ? `Name: ${name}` : null,
    placed ? `Order date: ${placed}` : null,
    '',
    items.length ? 'Items:' : null,
    ...items,
    '',
    `Total: ${total}`,
  ].filter(l => l !== null).join('\n');
}
