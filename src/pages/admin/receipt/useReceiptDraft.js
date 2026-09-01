import { useReducer, useCallback, useMemo } from 'react';
import { resolveCustomer } from '../../../utils/receiptCustomer';

/**
 * Receipt draft state.
 *
 * Held in a reducer rather than a dozen `useState` calls because almost every
 * edit touches two things at once — changing a line quantity changes the
 * totals, applying a promo changes the discount and the totals, loading an
 * order replaces everything. A reducer keeps those transitions atomic, so the
 * preview can never render a half-updated draft.
 *
 * Totals are derived on read, never stored. The vanilla generator kept a
 * separate `recomputeTotals()` that had to be remembered at each of ~15 call
 * sites; anything it missed showed a stale total.
 */

const money = (n) => Math.round((Number(n) || 0) * 1000) / 1000;

/** A fresh receipt, ready to fill in. */
export function emptyDraft() {
  return {
    orderId: null,          // set once saved — drives create vs update
    orderNumber: '',
    createdAt: new Date().toISOString().split('T')[0],
    orderStatus: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'knet',
    customer: { name: '', email: '', phone: '' },
    address: { street: '', city: '', country: 'Kuwait' },
    items: [],
    shippingCost: 2,
    /* `unitFee` is the price of wrapping one line, quoted by the server. The
       total is counted from the ticked lines, never typed. */
    giftWrap: { unitFee: 3, message: '' },
    discount: 0,
    promoCode: '',
    promoData: null,        // server-priced discount, when a code is applied
    notes: '',
    // Minted by the server when the receipt is saved. Until then there is no
    // order to look up, which is why the QR cannot be scannable yet.
    trackingToken: '',
    refundStatus: 'None',
    refundAmount: 0,
  };
}

/** Random 8-char order number, matching the server's alphabet. */
export function generateOrderNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

let lineKey = 0;
export function makeLine(partial = {}) {
  return {
    key: `line-${++lineKey}`,
    _id: partial._id || null,
    product: partial.product || '',
    name: partial.name || '',
    nameAr: partial.nameAr || '',
    sku: partial.sku || '',
    image: partial.image || '',
    price: Number(partial.price) || 0,
    quantity: Math.max(1, Number(partial.quantity) || 1),
    isRefunded: !!partial.isRefunded,
    isExchanged: !!partial.isExchanged,
    oldName: partial.oldName || '',
    oldPrice: partial.oldPrice !== undefined ? Number(partial.oldPrice) : undefined,
    exchangeDiff: partial.exchangeDiff !== undefined ? Number(partial.exchangeDiff) : undefined,
  };
}

/** Map an API order onto a draft. */
export function draftFromOrder(order) {
  const customer = resolveCustomer(order);
  const addr = order.shippingAddress || {};

  return {
    orderId: order._id,
    orderNumber: order.orderNumber || '',
    createdAt: new Date(order.createdAt || Date.now()).toISOString().split('T')[0],
    orderStatus: order.orderStatus || 'confirmed',
    paymentStatus: order.paymentStatus || 'paid',
    paymentMethod: order.paymentMethod || 'knet',
    customer: {
      name: customer.name || addr.fullName || '',
      email: customer.email || '',
      phone: customer.phone || addr.phone || '',
    },
    address: {
      street: addr.street || '',
      city: addr.city || '',
      country: addr.country || 'Kuwait',
    },
    items: (order.items || []).map(item => makeLine({
      _id: item._id,
      product: item.product?._id || item.product || '',
      name: item.name,
      nameAr: item.nameAr,
      sku: item.sku,
      image: item.image,
      price: item.price,
      quantity: item.quantity,
      isRefunded: item.isRefunded,
      isExchanged: item.isExchanged,
      oldName: item.oldName,
      oldPrice: item.oldPrice,
      exchangeDiff: item.exchangeDiff,
      // Which lines were wrapped, so re-opening a receipt shows what was
      // actually charged rather than an empty set of ticks.
      giftWrap: item.giftWrap === true,
    })),
    shippingCost: Number(order.shippingCost ?? 2),
    giftWrap: {
      /* The price this receipt was actually written at, not today's — an old
         receipt has to keep totalling to what the customer paid. Recovered by
         dividing the stored total by the lines it covered; a receipt with no
         wrapping on it has nothing to recover and takes the current quote. */
      unitFee: wrappedUnitFee(order),
      message: order.giftWrap?.message || '',
    },
    discount: Number(order.promoCode?.totalDiscount ?? order.discount ?? 0),
    promoCode: order.promoCode?.code || '',
    promoData: order.promoCode?.code ? order.promoCode : null,
    notes: order.notes || '',
    trackingToken: order.trackingToken || '',
    refundStatus: order.refundStatus || 'None',
    refundAmount: Number(order.refundAmount) || 0,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'reset':
      return action.draft ?? emptyDraft();

    case 'field':
      return { ...state, [action.field]: action.value };

    case 'customer':
      return { ...state, customer: { ...state.customer, [action.field]: action.value } };

    case 'address':
      return { ...state, address: { ...state.address, [action.field]: action.value } };

    case 'addItem':
      return { ...state, items: [...state.items, makeLine(action.item)] };

    case 'updateItem':
      return {
        ...state,
        items: state.items.map(line =>
          line.key === action.key ? { ...line, ...action.patch } : line
        ),
      };

    case 'removeItem':
      return { ...state, items: state.items.filter(line => line.key !== action.key) };

    case 'giftWrap':
      return {
        ...state,
        giftWrap: {
          ...state.giftWrap,
          ...action.patch,
          // Cancelling wrapping drops the card message with it.
          ...(action.patch.enabled === false ? { message: '' } : {}),
        },
      };

    case 'setPromo':
      // A cleared code drops the server-priced discount with it, otherwise the
      // saving would linger after the code that justified it was removed.
      return action.promoData
        ? {
            ...state,
            promoCode: action.promoData.code,
            promoData: action.promoData,
            discount: money(action.promoData.totalDiscount),
          }
        : { ...state, promoCode: action.code ?? '', promoData: null, discount: 0 };

    default:
      return state;
  }
}

/**
 * What one wrapped line cost on an order that already exists.
 *
 * Orders written before per-item wrapping carry a whole-order fee and no
 * per-line flags; those come back as the fee itself, which is what they were
 * charged. An order with nothing wrapped has no price to recover and falls
 * back to the standing one until the server quotes.
 */
function wrappedUnitFee(order) {
  const fee = Number(order?.giftWrap?.fee) || 0;
  if (fee <= 0) return 3;
  const wrapped = (order.items || []).filter(i => i.giftWrap).length;
  return wrapped > 0 ? parseFloat((fee / wrapped).toFixed(3)) : fee;
}

export function useReceiptDraft(initial) {
  const [draft, dispatch] = useReducer(reducer, initial ?? null, (init) => init ?? emptyDraft());

  const totals = useMemo(() => {
    const subtotal = draft.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    // Refunded lines are excluded from what the customer owes but stay visible
    // on the receipt, matching how the backend recomputes an edited order.
    const refunded = draft.items.reduce(
      (sum, i) => sum + (i.isRefunded ? i.price * i.quantity : 0), 0
    );
    const shipping = Number(draft.shippingCost) || 0;
    const discount = Number(draft.discount) || 0;
    /* Shown at the fee the server will apply: one charge per wrapped line, at
       the quoted unit price. Quoted rather than typed because the price
       belongs to the server, exactly as it does online.
       A refunded line is not charged for its wrapping — the same rule the
       server applies when it re-prices this receipt. */
    const wrappedLines = draft.items.filter(i => i.giftWrap && !i.isRefunded).length;
    const giftWrap = wrappedLines * (Number(draft.giftWrap?.unitFee) || 3);
    const total = Math.max(0, subtotal + shipping + giftWrap - discount - refunded);

    return {
      subtotal: money(subtotal),
      shipping: money(shipping),
      giftWrap: money(giftWrap),
      giftWrapCount: wrappedLines,
      discount: money(discount),
      refunded: money(refunded),
      total: money(total),
    };
  }, [draft.items, draft.shippingCost, draft.discount, draft.giftWrap]);

  const actions = useMemo(() => ({
    reset: (d) => dispatch({ type: 'reset', draft: d }),
    setField: (field, value) => dispatch({ type: 'field', field, value }),
    setCustomer: (field, value) => dispatch({ type: 'customer', field, value }),
    setAddress: (field, value) => dispatch({ type: 'address', field, value }),
    addItem: (item) => dispatch({ type: 'addItem', item }),
    setGiftWrap: (patch) => dispatch({ type: 'giftWrap', patch }),
    updateItem: (key, patch) => dispatch({ type: 'updateItem', key, patch }),
    removeItem: (key) => dispatch({ type: 'removeItem', key }),
    setPromo: (promoData, code) => dispatch({ type: 'setPromo', promoData, code }),
  }), []);

  /** The draft shaped as an order, for the canvas preview. */
  const asOrder = useCallback(() => ({
    _id: draft.orderId,
    orderNumber: draft.orderNumber,
    createdAt: draft.createdAt ? new Date(draft.createdAt).toISOString() : new Date().toISOString(),
    orderStatus: draft.orderStatus,
    paymentStatus: draft.paymentStatus,
    paymentMethod: draft.paymentMethod,
    user: draft.customer,
    shippingAddress: draft.address,
    items: draft.items,
    subtotal: totals.subtotal,
    shippingCost: totals.shipping,
    /* Shaped the way an order stores it, because this object is what the
     * preview, the JPEG export and the print all render from — the renderers
     * read order.giftWrap and cannot see the draft. */
    giftWrap: {
      enabled: totals.giftWrapCount > 0,
      fee: totals.giftWrap,
      message: draft.giftWrap?.message || '',
    },
    discount: totals.discount,
    refundAmount: totals.refunded,
    trackingToken: draft.trackingToken,
    refundStatus: draft.refundStatus,
    total: totals.total,
    notes: draft.notes,
    promoCode: draft.promoData
      ? { ...draft.promoData, code: draft.promoCode }
      : (draft.promoCode ? { code: draft.promoCode, totalDiscount: totals.discount, discounts: [] } : null),
  }), [draft, totals]);

  /** The payload the create/update endpoints expect. */
  const asPayload = useCallback(() => ({
    orderNumber: draft.orderNumber.trim().toUpperCase() || undefined,
    createdAt: draft.createdAt ? new Date(draft.createdAt).toISOString() : undefined,
    orderStatus: draft.orderStatus,
    paymentStatus: draft.paymentStatus,
    paymentMethod: draft.paymentMethod,
    user: draft.customer,
    shippingAddress: draft.address,
    items: draft.items.map(line => ({
      _id: line._id || undefined,
      product: line.product || null,
      name: line.name,
      nameAr: line.nameAr,
      sku: line.sku,
      image: line.image,
      price: line.price,
      quantity: line.quantity,
      isRefunded: line.isRefunded,
      isExchanged: line.isExchanged,
      oldName: line.oldName,
      oldPrice: line.oldPrice,
      exchangeDiff: line.exchangeDiff,
      giftWrap: Boolean(line.giftWrap),
    })),
    shippingCost: Number(draft.shippingCost) || 0,
    // Only the intent and the message travel; the server prices it.
    giftWrap: {
      // Which lines are wrapped rides on the lines; only the card message is
      // an order-level thing. The server counts and prices the rest.
      message: draft.giftWrap?.message || '',
    },
    // Sent for the no-code case. When a code is present the server re-prices
    // it and ignores this figure, which is what stops an admin from keying in
    // a discount the code does not actually grant.
    discount: Number(draft.discount) || 0,
    promoCode: draft.promoCode.trim() || undefined,
    notes: draft.notes,
  }), [draft]);

  return { draft, totals, actions, asOrder, asPayload };
}
