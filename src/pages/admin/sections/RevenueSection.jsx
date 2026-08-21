import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { AdminAPI } from '../../../api/admin';
import { showToast } from '../../../components/ui/Toast';
import Loader from '../../../components/ui/Loader';
import { formatDate } from '../../../utils/formatters';
import { StoreIcon, GlobeIcon, CoinsIcon, UndoIcon } from '../../../components/ui/Icons';
import './RevenueSection.css';

/**
 * Revenue — one view over both order sources.
 *
 * The headline figure is NET (gross minus refunds), because that is the money
 * the business actually kept. Gross and refunds are shown alongside it so the
 * net number is never a black box.
 *
 * Note on discounts: an order's stored `total` is already net of its promo
 * discount, so discount is reported as context, not subtracted again. Doing
 * that would double-count every promo sale.
 */

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: '30d', label: '30 days' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
];

const SOURCES = [
  { id: 'all', label: 'All' },
  { id: 'online', label: 'Online' },
  { id: 'manual', label: 'Receipts' },
];

const kwd = (n) => `${(Number(n) || 0).toFixed(3)}`;

export default function RevenueSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preset, setPreset] = useState('30d');
  const [source, setSource] = useState('all');
  const [custom, setCustom] = useState({ from: '', to: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const usingCustom = custom.from || custom.to;
      const res = await AdminAPI.getRevenueOverview({
        preset: usingCustom ? undefined : preset,
        from: custom.from || undefined,
        to: custom.to || undefined,
        source,
      });
      setData(res.data);
    } catch (err) {
      // Three distinct 403s, and conflating them leaves the owner staring at an
      // empty dashboard with no idea what to do: the unlock has expired mid-
      // session, or the account simply is not the owner.
      if (err.code === 'REVENUE_LOCKED') {
        // Send the gate back to the password prompt rather than leaving a dead
        // view behind — the unlock is timed, so this happens in normal use.
        window.dispatchEvent(new CustomEvent('revenue_locked'));
      }

      const message =
        err.code === 'REVENUE_LOCKED'
          ? 'Your revenue session has expired. Reopen Revenue to enter your password again.'
          : err.status === 403
            ? 'Revenue is restricted to the owner account.'
            : (err.message || 'Could not load revenue');
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [preset, source, custom.from, custom.to]);

  useEffect(() => { load(); }, [load]);

  /* The window currently on screen, in the shape the adjustment endpoints
     expect. The server resolves a preset to real dates itself, so a correction
     made while looking at "Today" is stored against today's date and not
     against the word "today" — which would otherwise mean something different
     tomorrow. */
  const rangeParams = useCallback(() => {
    const usingCustom = custom.from || custom.to;
    return {
      preset: usingCustom ? undefined : preset,
      from: custom.from || undefined,
      to: custom.to || undefined,
    };
  }, [preset, custom.from, custom.to]);

  /**
   * Type a figure over the computed one.
   *
   * Reloads rather than patching local state: the server recomputes the delta
   * against what the aggregation says right now, so the authoritative answer is
   * whatever comes back — and a card that showed the typed number while the
   * server had stored something else would be exactly the kind of lie this
   * whole feature is meant to avoid.
   */
  const saveAdjustment = useCallback(async (field, value) => {
    try {
      await AdminAPI.setRevenueAdjustment({ field, value, ...rangeParams() });
      await load();
      showToast('Figure updated. It will keep tracking new orders.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not save that figure', 'error');
      throw err;
    }
  }, [rangeParams, load]);

  const resetAdjustment = useCallback(async (field) => {
    try {
      await AdminAPI.clearRevenueAdjustment(field, rangeParams());
      await load();
      showToast('Figure reset to what the orders say.', 'info');
    } catch (err) {
      showToast(err.message || 'Could not reset that figure', 'error');
    }
  }, [rangeParams, load]);

  const totals = data?.totals;
  const adjustments = data?.adjustments;

  // Bar heights are relative to the busiest day in the window, so the shape of
  // the trend is readable regardless of absolute scale.
  const chartMax = useMemo(
    () => Math.max(1, ...(data?.byDay || []).map(d => d.gross)),
    [data]
  );

  if (loading && !data) {
    return <div className="admin-view"><div className="admin-loading"><Loader /></div></div>;
  }

  if (error && !data) {
    return (
      <div className="admin-view">
        <h2 className="admin-view-title">Revenue</h2>
        <p className="rev-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="admin-view rev">
      <h2 className="admin-view-title">Revenue</h2>

      {/* ── Filters ── */}
      <div className="rev-filters">
        <div className="rev-chips" role="group" aria-label="Date range">
          {PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              className={`rev-chip ${preset === p.id && !custom.from && !custom.to ? 'is-active' : ''}`}
              onClick={() => { setPreset(p.id); setCustom({ from: '', to: '' }); }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="rev-chips" role="group" aria-label="Order source">
          {SOURCES.map(s => (
            <button
              key={s.id}
              type="button"
              className={`rev-chip rev-chip--source ${source === s.id ? 'is-active' : ''}`}
              onClick={() => setSource(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="rev-dates">
          <label>
            <span>From</span>
            <input
              type="date" value={custom.from}
              onChange={e => setCustom(c => ({ ...c, from: e.target.value }))}
            />
          </label>
          <label>
            <span>To</span>
            <input
              type="date" value={custom.to}
              onChange={e => setCustom(c => ({ ...c, to: e.target.value }))}
            />
          </label>
          {(custom.from || custom.to) && (
            <button
              type="button" className="btn btn-ghost btn-sm"
              onClick={() => setCustom({ from: '', to: '' })}
            >Clear</button>
          )}
        </div>
      </div>

      {/* ── Headline ── */}
      <div className="rev-stats">
        <StatTile
          Icon={CoinsIcon}
          label="Net revenue"
          field="net"
          raw={totals?.net}
          adjustment={adjustments?.net}
          onSave={saveAdjustment}
          onReset={resetAdjustment}
          value={kwd(totals?.net)}
          hint={`${totals?.orders || 0} orders`}
          accent
        />
        <StatTile
          label="Gross"
          field="gross"
          raw={totals?.gross}
          adjustment={adjustments?.gross}
          onSave={saveAdjustment}
          onReset={resetAdjustment}
          value={kwd(totals?.gross)}
          hint="Before refunds"
        />
        <StatTile
          Icon={UndoIcon}
          label="Refunds"
          field="refunds"
          raw={totals?.refunds}
          adjustment={adjustments?.refunds}
          onSave={saveAdjustment}
          onReset={resetAdjustment}
          value={kwd(totals?.refunds)}
          hint={totals?.refunds > 0 ? 'Deducted from net' : 'None'}
          negative={totals?.refunds > 0}
        />
        <StatTile
          label="Average order"
          field="averageOrderValue"
          raw={totals?.averageOrderValue}
          adjustment={adjustments?.averageOrderValue}
          onSave={saveAdjustment}
          onReset={resetAdjustment}
          value={kwd(totals?.averageOrderValue)}
          hint={`${totals?.items || 0} items sold`}
        />
      </div>

      {/* ── Split by source ── */}
      <div className="rev-split">
        <SourceCard
          Icon={GlobeIcon}
          title="Online orders"
          stats={data?.bySource?.online}
          total={totals?.net}
        />
        <SourceCard
          Icon={StoreIcon}
          title="Manual receipts"
          stats={data?.bySource?.manual}
          total={totals?.net}
        />
      </div>

      {/* ── Daily trend ── */}
      {data?.byDay?.length > 0 && (
        <section className="rev-card">
          <h3 className="rev-card-title">Daily revenue</h3>
          <div className="rev-chart" role="img" aria-label="Daily gross revenue">
            {data.byDay.map(day => (
              <div key={day.date} className="rev-bar-slot" title={`${day.date} — ${kwd(day.gross)} KWD`}>
                <div className="rev-bar-stack">
                  {/* Online and manual stacked, so the mix is visible without a
                      second chart. */}
                  <div
                    className="rev-bar rev-bar--online"
                    style={{ height: `${(day.onlineGross / chartMax) * 100}%` }}
                  />
                  <div
                    className="rev-bar rev-bar--manual"
                    style={{ height: `${(day.manualGross / chartMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="rev-legend">
            <span><i className="rev-dot rev-dot--online" /> Online</span>
            <span><i className="rev-dot rev-dot--manual" /> Receipts</span>
          </div>
        </section>
      )}

      {/* ── Promo attribution ── */}
      <section className="rev-card">
        <h3 className="rev-card-title">
          Promo codes
          {data?.promoTraffic && (
            <small>
              {data.promoTraffic.uniqueVisitors} visitor(s) arrived on a code ·
              {' '}{data.promoTraffic.conversions} converted
            </small>
          )}
        </h3>

        {data?.byPromoCode?.length ? (
          <div className="rev-table-wrap">
            <table className="rev-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Orders</th>
                  <th>Discount given</th>
                  <th>Net revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.byPromoCode.map(p => (
                  <tr key={p.code}>
                    <td><strong>{p.code}</strong><br /><small>{p.name}</small></td>
                    <td>{p.orders}</td>
                    <td className="is-discount">−{kwd(p.discount)}</td>
                    <td><strong>{kwd(p.net)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rev-empty">No promo-code orders in this period.</p>
        )}
      </section>

      {/* ── Top products ── */}
      {data?.topProducts?.length > 0 && (
        <section className="rev-card">
          <h3 className="rev-card-title">Top products <small>Refunded lines excluded</small></h3>
          <ol className="rev-products">
            {data.topProducts.slice(0, 10).map((p, i) => (
              <li key={p.productId}>
                <span className="rev-rank">{i + 1}</span>
                <span className="rev-product-name">{p.name}</span>
                <span className="rev-product-units">{p.units} sold</span>
                <span className="rev-product-rev">{kwd(p.revenue)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Payment mix ── */}
      {data?.byPaymentMethod?.length > 0 && (
        <section className="rev-card">
          <h3 className="rev-card-title">Payment methods</h3>
          <ul className="rev-methods">
            {data.byPaymentMethod.map(m => (
              <li key={m.method}>
                <span>{m.method}</span>
                <span className="rev-method-bar">
                  <i style={{ width: `${totals?.gross ? (m.gross / totals.gross) * 100 : 0}%` }} />
                </span>
                <span>{kwd(m.net)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Recent orders ── */}
      {data?.recentOrders?.length > 0 && (
        <section className="rev-card">
          <h3 className="rev-card-title">Recent paid orders</h3>
          <div className="rev-table-wrap">
            <table className="rev-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Source</th>
                  <th>Date</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.slice(0, 20).map(o => (
                  <tr key={o._id}>
                    <td>
                      <strong>#{o.orderNumber}</strong>
                      <br /><small>{o.customer?.name || 'Guest'}</small>
                    </td>
                    <td>
                      <span className={`ord-source ${o.source === 'manual' ? 'is-manual' : 'is-online'}`}>
                        {o.source === 'manual' ? 'Receipt' : 'Online'}
                      </span>
                    </td>
                    <td>{formatDate(o.createdAt)}</td>
                    <td>
                      <strong>{kwd(o.net)}</strong>
                      {o.refundAmount > 0 && <br />}
                      {o.refundAmount > 0 && <small className="is-refund">−{kwd(o.refundAmount)}</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * A headline figure the owner can type over.
 *
 * What gets sent is the number they typed; what the server stores is the
 * DIFFERENCE from the computed figure. That is what keeps the correction alive:
 * the card tracks new orders instead of freezing at whatever was typed. When a
 * correction is in force the tile says so and shows the computed value beneath
 * it, so "what the system thinks" and "what I decided" are never confused.
 */
const StatTile = memo(function StatTile({
  Icon, label, value, hint, accent, negative,
  field, raw, adjustment, onSave, onReset,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const editable = !!field && !!onSave;
  const adjusted = !!adjustment;

  const begin = useCallback(() => {
    if (!editable) return;
    setDraft(String(raw ?? 0));
    setEditing(true);
  }, [editable, raw]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = useCallback(async () => {
    const typed = Number(draft);
    if (!Number.isFinite(typed)) { setEditing(false); return; }
    // Typing the figure back unchanged is not a correction worth storing.
    if (typed === Number(raw)) { setEditing(false); return; }

    setBusy(true);
    try {
      await onSave(field, typed);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }, [draft, raw, field, onSave]);

  const handleKey = useCallback((e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
  }, [commit]);

  return (
    <div className={`rev-tile ${accent ? 'is-accent' : ''} ${negative ? 'is-negative' : ''} ${adjusted ? 'is-adjusted' : ''}`}>
      {Icon && <span className="rev-tile-icon"><Icon size={18} /></span>}
      <span className="rev-tile-label">
        {label}
        {adjusted && <span className="rev-tile-badge" title="You have corrected this figure">edited</span>}
      </span>

      {editing ? (
        <span className="rev-tile-edit">
          <input
            ref={inputRef}
            type="number"
            step="0.001"
            className="rev-tile-input"
            value={draft}
            disabled={busy}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onBlur={commit}
            aria-label={`${label} value`}
          />
        </span>
      ) : (
        <strong
          className={`rev-tile-value ${editable ? 'is-editable' : ''}`}
          onClick={begin}
          onKeyDown={e => { if (editable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); begin(); } }}
          role={editable ? 'button' : undefined}
          tabIndex={editable ? 0 : undefined}
          title={editable ? 'Click to correct this figure' : undefined}
        >
          {value} <small>KWD</small>
        </strong>
      )}

      {adjusted ? (
        <span className="rev-tile-hint">
          {kwd(adjustment.computed)} from orders
          {' · '}
          <span className={adjustment.delta >= 0 ? 'rev-delta-up' : 'rev-delta-down'}>
            {adjustment.delta >= 0 ? '+' : '−'}{kwd(Math.abs(adjustment.delta))}
          </span>
          {onReset && (
            <button type="button" className="rev-tile-reset" onClick={() => onReset(field)}>
              reset
            </button>
          )}
        </span>
      ) : (
        hint && <span className="rev-tile-hint">{hint}</span>
      )}
    </div>
  );
});

const SourceCard = memo(function SourceCard({ Icon, title, stats, total }) {
  const net = stats?.net || 0;
  const share = total > 0 ? Math.round((net / total) * 100) : 0;

  return (
    <div className="rev-source">
      <div className="rev-source-head">
        <span className="rev-source-icon"><Icon size={17} /></span>
        <h4>{title}</h4>
        <span className="rev-source-share">{share}%</span>
      </div>
      <strong className="rev-source-value">{kwd(net)} <small>KWD</small></strong>
      <div className="rev-source-meter" aria-hidden="true">
        <i style={{ width: `${share}%` }} />
      </div>
      <dl className="rev-source-meta">
        <div><dt>Orders</dt><dd>{stats?.orders || 0}</dd></div>
        <div><dt>Items</dt><dd>{stats?.items || 0}</dd></div>
        <div><dt>Refunds</dt><dd>{kwd(stats?.refunds)}</dd></div>
      </dl>
    </div>
  );
});
