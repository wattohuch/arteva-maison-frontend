/* ============================================
   ARTÉVA Maison — Meta Pixel

   Loads only when VITE_META_PIXEL_ID is set, so a developer checkout, a
   preview deploy or a fork never writes into the client's ad data.

   Every event carries an eventId. The Conversions API sends the same event
   from the server with the same id, and Meta keeps whichever arrives first —
   without that id a purchase made in a browser with no ad blocker is counted
   twice. See src/services/metaConversions.js on the backend.
   ============================================ */

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || '';

let ready = false;

/** Meta expects a plain number; KWD prices carry three decimals. */
const money = (n) => Math.round((Number(n) || 0) * 1000) / 1000;

/**
 * The id that pairs a browser event with its server twin.
 *
 * Derived from the order number rather than random, because the two events are
 * raised in different processes that never talk to each other: the browser
 * fires Purchase when the visitor lands back from the payment gateway, and the
 * server fires it when the gateway confirms. A shared formula is what lets both
 * arrive at the same id without passing one around. The backend computes this
 * identically in src/services/metaConversions.js.
 */
export function purchaseEventId(orderNumber) {
  return `purchase_${orderNumber}`;
}

/**
 * Inject the pixel bootstrap. Called once, from main.jsx.
 * No-ops without an id — that is the whole opt-in mechanism.
 */
export function initMetaPixel() {
  if (ready || !PIXEL_ID || typeof window === 'undefined') return;

  /* eslint-disable */
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq('init', PIXEL_ID);
  ready = true;
}

/** Fire a pixel event. Silently does nothing when the pixel is not configured. */
export function track(event, data = {}, eventId) {
  if (!ready || typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', event, data, eventId ? { eventID: eventId } : undefined);
}

/** True when a pixel id is configured — used to skip building payloads. */
export const pixelEnabled = () => Boolean(PIXEL_ID);

/* ── Standard events ───────────────────────────
   Named after Meta's own event vocabulary, because those are the names its
   ad optimisation and reporting understand. A custom name would be recorded
   but could not be used as a conversion objective. */

export function trackPageView() {
  track('PageView');
}

export function trackViewContent(product, currency = 'KWD') {
  if (!product) return;
  track('ViewContent', {
    content_ids: [product._id || product.id],
    content_name: product.name,
    content_type: 'product',
    value: money(product.price),
    currency,
  });
}

export function trackAddToCart(product, quantity = 1, currency = 'KWD') {
  if (!product) return;
  track('AddToCart', {
    content_ids: [product._id || product.id],
    content_name: product.name,
    content_type: 'product',
    contents: [{ id: product._id || product.id, quantity }],
    value: money((Number(product.price) || 0) * quantity),
    currency,
  });
}

export function trackAddToWishlist(product, currency = 'KWD') {
  if (!product) return;
  track('AddToWishlist', {
    content_ids: [product._id || product.id],
    content_name: product.name,
    content_type: 'product',
    value: money(product.price),
    currency,
  });
}

export function trackInitiateCheckout(items = [], total = 0, currency = 'KWD') {
  track('InitiateCheckout', {
    content_ids: items.map(i => i._id || i.id),
    contents: items.map(i => ({ id: i._id || i.id, quantity: Number(i.quantity) || 1 })),
    content_type: 'product',
    num_items: items.reduce((n, i) => n + (Number(i.quantity) || 1), 0),
    value: money(total),
    currency,
  });
}

export function trackSearch(query) {
  if (!query) return;
  track('Search', { search_string: query });
}

/**
 * The one event that pays for the rest.
 *
 * Fired from the order-success page, since checkout hands off to a payment
 * gateway and never returns to its own tab.
 */
export function trackPurchase(order, currency = 'KWD') {
  if (!order?.orderNumber) return;
  const eventId = purchaseEventId(order.orderNumber);
  const items = order.items || [];
  track('Purchase', {
    content_ids: items.map(i => i.product?._id || i.product || i._id),
    contents: items.map(i => ({
      id: i.product?._id || i.product || i._id,
      quantity: Number(i.quantity) || 1,
    })),
    content_type: 'product',
    num_items: items.reduce((n, i) => n + (Number(i.quantity) || 1), 0),
    value: money(order.total ?? order.totalAmount),
    currency,
  }, eventId);
}
