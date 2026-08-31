/**
 * ARTÉVA Maison — Receipt canvas renderer
 *
 * A faithful port of the WYSIWYG renderer from the vanilla
 * `receipt-generator.html`, which itself mirrors the server-side
 * `printService.js` layout at 300 DPI. The geometry, type scale, colours and
 * bilingual labels are unchanged on purpose: what the admin previews here has
 * to be pixel-identical to what the Raspberry Pi prints, or the preview is
 * worthless.
 *
 * Changes from the inline original are structural only:
 *  · it is a module with no DOM lookups — the caller passes a canvas
 *  · the QR library is dynamically imported, so it is fetched once, only when
 *    a receipt is actually rendered, and never lands in the main bundle
 *  · rendering is guarded against concurrent invocations by the caller
 */

import { resolveCustomer } from './receiptCustomer';

// ── Constants (match printService.js @ 300 DPI) ──
const DPI = 300;
export const PAGE_W = Math.round(8.27 * DPI);   // A4 width
export const PAGE_H = Math.round(11.69 * DPI);  // A4 height
const SCALE = DPI / 72;

/** points → device pixels */
const f = (pt) => Math.round(pt * SCALE);

const GOLD = '#D4AF37';
const DARK = '#2c241b';
const MID = '#666666';
const LIGHT = '#999999';
const BORDER = '#e6e1d6';
const BG = '#fafaf8';

const PAYMENT_NAMES = {
  cod: 'Cash on Delivery',
  knet: 'KNET',
  card: 'Credit/Debit Card',
  applepay: 'Apple Pay',
  myfatoorah: 'Online Payment',
  deema: 'Deema (BNPL)',
};

/** Rounded rectangle path. */
function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

/** Truncate to a pixel width with an ellipsis. */
function trunc(c, text, maxWidth) {
  if (c.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 0 && c.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
  return `${s}…`;
}

const money = (n) => `${(Number(n) || 0).toFixed(3)} KWD`;

/**
 * The QR encoder is ~50 kB. Imported on first render and cached, so opening
 * the admin panel does not pay for it and rendering twice does not refetch it.
 */
let qrModulePromise = null;
function loadQR() {
  if (!qrModulePromise) qrModulePromise = import('qrcode');
  return qrModulePromise;
}

/**
 * Draw an order onto a canvas.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Object} order  the same shape the API returns for an order
 * @param {Object} [opts]
 * @param {() => boolean} [opts.isStale] Consulted after the one `await` in this
 *        function (the QR encode). Rendering is a sequence of direct canvas
 *        writes, so without this a slow render that resumes after a newer one
 *        finished would paint its footer over the newer receipt. Returning
 *        true abandons the rest of the draw.
 */
export async function renderReceipt(canvas, order, { isStale } = {}) {
  if (!canvas || !order) return;

  canvas.width = PAGE_W;
  canvas.height = PAGE_H;

  const c = canvas.getContext('2d');
  c.fillStyle = '#fff';
  c.fillRect(0, 0, PAGE_W, PAGE_H);

  const customer = resolveCustomer(order);
  const LM = f(18);
  const RM = PAGE_W - f(18);
  const CW = RM - LM;
  let y = f(18);

  c.textBaseline = 'top';

  // ═══ HEADER ═══
  c.fillStyle = DARK; c.font = `bold ${f(24)}px Georgia`; c.textAlign = 'center';
  c.fillText('ARTÉVA MAISON', PAGE_W / 2, y); y += f(28);
  c.font = `${f(9)}px Arial`; c.fillStyle = MID;
  c.fillText('Order Receipt', PAGE_W / 2, y); y += f(12);
  c.fillText('إيصال الطلب', PAGE_W / 2, y); y += f(14);
  c.strokeStyle = GOLD; c.lineWidth = f(1.2);
  c.beginPath(); c.moveTo(LM, y); c.lineTo(RM, y); c.stroke(); y += f(12);

  // ═══ ORDER META ═══
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const status = (order.orderStatus || 'pending').replace(/_/g, ' ');
  const done = ['confirmed', 'delivered'].includes(order.orderStatus);
  const cancelled = order.orderStatus === 'cancelled';
  const statusColor = done ? '#065f46' : cancelled ? '#991b1b' : '#92400e';
  const statusBg = done ? '#d1fae5' : cancelled ? '#fee2e2' : '#fef3c7';

  const metas = [
    { en: 'Order Number', ar: 'رقم الطلب', val: order.orderNumber || 'N/A' },
    { en: 'Date', ar: 'التاريخ', val: orderDate },
    { en: 'Order Status', ar: 'حالة الطلب', val: status, badge: true },
  ];
  const mw = CW / 3;
  c.textAlign = 'left';
  metas.forEach((m, i) => {
    const x = LM + i * mw;
    c.fillStyle = MID; c.font = `${f(8)}px Arial`; c.fillText(m.en, x, y);
    c.fillStyle = LIGHT; c.font = `${f(7)}px Arial`; c.fillText(m.ar, x, y + f(10));
    if (m.badge) {
      c.font = `600 ${f(9)}px Arial`;
      const bw = c.measureText(m.val).width + f(8);
      c.fillStyle = statusBg; rr(c, x, y + f(16), bw + f(4), f(12), f(5)); c.fill();
      c.fillStyle = statusColor; c.fillText(m.val, x + f(4), y + f(18));
    } else {
      c.fillStyle = DARK; c.font = `500 ${f(11)}px Arial`; c.fillText(m.val, x, y + f(18));
    }
  });
  y += f(36);

  // ═══ CUSTOMER & SHIPPING ═══
  const gH = f(58);
  const gW = (CW - f(10)) / 2;
  const gR = f(4);
  const gP = f(8);

  c.fillStyle = BG; rr(c, LM, y, CW, gH, gR); c.fill();
  c.strokeStyle = BORDER; c.lineWidth = f(0.5); rr(c, LM, y, CW, gH, gR); c.stroke();
  c.beginPath(); c.moveTo(LM + gW + f(5), y + gP); c.lineTo(LM + gW + f(5), y + gH - gP); c.stroke();

  const addr = order.shippingAddress || {};
  const custName = customer.name || addr.fullName || 'Guest';
  const custEmail = customer.email || '';
  const custPhone = customer.phone || addr.phone || '';

  c.fillStyle = MID; c.font = `${f(8)}px Arial`; c.fillText('Customer Details', LM + gP, y + gP);
  const cdW = c.measureText('Customer Details').width;
  c.fillStyle = LIGHT; c.font = `${f(6.5)}px Arial`;
  c.fillText('بيانات العميل', LM + gP + cdW + f(6), y + gP + f(1));
  c.fillStyle = DARK; c.font = `600 ${f(10)}px Arial`; c.fillText(custName, LM + gP, y + f(20));
  c.fillStyle = MID; c.font = `${f(8.5)}px Arial`;
  c.fillText(custEmail, LM + gP, y + f(31));
  c.fillText(custPhone, LM + gP, y + f(41));

  const sx = LM + gW + f(15);
  c.fillStyle = MID; c.font = `${f(8)}px Arial`; c.fillText('Shipping Address', sx, y + gP);
  const saW = c.measureText('Shipping Address').width;
  c.fillStyle = LIGHT; c.font = `${f(6.5)}px Arial`;
  c.fillText('عنوان الشحن', sx + saW + f(6), y + gP + f(1));
  c.fillStyle = MID; c.font = `${f(8.5)}px Arial`;
  const addrLines = [
    addr.street,
    [addr.city, addr.state, addr.zipCode].filter(Boolean).join(', '),
    addr.country,
  ].filter(Boolean);
  let ay = y + f(20);
  addrLines.forEach(line => { c.fillText(line, sx, ay); ay += f(11); });
  y += gH + f(10);

  // ═══ PAYMENT ═══
  const payH = f(38);
  c.fillStyle = BG; rr(c, LM, y, CW, payH, gR); c.fill();
  c.strokeStyle = BORDER; c.lineWidth = f(0.5); rr(c, LM, y, CW, payH, gR); c.stroke();
  c.beginPath(); c.moveTo(LM + gW + f(5), y + gP); c.lineTo(LM + gW + f(5), y + payH - gP); c.stroke();

  c.fillStyle = MID; c.font = `${f(8)}px Arial`; c.fillText('Payment Method', LM + gP, y + gP);
  const pmW = c.measureText('Payment Method').width;
  c.fillStyle = LIGHT; c.font = `${f(6.5)}px Arial`;
  c.fillText('طريقة الدفع', LM + gP + pmW + f(6), y + gP + f(1));
  c.fillStyle = DARK; c.font = `500 ${f(10)}px Arial`;
  c.fillText((PAYMENT_NAMES[order.paymentMethod] || order.paymentMethod || 'N/A').toUpperCase(), LM + gP, y + f(22));

  c.fillStyle = MID; c.font = `${f(8)}px Arial`; c.fillText('Payment Status', sx, y + gP);
  const psLW = c.measureText('Payment Status').width;
  c.fillStyle = LIGHT; c.font = `${f(6.5)}px Arial`;
  c.fillText('حالة الدفع', sx + psLW + f(6), y + gP + f(1));

  const ps = (order.paymentStatus || 'pending').replace(/_/g, ' ');
  const paid = order.paymentStatus === 'paid';
  const failed = order.paymentStatus === 'failed';
  const psBg = paid ? '#d1fae5' : failed ? '#fee2e2' : '#fef3c7';
  const psColor = paid ? '#065f46' : failed ? '#991b1b' : '#92400e';
  c.font = `600 ${f(9)}px Arial`;
  const psW = c.measureText(ps).width;
  c.fillStyle = psBg; rr(c, sx, y + f(19), psW + f(8), f(12), f(5)); c.fill();
  c.fillStyle = psColor; c.fillText(ps, sx + f(4), y + f(21));
  y += payH + f(10);

  // ═══ ITEMS TABLE ═══
  const items = order.items || [];
  const colHeaders = [
    { en: 'SKU', ar: 'رقم' },
    { en: 'Item', ar: 'المنتج' },
    { en: 'Unit Price', ar: 'السعر' },
    { en: 'Qty', ar: 'الكمية' },
    { en: 'Total', ar: 'المجموع' },
  ];
  const cols = [
    { w: f(50) },
    { w: 0 },
    { w: f(80) },
    { w: f(45), a: 'center' },
    { w: f(90), a: 'right' },
  ];
  cols[1].w = CW - cols[0].w - cols[2].w - cols[3].w - cols[4].w;
  let cx = LM;
  cols.forEach(col => { col.x = cx; cx += col.w; });

  c.strokeStyle = BORDER; c.lineWidth = f(0.5);
  c.beginPath(); c.moveTo(LM, y + f(15)); c.lineTo(RM, y + f(15)); c.stroke();
  colHeaders.forEach((h, i) => {
    const col = cols[i];
    const tx = col.a === 'right' ? col.x + col.w : col.a === 'center' ? col.x + col.w / 2 : col.x;
    c.textAlign = col.a || 'left';
    c.fillStyle = DARK; c.font = `${f(9)}px Georgia`; c.fillText(h.en, tx, y + f(1));
    c.fillStyle = LIGHT; c.font = `${f(7)}px Arial`; c.fillText(h.ar, tx, y + f(10));
  });
  y += f(20);

  const promoDiscounts = order.promoCode?.discounts || [];

  items.forEach(item => {
    const sku = item.sku || '—';
    const refunded = !!item.isRefunded;
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;

    const itemDiscount = promoDiscounts.find(d => {
      const dProd = String(d.product?._id || d.product || '');
      const iProd = String(item.product?._id || item.product || item._id || '');
      return dProd && iProd && dProd === iProd;
    });

    c.textAlign = 'left';
    c.fillStyle = refunded ? LIGHT : MID;
    c.font = `${f(8.5)}px Courier New`;
    c.fillText(sku, cols[0].x, y);

    const showNameAr = item.nameAr &&
      item.nameAr.trim().toLowerCase() !== (item.name || '').trim().toLowerCase();

    c.fillStyle = refunded ? LIGHT : DARK;
    c.font = `500 ${f(9.5)}px Arial`;
    const displayName = trunc(c, item.name || 'Product', cols[1].w - f(40));
    c.fillText(displayName, cols[1].x, y);

    const isExchanged = !!(item.isExchanged || item.oldName);

    if (refunded) {
      const nameW = c.measureText(displayName).width;
      const badgeX = cols[1].x + nameW + f(4);
      const badgeText = 'REFUNDED';
      c.font = `700 ${f(6)}px Arial`;
      const btW = c.measureText(badgeText).width;
      c.fillStyle = '#fee2e2'; rr(c, badgeX, y - f(1), btW + f(4), f(9), f(2)); c.fill();
      c.strokeStyle = '#ef4444'; c.lineWidth = f(0.3);
      rr(c, badgeX, y - f(1), btW + f(4), f(9), f(2)); c.stroke();
      c.fillStyle = '#ef4444'; c.fillText(badgeText, badgeX + f(2), y + f(1));
    } else if (isExchanged) {
      const nameW = c.measureText(displayName).width;
      const badgeX = cols[1].x + nameW + f(4);
      const badgeText = 'EXCHANGED';
      c.font = `700 ${f(6)}px Arial`;
      const btW = c.measureText(badgeText).width;
      c.fillStyle = '#dbeafe'; rr(c, badgeX, y - f(1), btW + f(4), f(9), f(2)); c.fill();
      c.strokeStyle = '#2563eb'; c.lineWidth = f(0.3);
      rr(c, badgeX, y - f(1), btW + f(4), f(9), f(2)); c.stroke();
      c.fillStyle = '#2563eb'; c.fillText(badgeText, badgeX + f(2), y + f(1));
    }

    if (showNameAr) {
      c.fillStyle = LIGHT; c.font = `${f(7.5)}px Arial`;
      c.fillText(item.nameAr, cols[1].x, y + f(11));
    }

    if (isExchanged) {
      const exY = y + (showNameAr ? f(22) : f(11));
      c.fillStyle = '#2563eb'; c.font = `600 ${f(7)}px Arial`;
      const oldP = money(item.oldPrice || 0);
      c.fillText(`Old: ${item.oldName || 'Item'} (${oldP})`, cols[1].x, exY);
      const diff = Number(item.exchangeDiff) || 0;
      if (diff > 0) {
        c.fillStyle = '#059669'; c.font = `bold ${f(7)}px Arial`;
        c.fillText(`Paid Extra: +${money(diff)}`, cols[1].x, exY + f(9));
      } else if (diff < 0) {
        c.fillStyle = '#dc2626'; c.font = `bold ${f(7)}px Arial`;
        c.fillText(`Refunded Amount: -${money(Math.abs(diff))}`, cols[1].x, exY + f(9));
      }
    }

    c.font = `${f(9)}px Arial`;
    const baseColor = refunded ? LIGHT : DARK;

    if (refunded) {
      // Struck through — the line is on the receipt for the record, but it is
      // not money the customer paid.
      c.fillStyle = LIGHT; c.textAlign = 'left';
      const prText = money(price);
      c.fillText(prText, cols[2].x, y);
      const prW = c.measureText(prText).width;
      c.strokeStyle = '#ef4444'; c.lineWidth = f(0.5);
      c.beginPath(); c.moveTo(cols[2].x, y + f(4)); c.lineTo(cols[2].x + prW, y + f(4)); c.stroke();

      c.fillStyle = LIGHT;
      c.textAlign = 'center'; c.fillText(String(qty), cols[3].x + cols[3].w / 2, y);
      const totText = money(price * qty);
      c.textAlign = 'right'; c.fillText(totText, cols[4].x + cols[4].w, y);
      const totW = c.measureText(totText).width;
      c.beginPath();
      c.moveTo(cols[4].x + cols[4].w - totW, y + f(4));
      c.lineTo(cols[4].x + cols[4].w, y + f(4));
      c.stroke();
    } else if (itemDiscount) {
      // Original price struck through above the discounted one, so the saving
      // is legible on a printed receipt.
      c.fillStyle = LIGHT; c.textAlign = 'left';
      const origText = money(price);
      c.fillText(origText, cols[2].x, y);
      const origW = c.measureText(origText).width;
      c.strokeStyle = LIGHT; c.lineWidth = f(0.5);
      c.beginPath(); c.moveTo(cols[2].x, y + f(4)); c.lineTo(cols[2].x + origW, y + f(4)); c.stroke();

      const discountAmount = Number(itemDiscount.discountAmount) || 0;
      const unitAfter = qty > 0 ? (price * qty - discountAmount) / qty : 0;
      c.fillStyle = GOLD; c.font = `600 ${f(8.5)}px Arial`;
      c.fillText(money(unitAfter), cols[2].x, y + f(11));

      c.fillStyle = baseColor; c.font = `${f(9)}px Arial`;
      c.textAlign = 'center'; c.fillText(String(qty), cols[3].x + cols[3].w / 2, y);

      c.fillStyle = GOLD; c.font = `600 ${f(9)}px Arial`;
      c.textAlign = 'right';
      c.fillText(money(price * qty - discountAmount), cols[4].x + cols[4].w, y);
    } else {
      c.fillStyle = baseColor;
      c.textAlign = 'left'; c.fillText(money(price), cols[2].x, y);
      c.textAlign = 'center'; c.fillText(String(qty), cols[3].x + cols[3].w / 2, y);
      c.textAlign = 'right'; c.fillText(money(price * qty), cols[4].x + cols[4].w, y);
    }

    y += showNameAr ? f(26) : (itemDiscount ? f(24) : f(20));
    c.strokeStyle = BORDER; c.lineWidth = f(0.3);
    c.beginPath(); c.moveTo(LM, y); c.lineTo(RM, y); c.stroke();
    y += f(6);
  });
  y += f(8);

  // ═══ TOTALS ═══
  const tw = f(200);
  const ttx = RM - tw;

  c.textAlign = 'left'; c.font = `${f(9.5)}px Arial`; c.fillStyle = DARK;
  c.fillText('Subtotal', ttx, y);
  c.fillStyle = LIGHT; c.font = `${f(7.5)}px Arial`;
  c.fillText('/ المجموع الفرعي', ttx + f(52), y + f(1.5));
  c.fillStyle = DARK; c.font = `${f(9.5)}px Arial`;
  c.textAlign = 'right'; c.fillText(money(order.subtotal), RM, y); y += f(14);

  c.textAlign = 'left'; c.fillText('Delivery', ttx, y);
  c.fillStyle = LIGHT; c.font = `${f(7.5)}px Arial`;
  c.fillText('/ التوصيل', ttx + f(48), y + f(1.5));
  c.fillStyle = DARK; c.font = `${f(9.5)}px Arial`;
  c.textAlign = 'right'; c.fillText(money(order.shippingCost), RM, y); y += f(12);

  if (order.giftWrap?.enabled) {
    c.textAlign = 'left'; c.fillStyle = DARK; c.font = `${f(9.5)}px Arial`;
    c.fillText('Gift Wrapping', ttx, y);
    c.fillStyle = LIGHT; c.font = `${f(7.5)}px Arial`;
    c.fillText('/ تغليف هدية', ttx + f(70), y + f(1.5));
    c.fillStyle = DARK; c.font = `${f(9.5)}px Arial`;
    c.textAlign = 'right'; c.fillText(money(order.giftWrap.fee || 0), RM, y); y += f(12);
  }

  if (order.promoCode?.code) {
    const promoAmount = order.promoCode.totalDiscount || order.discount || 0;
    c.textAlign = 'left'; c.font = `${f(9.5)}px Arial`; c.fillStyle = '#059669';
    c.fillText(`Promo: ${order.promoCode.code}`, ttx, y);
    c.textAlign = 'right'; c.fillText(`-${money(promoAmount)}`, RM, y); y += f(12);
  } else if (order.discount > 0) {
    c.textAlign = 'left'; c.font = `${f(9.5)}px Arial`; c.fillStyle = '#059669';
    c.fillText('Discount', ttx, y);
    c.textAlign = 'right'; c.fillText(`-${money(order.discount)}`, RM, y); y += f(12);
  }

  if (order.refundAmount > 0) {
    c.textAlign = 'left'; c.font = `600 ${f(9.5)}px Arial`; c.fillStyle = '#ef4444';
    c.fillText('Refunded', ttx, y);
    c.fillStyle = LIGHT; c.font = `${f(7.5)}px Arial`;
    c.fillText('/ مسترجع', ttx + f(55), y + f(1.5));
    c.fillStyle = '#ef4444'; c.font = `600 ${f(9.5)}px Arial`;
    c.textAlign = 'right'; c.fillText(`-${money(order.refundAmount)}`, RM, y); y += f(12);
  }

  c.strokeStyle = BORDER; c.lineWidth = f(1);
  c.beginPath(); c.moveTo(ttx, y); c.lineTo(RM, y); c.stroke(); y += f(14);

  const fullyRefunded = order.refundStatus === 'Full';
  const totalLabel = fullyRefunded ? 'TOTAL REFUNDED' : 'Total Paid';
  const totalLabelAr = fullyRefunded ? '/ المبلغ المسترجع' : '/ المبلغ المدفوع';

  c.textAlign = 'left'; c.font = `bold ${f(13)}px Arial`;
  c.fillStyle = fullyRefunded ? '#ef4444' : DARK;
  c.fillText(totalLabel, ttx, y);
  c.fillStyle = LIGHT; c.font = `bold ${f(9)}px Arial`;
  c.fillText(totalLabelAr, ttx + f(78), y + f(3));
  c.fillStyle = fullyRefunded ? '#ef4444' : DARK;
  c.font = `bold ${f(13)}px Arial`;
  c.textAlign = 'right'; c.fillText(money(order.total), RM, y); y += f(24);

  // ═══ GIFT MESSAGE ═══
  // Printed for whoever writes the card. Stored and never shown would mean
  // the customer paid for a message nobody reads.
  if (order.giftWrap?.enabled && order.giftWrap.message) {
    const gmX = LM + f(10);
    c.font = `${f(9)}px Arial`;

    const words = String(order.giftWrap.message).split(/\s+/);
    const gLines = [];
    let gLine = '';
    for (const word of words) {
      const attempt = gLine ? gLine + ' ' + word : word;
      if (c.measureText(attempt).width > CW - f(30) && gLine) {
        gLines.push(gLine);
        gLine = word;
      } else {
        gLine = attempt;
      }
    }
    if (gLine) gLines.push(gLine);

    const gmH = f(26) + gLines.length * f(12);
    c.fillStyle = '#fdf7f2'; rr(c, LM, y, CW, gmH, f(4)); c.fill();
    c.strokeStyle = 'rgba(197,160,110,0.28)'; c.lineWidth = f(0.5);
    rr(c, LM, y, CW, gmH, f(4)); c.stroke();
    c.fillStyle = GOLD; c.fillRect(LM, y, f(2), gmH);

    c.textAlign = 'left';
    c.fillStyle = GOLD; c.font = `600 ${f(8.5)}px Arial`;
    c.fillText('GIFT MESSAGE', gmX, y + f(14));
    const gmLabelWidth = c.measureText('GIFT MESSAGE').width;
    c.fillStyle = LIGHT; c.font = `${f(7.5)}px Arial`;
    c.fillText('رسالة الهدية', gmX + gmLabelWidth + f(8), y + f(14));

    c.fillStyle = DARK; c.font = `${f(9)}px Arial`;
    let gy = y + f(26);
    for (const l of gLines) { c.fillText(l, gmX, gy); gy += f(12); }

    y += gmH + f(10);
  }

  // ═══ NOTES ═══
  if (order.notes && order.notes.trim()) {
    const lines = order.notes.trim().split('\n');
    const nH = Math.max(f(40), lines.length * f(14) + f(24));
    c.fillStyle = BG; rr(c, LM, y, CW, nH, f(4)); c.fill();
    c.strokeStyle = BORDER; c.lineWidth = f(0.5); rr(c, LM, y, CW, nH, f(4)); c.stroke();
    c.textAlign = 'left'; c.fillStyle = MID; c.font = `600 ${f(8)}px Arial`;
    c.fillText('NOTES', LM + f(10), y + f(14));
    c.fillStyle = LIGHT; c.font = `${f(6.5)}px Arial`;
    c.fillText('ملاحظات', LM + f(10) + c.measureText('NOTES ').width, y + f(15));
    c.fillStyle = DARK; c.font = `${f(9.5)}px Arial`;
    let ny = y + f(30);
    lines.forEach(line => { c.fillText(line, LM + f(10), ny); ny += f(14); });
    y += nH + f(10);
  }

  // ═══ QR CODE SECTION (Dual QR: Digital Receipt & WhatsApp) ═══
  const qrSz = f(50);
  const qrBoxW = (CW - f(20)) / 2;
  const qrHt = qrSz + f(34);
  c.fillStyle = BG; rr(c, LM, y, CW, qrHt, f(6)); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = f(0.8); rr(c, LM, y, CW, qrHt, f(6)); c.stroke();

  try {
    const QRCode = await loadQR();
    const toDataURL = QRCode.toDataURL || QRCode.default?.toDataURL;

    /* 1. Digital Receipt QR
     *
     * Only drawn once the receipt has been SAVED and the server has minted a
     * tracking token. An unsaved draft has neither a stored order nor a token,
     * so a QR built from it sent the customer to a 404 — the order number on
     * the paper did not exist in the database yet. Encoding a link that cannot
     * resolve is worse than leaving the space empty: the customer scans it,
     * gets an error page, and concludes the shop is broken.
     *
     * A saved receipt reprinted later has the token and behaves exactly as
     * before. */
    const trackingToken = order.trackingToken || '';
    const canLinkToReceipt = !!(trackingToken && order.orderNumber);

    const receiptDataUrl = canLinkToReceipt
      ? await toDataURL(
          `https://www.artevamaisonkw.com/receipt.html?order=${encodeURIComponent(order.orderNumber)}&token=${encodeURIComponent(trackingToken)}`,
          { width: qrSz, margin: 1, color: { dark: '#2c241b', light: '#ffffff' }, errorCorrectionLevel: 'H' }
        )
      : null;

    // 2. WhatsApp QR
    // Falls back to the previous number so an older cached bundle still
    // produces a working QR; the admin's configured value wins when present.
    const contactNumber = (order.contactWhatsApp || '96550683207').replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${contactNumber}`;
    const whatsappDataUrl = await toDataURL(whatsappUrl, {
      width: qrSz, margin: 1, color: { dark: '#2c241b', light: '#ffffff' }, errorCorrectionLevel: 'H'
    });

    const loadImg = (src) => new Promise((res, rej) => {
      const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = src;
    });

    const [imgReceipt, imgWA] = await Promise.all([
      receiptDataUrl ? loadImg(receiptDataUrl) : Promise.resolve(null),
      loadImg(whatsappDataUrl),
    ]);

    if (isStale?.()) return;

    // --- Box 1: Digital Receipt ---
    const box1X = LM;
    const qr1X = box1X + (qrBoxW - qrSz) / 2;
    const qr1Y = y + f(6);

    if (imgReceipt) {
      c.drawImage(imgReceipt, qr1X, qr1Y, qrSz, qrSz);
    } else {
      /* Unsaved draft: an outline where the code will be, so the admin can see
         the receipt is not finished rather than handing over paper carrying a
         QR that leads nowhere. */
      c.fillStyle = '#ffffff';
      c.fillRect(qr1X, qr1Y, qrSz, qrSz);
      c.strokeStyle = BORDER; c.lineWidth = f(0.8);
      c.setLineDash([f(3), f(3)]);
      c.strokeRect(qr1X, qr1Y, qrSz, qrSz);
      c.setLineDash([]);
      c.textAlign = 'center'; c.fillStyle = LIGHT; c.font = `${f(6)}px Arial`;
      c.fillText('Save the receipt', qr1X + qrSz / 2, qr1Y + qrSz / 2 - f(5));
      c.fillText('to activate this code', qr1X + qrSz / 2, qr1Y + qrSz / 2 + f(2));
    }

    // Border around QR 1
    if (imgReceipt) {
      c.strokeStyle = GOLD; c.lineWidth = f(0.8);
      c.strokeRect(qr1X, qr1Y, qrSz, qrSz);
    }

    // Overlay Box on QR 1
    const ovW = f(18), ovH = f(18);
    const ovX = qr1X + (qrSz - ovW) / 2, ovY = qr1Y + (qrSz - ovH) / 2;
    if (imgReceipt) {
    c.fillStyle = '#ffffff'; rr(c, ovX, ovY, ovW, ovH, f(2)); c.fill();
    c.strokeStyle = GOLD; c.lineWidth = f(0.5); rr(c, ovX, ovY, ovW, ovH, f(2)); c.stroke();
    c.textAlign = 'center'; c.fillStyle = DARK; c.font = `bold ${f(4.5)}px Georgia`;
    c.fillText('ARTÉVA', ovX + ovW / 2, ovY + f(3));
    c.fillStyle = GOLD; c.font = `${f(3.5)}px Georgia`;
    c.fillText('MAISON', ovX + ovW / 2, ovY + f(10));
    }

    // Label 1
    c.textAlign = 'center'; c.fillStyle = DARK; c.font = `600 ${f(7.5)}px Arial`;
    c.fillText('Scan for Digital Receipt', box1X + qrBoxW / 2, qr1Y + qrSz + f(4));
    c.fillStyle = MID; c.font = `${f(6.5)}px Arial`;
    c.fillText('امسح للإيصال الرقمي', box1X + qrBoxW / 2, qr1Y + qrSz + f(14));

    // Divider line between boxes
    c.strokeStyle = BORDER; c.lineWidth = f(0.5);
    c.beginPath(); c.moveTo(LM + qrBoxW + f(10), y + f(6)); c.lineTo(LM + qrBoxW + f(10), y + qrHt - f(6)); c.stroke();

    // --- Box 2: WhatsApp ---
    const box2X = LM + qrBoxW + f(20);
    const qr2X = box2X + (qrBoxW - qrSz) / 2;
    const qr2Y = y + f(6);
    c.drawImage(imgWA, qr2X, qr2Y, qrSz, qrSz);

    // Border around QR 2
    c.strokeStyle = GOLD; c.lineWidth = f(0.8);
    c.strokeRect(qr2X, qr2Y, qrSz, qrSz);

    // Overlay Circle on QR 2 (Green WhatsApp Badge)
    const waOvR = f(7);
    const waOvX = qr2X + qrSz / 2, waOvY = qr2Y + qrSz / 2;
    c.fillStyle = '#25D366'; c.beginPath(); c.arc(waOvX, waOvY, waOvR, 0, Math.PI * 2); c.fill();
    c.textAlign = 'center'; c.fillStyle = '#ffffff'; c.font = `bold ${f(7)}px Arial`;
    c.fillText('W', waOvX, waOvY - f(3.5));

    // Label 2
    c.textAlign = 'center'; c.fillStyle = DARK; c.font = `600 ${f(7.5)}px Arial`;
    c.fillText('Contact us on WhatsApp', box2X + qrBoxW / 2, qr2Y + qrSz + f(4));
    c.fillStyle = MID; c.font = `${f(6.5)}px Arial`;
    c.fillText('تواصل معنا عبر واتساب', box2X + qrBoxW / 2, qr2Y + qrSz + f(14));

  } catch (err) {
    console.error('[RECEIPT] QR render failed:', err);
  }

  if (isStale?.()) return;
  y += qrHt + f(10);

  // ═══ RETURN POLICY ═══
  const rpH = f(78);
  c.fillStyle = '#fffbeb'; rr(c, LM, y, CW, rpH, f(4)); c.fill();
  c.strokeStyle = 'rgba(245,158,11,0.2)'; c.lineWidth = f(0.5);
  rr(c, LM, y, CW, rpH, f(4)); c.stroke();
  c.fillStyle = GOLD; c.fillRect(LM, y, f(2), rpH);

  const rpX = LM + f(10);
  c.textAlign = 'left'; c.fillStyle = DARK; c.font = `${f(11)}px Georgia`;
  c.fillText('Return & Exchange Policy', rpX, y + f(8));
  c.textAlign = 'right'; c.font = `600 ${f(10)}px Arial`;
  c.fillText('سياسة الإرجاع والاستبدال', RM - f(10), y + f(9));
  c.textAlign = 'left'; c.fillStyle = MID; c.font = `${f(8)}px Arial`;
  c.fillText('Products may be returned or exchanged within 14 days of delivery, provided they are', rpX, y + f(24));
  c.fillText('unopened and in their original condition and packaging.', rpX, y + f(33));
  c.textAlign = 'right';
  c.fillText('يمكن إرجاع أو استبدال المنتجات خلال ١٤ يومًا من التسليم، بشرط أن تكون غير مفتوحة وفي حالتها وتغليفها الأصلي', RM - f(10), y + f(46));
  c.textAlign = 'left';
  c.fillText('Contact us via WhatsApp: +965 5068 3207', rpX, y + f(60));
  c.textAlign = 'right';
  c.fillText('تواصلوا معنا عبر واتساب: ٩٦٥٥٠٦٨٣٢٠٧+', RM - f(10), y + f(60));
  y += rpH + f(10);

  // ═══ FOOTER ═══
  c.strokeStyle = BORDER; c.lineWidth = f(0.5);
  c.beginPath(); c.moveTo(LM, y); c.lineTo(RM, y); c.stroke(); y += f(10);
  c.textAlign = 'center'; c.fillStyle = MID; c.font = `${f(9)}px Arial`;
  c.fillText('Thank you for shopping with ARTÉVA Maison.', PAGE_W / 2, y); y += f(12);
  c.fillText('شكراً لتسوقكم مع أرتيفا ميزون', PAGE_W / 2, y); y += f(12);
  c.fillStyle = LIGHT; c.font = `${f(8)}px Arial`;
  c.fillText('artevamaison@gmail.com • www.artevamaisonkw.com • +965 5068 3207', PAGE_W / 2, y);
}

/** Save the current canvas as a JPEG. */
export function downloadReceiptJPEG(canvas, orderNumber = 'receipt') {
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `receipt-${orderNumber}.jpg`;
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  link.click();
}

/*
 * `printReceipt` used to live here: it opened `window.open('', '_blank')`,
 * wrote an <img> of this canvas into it and called print() on the popup.
 *
 * It is gone rather than fixed. On iOS Safari a popup opened after any await
 * is blocked, a popup that does open becomes a new tab instead of a print
 * dialog, and a multi-megabyte JPEG data URL is a poor thing to hand a phone.
 * Printing now goes through utils/printDocument.js, which prints in a hidden
 * iframe on the current page and needs no popup at all — and for a saved order
 * it prints the server-rendered HTML, which is sharper and far smaller than a
 * bitmap of it.
 */
