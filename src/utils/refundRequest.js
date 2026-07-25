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
