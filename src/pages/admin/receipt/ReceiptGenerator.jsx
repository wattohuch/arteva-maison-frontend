import {
  useState, useEffect, useRef, useCallback, useMemo, memo, useDeferredValue,
} from 'react';
import { AdminAPI } from '../../../api/admin';
import { PromoAPI } from '../../../api/promoCodes';
import { showToast } from '../../../components/ui/Toast';
import {
  PlusIcon, TrashIcon, DownloadIcon, PrinterIcon, SearchIcon,
} from '../../../components/ui/Icons';
import {
  renderReceipt, downloadReceiptJPEG, printReceipt,
} from '../../../utils/receiptCanvas';
import {
  useReceiptDraft, emptyDraft, draftFromOrder, generateOrderNumber,
} from './useReceiptDraft';
import './ReceiptGenerator.css';

const ORDER_STATUSES = ['confirmed', 'pending', 'processing', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['paid', 'pending', 'failed'];
const PAYMENT_METHODS = [
  { value: 'knet', label: 'KNET' },
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'applepay', label: 'Apple Pay' },
  { value: 'deema', label: 'Deema (BNPL)' },
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'myfatoorah', label: 'Online Payment' },
];

const kwd = (n) => `${(Number(n) || 0).toFixed(3)} KWD`;

/**
 * ARTÉVA Receipt Generator.
 *
 * Replaces the standalone `receipt-generator.html`. Two entry points, same as
 * before: load an existing order by number and edit it, or build one from
 * scratch. Saving a new receipt writes a real order — the manual counterpart
 * to an online checkout — which is why stock moves and it shows up in revenue.
 *
 * Layout is mobile-first: on a phone the form and the preview are separate
 * tabs, because a 300 DPI A4 canvas and a form cannot usefully share a 390px
 * viewport. Above 1100px they sit side by side and the preview tracks edits
 * live.
 */
export default function ReceiptGenerator() {
  const { draft, totals, actions, asOrder, asPayload } = useReceiptDraft();

  const [products, setProducts] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [lookupNumber, setLookupNumber] = useState('');
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState('edit');
  const [started, setStarted] = useState(false);

  const canvasRef = useRef(null);
  // Guards against overlapping renders: the QR step is async, so a fast typist
  // could otherwise have an older render finish after a newer one and paint
  // stale content over fresh.
  const renderToken = useRef(0);

  const isExisting = !!draft.orderId;

  // ── Reference data ──
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      AdminAPI.getProducts().catch(() => ({ data: [] })),
      AdminAPI.getPromoCodes().catch(() => ({ data: [] })),
    ]).then(([prodRes, promoRes]) => {
      if (cancelled) return;
      const list = prodRes.data || [];
      setProducts([...list].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      setPromoCodes((promoRes.data || []).filter(p => p.isActive));
    });
    return () => { cancelled = true; };
  }, []);

  // ── Live preview ──
  // The order object is deferred so typing stays responsive: React keeps the
  // input responsive at high priority and re-renders the 2480×3508 canvas when
  // it gets a chance, instead of on every keystroke.
  const orderForPreview = asOrder();
  const deferredOrder = useDeferredValue(orderForPreview);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!started || !canvas) return;

    const token = ++renderToken.current;
    renderReceipt(canvas, deferredOrder, {
      isStale: () => token !== renderToken.current,
    }).catch(err => console.error('[RECEIPT] render failed:', err));
  }, [deferredOrder, started]);

  // ── Actions ──
  const startBlank = useCallback(() => {
    const fresh = emptyDraft();
    fresh.orderNumber = generateOrderNumber();
    actions.reset(fresh);
    setStarted(true);
    setMobileTab('edit');
  }, [actions]);

  const loadOrder = useCallback(async () => {
    const number = lookupNumber.trim().toUpperCase();
    if (!number) return;

    setLoadingOrder(true);
    try {
      // The list endpoint searches order number and customer server-side, so
      // this is one indexed query rather than downloading every order and
      // filtering in the browser as the vanilla page did.
      const res = await AdminAPI.getOrders({ search: number, limit: 10 });
      const found = (res.data || []).find(o => o.orderNumber === number) || (res.data || [])[0];

      if (!found) {
        showToast(`No order found for "${number}"`, 'error');
        return;
      }

      actions.reset(draftFromOrder(found));
      setStarted(true);
      setMobileTab('edit');
      showToast(`Order ${found.orderNumber} loaded`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to load order', 'error');
    } finally {
      setLoadingOrder(false);
    }
  }, [lookupNumber, actions]);

  const quickAddProduct = useCallback((productId) => {
    const product = products.find(p => p._id === productId);
    if (!product) return;
    actions.addItem({
      product: product._id,
      name: product.name,
      nameAr: product.nameAr,
      sku: product.sku || '',
      image: product.images?.[0]?.url || '',
      price: product.price,
      quantity: 1,
    });
  }, [products, actions]);

  /** Ask the server to price the code — the client never computes a discount. */
  const applyPromo = useCallback(async (rawCode) => {
    const code = (rawCode ?? draft.promoCode).trim().toUpperCase();

    if (!code) { actions.setPromo(null, ''); return; }
    if (!draft.items.length) {
      showToast('Add items before applying a promo code', 'error');
      return;
    }

    try {
      const res = await PromoAPI.validate(
        code,
        draft.items
          .filter(i => i.product)
          .map(i => ({ product: i.product, quantity: i.quantity, price: i.price }))
      );
      if (res?.data?.totalDiscount > 0) {
        actions.setPromo(res.data);
        showToast(`${code} applied — ${kwd(res.data.totalDiscount)} off`, 'success');
      } else {
        actions.setPromo(null, code);
        showToast('That code does not apply to these items', 'error');
      }
    } catch (err) {
      actions.setPromo(null, code);
      showToast(err.message || 'Could not validate promo code', 'error');
    }
  }, [draft.promoCode, draft.items, actions]);

  const save = useCallback(async () => {
    if (!draft.items.length) {
      showToast('A receipt needs at least one item', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = asPayload();
      const res = isExisting
        ? await AdminAPI.updateOrderReceipt(draft.orderId, payload)
        : await AdminAPI.createOrder(payload);

      if (!res.success) throw new Error(res.message || 'Save failed');

      // Reload from the response so the draft reflects what was actually
      // stored — server-generated ids, the re-priced promo, adjusted totals.
      actions.reset(draftFromOrder(res.data));
      showToast(
        isExisting
          ? `Order ${res.data.orderNumber} updated`
          : `Order ${res.data.orderNumber} created — stock updated`,
        'success'
      );
    } catch (err) {
      // The backend answers 409 INSUFFICIENT_STOCK with the product named, so
      // pass its message straight through rather than a generic failure.
      showToast(err.message || 'Failed to save receipt', 'error');
    } finally {
      setSaving(false);
    }
  }, [draft.items.length, draft.orderId, isExisting, asPayload, actions]);

  const handleDownload = useCallback(() => {
    downloadReceiptJPEG(canvasRef.current, draft.orderNumber || 'receipt');
  }, [draft.orderNumber]);

  const handlePrint = useCallback(() => {
    const ok = printReceipt(canvasRef.current, draft.orderNumber);
    if (!ok) showToast('Allow pop-ups to print receipts', 'error');
  }, [draft.orderNumber]);

  // ── Empty state ──
  if (!started) {
    return (
      <div className="admin-view rg-start">
        <h2 className="admin-view-title">Receipt Generator</h2>
        <p className="rg-start-lead">
          Build a receipt from scratch, or load an existing order to edit and reprint it.
        </p>

        <div className="rg-start-grid">
          <div className="rg-start-card">
            <h3>Create new receipt</h3>
            <p>Records a manual order. Stock is deducted when you save.</p>
            <button type="button" className="btn btn-primary btn-full" onClick={startBlank}>
              <PlusIcon size={16} /> New receipt
            </button>
          </div>

          <div className="rg-start-card">
            <h3>Load an order</h3>
            <p>Edit details, refund items, or reprint an existing receipt.</p>
            <form
              className="rg-lookup"
              onSubmit={(e) => { e.preventDefault(); loadOrder(); }}
            >
              <input
                type="text"
                value={lookupNumber}
                onChange={e => setLookupNumber(e.target.value.toUpperCase())}
                placeholder="Order number"
                aria-label="Order number"
                autoCapitalize="characters"
                spellCheck={false}
              />
              <button type="submit" className="btn btn-secondary" disabled={loadingOrder}>
                {loadingOrder ? '…' : <SearchIcon size={16} />}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-view rg">
      <header className="rg-header">
        <div className="rg-header-text">
          <h2 className="admin-view-title">
            {isExisting ? `Editing ${draft.orderNumber}` : 'New Receipt'}
          </h2>
          <p className="rg-header-sub">
            {isExisting
              ? 'Changes update the stored order and adjust stock.'
              : 'Saving creates a manual order and deducts stock.'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => { actions.reset(emptyDraft()); setStarted(false); setLookupNumber(''); }}
        >
          Close
        </button>
      </header>

      {/* Phone: the form and the A4 preview cannot share a viewport usefully,
          so they become tabs. Both are always mounted so switching is instant
          and the canvas keeps its rendered content. */}
      <div className="rg-tabs" role="tablist">
        {['edit', 'preview'].map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mobileTab === tab}
            className={`rg-tab ${mobileTab === tab ? 'is-active' : ''}`}
            onClick={() => setMobileTab(tab)}
          >
            {tab === 'edit' ? 'Details' : 'Preview'}
          </button>
        ))}
      </div>

      <div className="rg-layout">
        <div className={`rg-form ${mobileTab === 'edit' ? '' : 'is-hidden-mobile'}`}>
          <ReceiptFields draft={draft} actions={actions} />

          <LineItems
            items={draft.items}
            products={products}
            onAdd={quickAddProduct}
            onAddCustom={() => actions.addItem({ name: '', price: 0, quantity: 1 })}
            onUpdate={actions.updateItem}
            onRemove={actions.removeItem}
          />

          <PricingFields
            draft={draft}
            totals={totals}
            promoCodes={promoCodes}
            actions={actions}
            onApplyPromo={applyPromo}
          />
        </div>

        <div className={`rg-preview ${mobileTab === 'preview' ? '' : 'is-hidden-mobile'}`}>
          <div className="rg-canvas-frame">
            <canvas ref={canvasRef} className="rg-canvas" aria-label="Receipt preview" />
          </div>
        </div>
      </div>

      {/* Sticky action bar — the primary action stays under the thumb rather
          than at the bottom of a long form. */}
      <div className="rg-actions">
        <div className="rg-actions-total">
          <span>Total</span>
          <strong>{kwd(totals.total)}</strong>
        </div>

        <div className="rg-actions-buttons">
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleDownload}>
            <DownloadIcon size={16} /><span className="rg-btn-label">JPEG</span>
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handlePrint}>
            <PrinterIcon size={16} /><span className="rg-btn-label">Print</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={save}
            disabled={saving || !draft.items.length}
          >
            {saving ? 'Saving…' : (isExisting ? 'Update order' : 'Save receipt')}
          </button>
        </div>
      </div>

    </div>
  );
}

/* ─────────────────────────────────────────────
   Sub-sections. Memoised so editing a line item
   does not re-render the customer fields, and
   vice versa.
   ───────────────────────────────────────────── */

const ReceiptFields = memo(function ReceiptFields({ draft, actions }) {
  return (
    <>
      <section className="rg-section">
        <h3 className="rg-section-title">Receipt</h3>
        <div className="rg-grid">
          <label className="rg-field">
            <span>Receipt / Order #</span>
            <input
              type="text"
              value={draft.orderNumber}
              onChange={e => actions.setField('orderNumber', e.target.value.toUpperCase())}
              autoCapitalize="characters"
              spellCheck={false}
            />
          </label>
          <label className="rg-field">
            <span>Date</span>
            <input
              type="date"
              value={draft.createdAt}
              onChange={e => actions.setField('createdAt', e.target.value)}
            />
          </label>
          <label className="rg-field">
            <span>Order status</span>
            <select value={draft.orderStatus} onChange={e => actions.setField('orderStatus', e.target.value)}>
              {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="rg-field">
            <span>Payment status</span>
            <select value={draft.paymentStatus} onChange={e => actions.setField('paymentStatus', e.target.value)}>
              {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="rg-field rg-field--wide">
            <span>Payment method</span>
            <select value={draft.paymentMethod} onChange={e => actions.setField('paymentMethod', e.target.value)}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="rg-section">
        <h3 className="rg-section-title">Customer</h3>
        <div className="rg-grid">
          <label className="rg-field rg-field--wide">
            <span>Name</span>
            <input
              type="text"
              value={draft.customer.name}
              onChange={e => actions.setCustomer('name', e.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="rg-field">
            <span>Email</span>
            <input
              type="email"
              value={draft.customer.email}
              onChange={e => actions.setCustomer('email', e.target.value)}
              autoComplete="email"
              inputMode="email"
            />
          </label>
          <label className="rg-field">
            <span>Phone</span>
            <input
              type="tel"
              value={draft.customer.phone}
              onChange={e => actions.setCustomer('phone', e.target.value)}
              autoComplete="tel"
              inputMode="tel"
            />
          </label>
        </div>
      </section>

      <section className="rg-section">
        <h3 className="rg-section-title">Address</h3>
        <div className="rg-grid">
          <label className="rg-field rg-field--wide">
            <span>Street</span>
            <input
              type="text"
              value={draft.address.street}
              onChange={e => actions.setAddress('street', e.target.value)}
            />
          </label>
          <label className="rg-field">
            <span>City</span>
            <input
              type="text"
              value={draft.address.city}
              onChange={e => actions.setAddress('city', e.target.value)}
            />
          </label>
          <label className="rg-field">
            <span>Country</span>
            <input
              type="text"
              value={draft.address.country}
              onChange={e => actions.setAddress('country', e.target.value)}
            />
          </label>
        </div>
      </section>
    </>
  );
});

const LineItems = memo(function LineItems({
  items, products, onAdd, onAddCustom, onUpdate, onRemove,
}) {
  return (
    <section className="rg-section">
      <h3 className="rg-section-title">
        Items <span className="rg-count">{items.length}</span>
      </h3>

      {/* Refunds are settled over WhatsApp by a person. What the admin does
          here is adjust the order to match reality, and the stock follows:
          lowering a quantity returns those units to inventory, raising it
          takes more, removing a line returns all of them. */}
      <p className="rg-note">
        Reducing a quantity or removing a line returns that stock to inventory.
        Adding items takes stock when you save.
      </p>

      <label className="rg-field">
        <span>Quick add product</span>
        <select
          value=""
          onChange={e => { if (e.target.value) { onAdd(e.target.value); e.target.value = ''; } }}
        >
          <option value="">Select a product…</option>
          {products.map(p => (
            <option key={p._id} value={p._id}>
              {p.name}{p.sku ? ` (${p.sku})` : ''} — {kwd(p.price)}
              {typeof p.stock === 'number' ? ` · ${p.stock} in stock` : ''}
            </option>
          ))}
        </select>
      </label>

      <div className="rg-items">
        {items.map(line => (
          <LineRow
            key={line.key}
            line={line}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}
        {items.length === 0 && (
          <p className="rg-empty">No items yet. Add a product above, or a custom line below.</p>
        )}
      </div>

      <button type="button" className="rg-add-line" onClick={onAddCustom}>
        <PlusIcon size={15} /> Add custom item
      </button>
    </section>
  );
});

const LineRow = memo(function LineRow({ line, isExisting, onUpdate, onRemove, onRefund }) {
  return (
    <div className={`rg-item ${line.isRefunded ? 'is-refunded' : ''}`}>
      <div className="rg-item-main">
        <input
          type="text"
          className="rg-item-name"
          value={line.name}
          placeholder="Item name"
          onChange={e => onUpdate(line.key, { name: e.target.value })}
        />
        {line.isRefunded && <span className="rg-refunded-badge">Refunded</span>}
      </div>

      <div className="rg-item-fields">
        <label className="rg-item-field">
          <span>SKU</span>
          <input
            type="text"
            value={line.sku}
            onChange={e => onUpdate(line.key, { sku: e.target.value })}
            spellCheck={false}
          />
        </label>
        <label className="rg-item-field">
          <span>Price</span>
          <input
            type="number"
            step="0.001"
            min="0"
            inputMode="decimal"
            value={line.price}
            onChange={e => onUpdate(line.key, { price: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="rg-item-field">
          <span>Qty</span>
          <input
            type="number"
            step="1"
            min="1"
            inputMode="numeric"
            value={line.quantity}
            onChange={e => onUpdate(line.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
          />
        </label>
        <div className="rg-item-total">
          <span>Total</span>
          <strong>{kwd(line.price * line.quantity)}</strong>
        </div>
      </div>

      <div className="rg-item-actions">
        <button
          type="button"
          className="rg-item-btn rg-item-btn--danger"
          onClick={() => onRemove(line.key)}
          aria-label={`Remove ${line.name || 'item'}`}
        >
          <TrashIcon size={15} /> Remove
        </button>
      </div>
    </div>
  );
});

const PricingFields = memo(function PricingFields({
  draft, totals, promoCodes, actions, onApplyPromo,
}) {
  const hasPromo = !!draft.promoData;

  const promoOptions = useMemo(
    () => promoCodes.map(p => ({ value: p.code, label: `${p.code} — ${p.name}` })),
    [promoCodes]
  );

  return (
    <section className="rg-section">
      <h3 className="rg-section-title">Pricing</h3>

      <div className="rg-grid">
        <label className="rg-field">
          <span>Shipping (KWD)</span>
          <input
            type="number"
            step="0.001"
            min="0"
            inputMode="decimal"
            value={draft.shippingCost}
            onChange={e => actions.setField('shippingCost', Number(e.target.value) || 0)}
          />
        </label>
        <label className="rg-field">
          <span>Discount (KWD)</span>
          <input
            type="number"
            step="0.001"
            min="0"
            inputMode="decimal"
            value={draft.discount}
            disabled={hasPromo}
            onChange={e => actions.setField('discount', Number(e.target.value) || 0)}
          />
          {hasPromo && <small className="rg-hint">Set by the promo code</small>}
        </label>
      </div>

      <div className="rg-promo">
        <label className="rg-field">
          <span>Promo code</span>
          <div className="rg-promo-row">
            <select
              value={promoOptions.some(o => o.value === draft.promoCode) ? draft.promoCode : ''}
              onChange={e => { if (e.target.value) onApplyPromo(e.target.value); }}
            >
              <option value="">Select…</option>
              {promoOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input
              type="text"
              value={draft.promoCode}
              placeholder="Or type a code"
              autoCapitalize="characters"
              spellCheck={false}
              onChange={e => actions.setPromo(null, e.target.value.toUpperCase())}
              onBlur={e => { if (e.target.value.trim()) onApplyPromo(e.target.value); }}
            />
          </div>
        </label>
      </div>

      <label className="rg-field">
        <span>Notes</span>
        <textarea
          rows={3}
          value={draft.notes}
          placeholder="Printed on the receipt"
          onChange={e => actions.setField('notes', e.target.value)}
        />
      </label>

      <dl className="rg-totals">
        <div><dt>Subtotal</dt><dd>{kwd(totals.subtotal)}</dd></div>
        <div><dt>Shipping</dt><dd>{kwd(totals.shipping)}</dd></div>
        {totals.discount > 0 && (
          <div className="is-discount"><dt>Discount</dt><dd>−{kwd(totals.discount)}</dd></div>
        )}
        {totals.refunded > 0 && (
          <div className="is-refund"><dt>Refunded</dt><dd>−{kwd(totals.refunded)}</dd></div>
        )}
        <div className="is-grand"><dt>Grand total</dt><dd>{kwd(totals.total)}</dd></div>
      </dl>
    </section>
  );
});
