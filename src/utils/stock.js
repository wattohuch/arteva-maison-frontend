/**
 * ARTÉVA Maison — stock presentation rules.
 *
 * One place that decides what a stock number means to a shopper, so the
 * product card, the detail page, the quantity stepper and the cart cannot
 * disagree about whether something is buyable.
 */

/**
 * At or below this many units, the shopper is told how many are left.
 *
 * Scarcity is only worth surfacing when it is real and actionable. Showing a
 * count on everything trains people to ignore it; showing it on the last few
 * is what stops someone building a basket of three and finding out at checkout
 * that there were two.
 */
export const LOW_STOCK_THRESHOLD = 5;

/** Units on hand, normalised. Absent stock reads as none. */
export function stockLevel(product) {
  const raw = Number(product?.stock);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

export function isOutOfStock(product) {
  return stockLevel(product) === 0;
}

/** True when there are some left, but few enough to say so. */
export function isLowStock(product) {
  const stock = stockLevel(product);
  return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
}

/**
 * The most this shopper can add, given what is already in their basket.
 *
 * Returns 0 when nothing more can be added — the caller disables the control
 * rather than letting a request go out that the server will refuse.
 */
export function maxAddable(product, alreadyInCart = 0) {
  return Math.max(0, stockLevel(product) - Math.max(0, alreadyInCart));
}

/**
 * The scarcity label for a product, or null when there is nothing to say.
 *
 * Bilingual because the storefront is, and returning both strings from here
 * keeps the wording identical everywhere it appears.
 *
 * @param {Object} product
 * @param {'en'|'ar'} lang
 * @returns {{ text: string, tone: 'out'|'low' }|null}
 */
export function stockBadge(product, lang = 'en') {
  const stock = stockLevel(product);
  const ar = lang === 'ar';

  if (stock === 0) {
    return { text: ar ? 'نفدت الكمية' : 'Out of stock', tone: 'out' };
  }

  if (stock <= LOW_STOCK_THRESHOLD) {
    return {
      text: ar
        // Arabic distinguishes one, two, and a few — "1 متبقي" reads as broken
        // Arabic, so the singular and dual get their own forms.
        ? (stock === 1 ? 'قطعة واحدة متبقية'
          : stock === 2 ? 'قطعتان متبقيتان'
            : `${stock} قطع متبقية`)
        : (stock === 1 ? 'Only 1 left' : `Only ${stock} left`),
      tone: 'low',
    };
  }

  return null;
}
