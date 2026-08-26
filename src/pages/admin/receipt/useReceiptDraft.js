import { useReducer, useCallback, useMemo } from 'react';

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
    discount: 0,
    promoCode: '',
    promoData: null,        // server-priced discount, when a code is applied
    notes: '',
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
  /* Prefer what was typed on the receipt over the linked account, matching
     what the renderers print. Without this, reopening a saved receipt showed
     the account's details in the customer fields and re-saving would write
     them back, quietly replacing the buyer. */
  const customer = (order.customer && (order.customer.name || order.customer.email || order.customer.phone))
    ? order.customer
    : (order.user || {});
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
    })),
    shippingCost: Number(order.shippingCost ?? 2),
    discount: Number(order.promoCode?.totalDiscount ?? order.discount ?? 0),
    promoCode: order.promoCode?.code || '',
    promoData: order.promoCode?.code ? order.promoCode : null,
    notes: order.notes || '',
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
    const total = Math.max(0, subtotal + shipping - discount - refunded);

    return {
      subtotal: money(subtotal),
      shipping: money(shipping),
      discount: money(discount),
      refunded: money(refunded),
      total: money(total),
    };
  }, [draft.items, draft.shippingCost, draft.discount]);

  const actions = useMemo(() => ({
    reset: (d) => dispatch({ type: 'reset', draft: d }),
    setField: (field, value) => dispatch({ type: 'field', field, value }),
    setCustomer: (field, value) => dispatch({ type: 'customer', field, value }),
    setAddress: (field, value) => dispatch({ type: 'address', field, value }),
    addItem: (item) => dispatch({ type: 'addItem', item }),
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
    discount: totals.discount,
    refundAmount: totals.refunded,
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
    })),
    shippingCost: Number(draft.shippingCost) || 0,
    // Sent for the no-code case. When a code is present the server re-prices
    // it and ignores this figure, which is what stops an admin from keying in
    // a discount the code does not actually grant.
    discount: Number(draft.discount) || 0,
    promoCode: draft.promoCode.trim() || undefined,
    notes: draft.notes,
  }), [draft]);

  return { draft, totals, actions, asOrder, asPayload };
}
