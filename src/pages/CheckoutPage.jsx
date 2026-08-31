import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { usePromo } from '../contexts/PromoContext';
import { useI18n } from '../contexts/I18nContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { PaymentsAPI } from '../api/payments';
import { CartAPI } from '../api/cart';
import { AuthAPI } from '../api/auth';
import { handleImageError } from '../utils/imageHelpers';
import { trackInitiateCheckout } from '../utils/metaPixel';
import { showToast } from '../components/ui/Toast';
import { AlertCircleIcon } from '../components/ui/Icons';
import Button from '../components/ui/Button';
import { Input, Select, Textarea, FieldRow } from '../components/ui/Field';
import LocationPicker from '../components/checkout/LocationPicker';
import PromoCodeField from '../components/promo/PromoCodeField';
import {
  CardMark, KnetMark, BnplMark, WalletMark,
  HomeMark, WorkMark, PinMark, LockMark,
} from '../components/ui/PaymentMarks';
import './CheckoutPage.css';

const COUNTRY_CODES = {
  'Kuwait': '+965', 'Saudi Arabia': '+966', 'UAE': '+971',
  'Bahrain': '+973', 'Qatar': '+974', 'Oman': '+968',
};
const COUNTRIES = Object.keys(COUNTRY_CODES);

const ADDRESS_TYPES = [
  { key: 'Home', Mark: HomeMark },
  { key: 'Work', Mark: WorkMark },
  { key: 'Other', Mark: PinMark },
];

export default function CheckoutPage() {
  const { isLoggedIn } = useAuth();
  const { items, subtotal, refreshStock, giftWrap, setGiftWrap } = useCart();
  const { discount, promoCode, promoVisitId } = usePromo();
  const { t, lang } = useI18n();
  const { format } = useCurrency();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);
  // Which gateways the backend says are usable right now. Defaults to
  // "online available" so the options are not hidden while the probe is
  // still in flight; the response corrects it either way.
  const [gateways, setGateways] = useState({
    myfatoorah: { available: true },
    deema: { available: true },
  });
  const [gatewayChecked, setGatewayChecked] = useState(false);
  // Whether the gateway account actually offers Apple Pay. Independent of
  // whether the *device* can present it — both have to be true.
  const [applePayEnabled, setApplePayEnabled] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressType, setAddressType] = useState('Home');
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    street: '', city: '', state: '', country: 'Kuwait',
    zipCode: '', phone: '', phoneCode: '+965', notes: '',
    lat: 0, lng: 0,
  });

  const shipping = 2.0;
  /* Quoted by the server with the cart. Falls back to 3 only so the row is not
   * blank on a slow load — the amount actually charged is decided server-side
   * either way. */
  const wrapFee = giftWrap?.enabled ? (giftWrap.fee || 3) : 0;
  // Display only. The server re-prices the promo against the live cart during
  // /payments/execute, so this figure can never become the charged amount.
  const total = Math.max(0, subtotal + shipping + wrapFee - discount);

  // Redirect if not logged in or cart empty
  useEffect(() => {
    if (!isLoggedIn) { navigate('/account?redirect=checkout'); return; }
    if (items.length === 0) navigate('/cart');
  }, [isLoggedIn, items.length, navigate]);

  const fillAddress = useCallback((addr) => {
    const parsePhone = (raw) => {
      if (!raw) return { code: '+965', local: '' };
      const digits = String(raw).replace(/[^\d+]/g, '');
      for (const [, code] of Object.entries(COUNTRY_CODES)) {
        if (digits.startsWith(code)) return { code, local: digits.slice(code.length) };
        if (digits.startsWith(code.replace('+', ''))) return { code, local: digits.slice(code.length - 1) };
      }
      return { code: '+965', local: raw };
    };
    const { code, local } = parsePhone(addr.phone);
    setForm(prev => ({
      ...prev,
      street: addr.street || '',
      city: addr.city || '',
      state: addr.state || '',
      country: addr.country || 'Kuwait',
      zipCode: addr.zipCode || '',
      phone: local,
      phoneCode: code,
      lat: addr.coordinates?.lat || addr.coordinates?.latitude || 0,
      lng: addr.coordinates?.lng || addr.coordinates?.longitude || 0,
    }));
    if (addr.label) setAddressType(addr.label);
  }, []);

  // Load payment methods + saved addresses
  useEffect(() => {
    let cancelled = false;

    PaymentsAPI.getPaymentMethods(1)
      .then(res => {
        if (cancelled) return;
        setPaymentMethods(res.data || []);
        if (res.gateways) setGateways(res.gateways);
        setApplePayEnabled(!!res.applePay?.available);
      })
      .catch(() => {
        // The endpoint no longer 500s, but a network drop is still possible.
        // Treat every gateway as down so the shopper sees an explicit notice
        // rather than options that cannot complete.
        if (cancelled) return;
        setGateways({
          myfatoorah: { available: false, reason: 'NETWORK_ERROR' },
          deema: { available: false, reason: 'NETWORK_ERROR' },
        });
      })
      .finally(() => { if (!cancelled) setGatewayChecked(true); });

    AuthAPI.getMe()
      .then(res => {
        if (cancelled) return;
        if (res.success && res.data?.addresses?.length) {
          setSavedAddresses(res.data.addresses);
          const defaultAddr = res.data.addresses.find(a => a.isDefault) || res.data.addresses[0];
          if (defaultAddr) fillAddress(defaultAddr);
        }
      })
      .catch(() => { /* saved addresses are optional */ });

    return () => { cancelled = true; };
  }, [fillAddress]);

  /** Options the shopper can actually complete, given gateway availability. */
  const availableOptions = useMemo(() => {
    const online = gateways.myfatoorah?.available !== false;

    // Apple Pay needs three things to line up: the device can present the
    // sheet, the browser reports an active card, and the merchant account has
    // Apple Pay switched on. Showing the option when any is false produces a
    // dead-end at the last step of checkout.
    const deviceCanApplePay =
      typeof window !== 'undefined' &&
      !!window.ApplePaySession &&
      window.ApplePaySession.canMakePayments?.() === true;

    // Cash on delivery is not offered by ARTÉVA — card, KNET and Deema only.
    return [
      { id: 'card', Mark: CardMark, title: t('credit_card'), desc: t('secure_payment'), enabled: online },
      { id: 'knet', Mark: KnetMark, title: t('knet'), desc: t('knet_desc'), enabled: online },
      { id: 'applepay', Mark: WalletMark, title: t('apple_pay'), desc: t('apple_pay_desc'), enabled: online && deviceCanApplePay && applePayEnabled },
      { id: 'deema', Mark: BnplMark, title: t('deema_bnpl'), desc: t('deema_desc'), enabled: gateways.deema?.available !== false },
    ].filter(o => o.enabled);
  }, [gateways, applePayEnabled, t]);

  // Never leave a selection pointing at a method that has since disappeared.
  useEffect(() => {
    if (paymentMethod && !availableOptions.some(o => o.id === paymentMethod)) {
      setPaymentMethod('');
    }
  }, [availableOptions, paymentMethod]);

  const onlineUnavailable = gatewayChecked && gateways.myfatoorah?.available === false;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setErrors(prev => (prev[name] ? { ...prev, [name]: undefined } : prev));
    setForm(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'country' && COUNTRY_CODES[value]) next.phoneCode = COUNTRY_CODES[value];
      return next;
    });
  };

  const handlePinChange = useCallback(({ lat, lng }) => {
    setForm(prev => ({ ...prev, lat, lng }));
  }, []);

  /** Reverse geocoding fills only the fields the shopper has left blank. */
  const handleAddressResolved = useCallback((resolved) => {
    setForm(prev => ({
      ...prev,
      street: prev.street || resolved.street || '',
      city: prev.city || resolved.city || '',
      state: prev.state || resolved.state || '',
      zipCode: prev.zipCode || resolved.zipCode || '',
    }));
  }, []);

  const getMethodId = useCallback((type) => {
    const fallbacks = { knet: 1, card: 2, applepay: 20 };
    if (!paymentMethods.length) return fallbacks[type] || null;
    const lower = (m) => (m.name || '').toLowerCase();
    let method;
    if (type === 'knet') method = paymentMethods.find(m => lower(m).includes('knet') || (m.code || '').toLowerCase() === 'kn');
    else if (type === 'card') method = paymentMethods.find(m => lower(m).includes('visa') || lower(m).includes('master') || (m.code || '').toLowerCase() === 'vm');
    else if (type === 'applepay') method = paymentMethods.find(m => lower(m).includes('apple'));
    return method ? method.id : (fallbacks[type] || null);
  }, [paymentMethods]);

  const syncCartToServer = async () => {
    await CartAPI.clear().catch(() => {});
    for (const item of items) {
      await CartAPI.add(item._id || item.id, item.quantity);
    }
  };

  const collectAddress = () => {
    const next = {};
    if (!form.street.trim()) next.street = t('field_required');
    if (!form.city.trim()) next.city = t('field_required');

    let phoneDigits = form.phone.replace(/[^\d]/g, '');
    if (phoneDigits.startsWith('0')) phoneDigits = phoneDigits.slice(1);
    const codeDigits = form.phoneCode.replace('+', '');
    if (phoneDigits.startsWith(codeDigits) && phoneDigits.length > 8) {
      phoneDigits = phoneDigits.slice(codeDigits.length);
    }
    if (!phoneDigits || phoneDigits.length < 7) next.phone = t('invalid_phone');

    setErrors(next);
    if (Object.keys(next).length) {
      showToast(t('fill_required_fields'), 'error');
      return null;
    }

    return {
      street: form.street.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      country: form.country,
      zipCode: form.zipCode.trim(),
      phone: form.phoneCode + phoneDigits,
      label: addressType,
      coordinates: (form.lat && form.lng) ? { lat: form.lat, lng: form.lng } : undefined,
    };
  };

  /** Maps a backend error code onto copy the shopper can act on. */
  const describeFailure = (err) => {
    switch (err.code) {
      case 'PAYMENT_GATEWAY_UNAVAILABLE':
      case 'PAYMENT_GATEWAY_UNAUTHORIZED':
      case 'PAYMENT_GATEWAY_UNREACHABLE':
        setGateways(g => ({ ...g, myfatoorah: { available: false, reason: err.code } }));
        return t('payment_online_unavailable');
      case 'PAYMENT_GATEWAY_TIMEOUT':
        return t('payment_timeout');
      case 'CART_EMPTY':
      case 'CART_ITEMS_UNAVAILABLE':
        return err.message;
      case 'VALIDATION_ERROR':
        if (Array.isArray(err.details)) {
          setErrors(Object.fromEntries(err.details.map(d => [d.field, d.message])));
        }
        return err.message;
      default:
        return err.message || t('payment_failed');
    }
  };

  /* Re-read stock the moment checkout opens.
   *
   * The server refuses an oversell at the point of order, but by then the
   * customer has chosen an address, pinned a map location and picked a payment
   * method — and the failure arrives as a rejected order rather than as
   * something they can act on. Checking on arrival means the basket is
   * corrected before any of that work is asked for.
   */
  useEffect(() => { refreshStock(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!paymentMethod) { showToast(t('select_payment_method'), 'error'); return; }
    const address = collectAddress();
    if (!address) return;

    /* Last check before taking payment.
     *
     * Someone else may have bought the last one during the minutes spent on
     * this form. Sending the customer to a payment gateway for stock that is
     * gone means taking money for goods that cannot ship — so this runs before
     * the redirect, not after.
     */
    setProcessing(true);
    const adjustments = await refreshStock();
    if (adjustments.length) {
      setProcessing(false);
      showToast(
        'Your bag changed while you were checking out. Please review it before paying.',
        'error'
      );
      return;
    }


    // Reported at the point of committing to pay, before the gateway redirect
    // takes the tab away — this is the last moment we can speak for the basket.
    trackInitiateCheckout(items, total);

    try {
      await syncCartToServer();

      if (paymentMethod === 'deema') {
        const data = await PaymentsAPI.createDeemaCheckout({
          shippingAddress: address,
          promoCode: promoCode || undefined,
          promoVisitId: promoVisitId || undefined,
        });
        if (!data.success || !data.data?.paymentUrl) throw new Error(data.message || t('payment_failed'));
        window.location.href = data.data.paymentUrl;
        return;
      }

      // Apple Pay opens a merchant session first. That call is what validates
      // our domain with Apple — it needs the gateway secret, so it can only
      // happen server-side. Settlement then runs through the same execute →
      // callback → verify pipeline as every other method, which is what makes
      // the payment verifiable rather than trusted.
      if (paymentMethod === 'applepay') {
        const session = await PaymentsAPI.initApplePaySession(total);
        if (!session.success || !session.data?.methodId) {
          throw new Error(t('apple_pay_unavailable'));
        }
        const data = await PaymentsAPI.executePayment(
          session.data.methodId, address, promoCode, promoVisitId
        );
        if (!data.success || !data.data?.paymentUrl) throw new Error(data.message || t('payment_failed'));
        window.location.href = data.data.paymentUrl;
        return;
      }

      const methodId = getMethodId(paymentMethod);
      const data = await PaymentsAPI.executePayment(
        methodId, address, promoCode, promoVisitId
      );
      if (!data.success || !data.data?.paymentUrl) throw new Error(data.message || t('payment_failed'));
      window.location.href = data.data.paymentUrl;
    } catch (err) {
      showToast(describeFailure(err), 'error');
      setProcessing(false);
    }
  };

  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <div className="section-header-text">
            <span className="eyebrow">{t('secure_checkout_label')}</span>
            <h1>{t('checkout')}</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="checkout-layout" noValidate>
          {/* ── Left: shipping + payment ── */}
          <div className="checkout-left">
            <section className="glass-card-component checkout-section">
              <h2 className="checkout-section-title">{t('shipping_address')}</h2>

              <div className="address-type-selector" role="group" aria-label={t('address_label')}>
                {ADDRESS_TYPES.map(({ key, Mark }) => (
                  <button
                    key={key} type="button"
                    className={`address-type-btn ${addressType === key ? 'active' : ''}`}
                    aria-pressed={addressType === key}
                    onClick={() => {
                      setAddressType(key);
                      if (key !== 'Other' && savedAddresses.length) {
                        const match = savedAddresses.find(a => (a.label || '').toLowerCase().includes(key.toLowerCase()));
                        if (match) fillAddress(match);
                      }
                    }}
                  >
                    <Mark />
                    <span>{t(`address_type_${key.toLowerCase()}`)}</span>
                  </button>
                ))}
              </div>

              {savedAddresses.length > 0 && (
                <Select
                  label={t('saved_addresses')}
                  defaultValue=""
                  onChange={e => { if (e.target.value) fillAddress(JSON.parse(e.target.value)); }}
                >
                  <option value="">{t('select_placeholder')}</option>
                  {savedAddresses.map((addr, i) => (
                    <option key={i} value={JSON.stringify(addr)}>
                      {addr.label} — {addr.street}{addr.isDefault ? ` (${t('default_label')})` : ''}
                    </option>
                  ))}
                </Select>
              )}

              <LocationPicker
                value={{ lat: form.lat, lng: form.lng }}
                onChange={handlePinChange}
                onAddressResolved={handleAddressResolved}
              />

              <Input
                label={t('street_address')} name="street" required
                value={form.street} onChange={handleChange}
                error={errors.street} autoComplete="address-line1"
              />

              <FieldRow>
                <Input
                  label={t('city')} name="city" required
                  value={form.city} onChange={handleChange}
                  error={errors.city} autoComplete="address-level2"
                />
                <Input
                  label={t('state_area')} name="state"
                  value={form.state} onChange={handleChange}
                  autoComplete="address-level1"
                />
              </FieldRow>

              <FieldRow>
                <Select
                  label={t('country')} name="country"
                  value={form.country} onChange={handleChange}
                  autoComplete="country-name"
                  options={COUNTRIES.map(c => ({ value: c, label: c }))}
                />
                <Input
                  label={t('postal_code')} name="zipCode"
                  value={form.zipCode} onChange={handleChange}
                  inputMode="numeric" autoComplete="postal-code"
                />
              </FieldRow>

              <div className="phone-field">
                <span className="field-label">
                  {t('phone_number')}<span className="field-required" aria-hidden="true">*</span>
                </span>
                <div className="phone-input-group">
                  <Select
                    name="phoneCode" value={form.phoneCode} onChange={handleChange}
                    wrapperClassName="phone-code" aria-label={t('country')}
                    options={Object.entries(COUNTRY_CODES).map(([c, code]) => ({
                      value: code, label: `${code} · ${c}`,
                    }))}
                  />
                  <Input
                    name="phone" type="tel" required
                    placeholder={t('phone_placeholder')}
                    value={form.phone} onChange={handleChange}
                    error={errors.phone} autoComplete="tel-national"
                    wrapperClassName="phone-number"
                    aria-label={t('phone_number')}
                  />
                </div>
              </div>

              <Textarea
                label={t('order_notes')} name="notes" rows={3}
                value={form.notes} onChange={handleChange}
              />
            </section>

            <section className="glass-card-component checkout-section">
              <h2 className="checkout-section-title">{t('payment_method')}</h2>

              {onlineUnavailable && (
                <div className="checkout-alert" role="alert">
                  <span className="checkout-alert-icon"><AlertCircleIcon size={18} /></span>
                  <p>{t('payment_online_unavailable')}</p>
                </div>
              )}

              {availableOptions.length === 0 && (
                <div className="checkout-alert checkout-alert-error" role="alert">
                  <span className="checkout-alert-icon"><AlertCircleIcon size={18} /></span>
                  <p>{t('payment_none_available')}</p>
                </div>
              )}

              <div className="payment-methods">
                {availableOptions.map(({ id, Mark, title, desc }) => (
                  <label
                    key={id}
                    className={`payment-option ${paymentMethod === id ? 'selected' : ''}`}
                  >
                    <input
                      type="radio" name="paymentMethod" value={id}
                      checked={paymentMethod === id}
                      onChange={e => setPaymentMethod(e.target.value)}
                    />
                    <span className="payment-mark"><Mark /></span>
                    <span className="payment-copy">
                      <strong>{title}</strong>
                      <small>{desc}</small>
                    </span>
                    <span className="payment-check" aria-hidden="true" />
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* ── Right: order summary ── */}
          <aside className="checkout-right">
            <div className="glass-card-component checkout-section checkout-summary">
              <h2 className="checkout-section-title">{t('order_summary')}</h2>

              <div className="checkout-items">
                {items.map(item => {
                  const id = item._id || item.id;
                  const name = lang === 'ar' && item.nameAr ? item.nameAr : item.name;
                  return (
                    <div key={id} className="checkout-item">
                      <div className="checkout-item-image">
                        <img src={item.image} alt="" loading="lazy" onError={handleImageError} />
                        <span className="checkout-item-qty">{item.quantity}</span>
                      </div>
                      <div className="checkout-item-info">
                        <span className="checkout-item-name">{name}</span>
                        <span className="checkout-item-price">{format(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <PromoCodeField compact />

              <div className="checkout-giftwrap">
                <label className="checkout-giftwrap-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(giftWrap?.enabled)}
                    onChange={e => setGiftWrap(e.target.checked, giftWrap?.message || '')}
                  />
                  <span className="checkout-giftwrap-label">
                    {t('gift_wrapping')}
                    <span className="checkout-giftwrap-price">+{format(giftWrap?.fee || 3)}</span>
                  </span>
                </label>

                {giftWrap?.enabled && (
                  <textarea
                    className="checkout-giftwrap-note"
                    rows={2}
                    maxLength={300}
                    placeholder={t('gift_message_placeholder')}
                    defaultValue={giftWrap?.message || ''}
                    /* Saved on blur, not on every keystroke — a request per
                       character would be a request per character. */
                    onBlur={e => {
                      const next = e.target.value.trim();
                      if (next !== (giftWrap?.message || '')) setGiftWrap(true, next);
                    }}
                  />
                )}
              </div>

              <div className="checkout-totals">
                <div className="checkout-total-row">
                  <span>{t('subtotal')}</span><span>{format(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="checkout-total-row checkout-total-discount">
                    <span>{t('discount')} · {promoCode}</span>
                    <span>−{format(discount)}</span>
                  </div>
                )}
                <div className="checkout-total-row">
                  <span>{t('shipping')}</span><span>{format(shipping)}</span>
                </div>
                {wrapFee > 0 && (
                  <div className="checkout-total-row">
                    <span>{t('gift_wrapping')}</span><span>{format(wrapFee)}</span>
                  </div>
                )}
                <div className="checkout-total-row checkout-total-final">
                  <span>{t('total')}</span><span>{format(total)}</span>
                </div>
              </div>

              <Button
                type="submit" variant="primary" size="lg" fullWidth
                loading={processing} disabled={processing || !paymentMethod}
              >
                {processing ? t('processing') : t('place_order')}
              </Button>

              <p className="checkout-secure">
                <LockMark /> {t('secure_checkout')}
              </p>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
