/**
 * ARTÉVA Maison — Promo Code Module
 * Shared promo code logic for cart.html and checkout.html
 * Handles: apply, remove, persist (localStorage), render, recalculate totals
 */

(function () {
    'use strict';

    const PROMO_STORAGE_KEY = 'arteva_promo';

    const API = () => window.API_BASE_URL || (window.location.hostname === 'localhost'
        ? 'http://localhost:5000/api'
        : 'https://arteva-maison-backend-gy1x.onrender.com/api');
    const TOKEN = () => localStorage.getItem('arteva_token');

    // ═══════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════

    let appliedPromo = null; // { code, name, promoCodeId, totalDiscount, discounts[], matchedProducts }

    // ═══════════════════════════════════════════════════
    // PERSISTENCE
    // ═══════════════════════════════════════════════════

    function loadPromoState() {
        try {
            const saved = localStorage.getItem(PROMO_STORAGE_KEY);
            if (saved) {
                appliedPromo = JSON.parse(saved);
                // Client-side expiry check removed — server validates on order creation
            }
        } catch (e) {
            appliedPromo = null;
        }
    }

    function savePromoState() {
        if (appliedPromo) {
            localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(appliedPromo));
        } else {
            localStorage.removeItem(PROMO_STORAGE_KEY);
        }
    }

    function getAppliedPromo() {
        if (!appliedPromo) loadPromoState();
        return appliedPromo;
    }

    // ═══════════════════════════════════════════════════
    // APPLY PROMO CODE
    // ═══════════════════════════════════════════════════

    async function applyPromoCode(code) {
        if (!code || !code.trim()) {
            showPromoNotification('Please enter a promo code', 'error');
            return false;
        }

        if (!TOKEN()) {
            showPromoNotification('Please login to use promo codes', 'error');
            return false;
        }

        // Get cart items for validation
        const cart = JSON.parse(localStorage.getItem('arteva_cart') || '[]');
        if (cart.length === 0) {
            showPromoNotification('Your cart is empty', 'error');
            return false;
        }

        const cartItems = cart.map(item => ({
            product: item.id,
            quantity: item.quantity,
            price: item.price
        }));

        try {
            const res = await fetch(`${API()}/promo-codes/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${TOKEN()}`
                },
                body: JSON.stringify({ code: code.trim(), cartItems })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                showPromoNotification(data.message || 'Invalid promo code', 'error');
                return false;
            }

            if (data.data.matchedProducts === 0) {
                showPromoNotification('This promo code doesn\'t apply to any items in your cart', 'error');
                return false;
            }

            appliedPromo = data.data;
            savePromoState();
            renderPromoUI();
            recalculateTotals();

            // Refresh checkout item display to show per-item discounts
            if (typeof window.updateOrderSummary === 'function') window.updateOrderSummary();

            const lang = localStorage.getItem('site_lang') || 'en';
            const msg = lang === 'ar'
                ? `تم تطبيق كود "${appliedPromo.code}" — خصم ${appliedPromo.totalDiscount.toFixed(3)} د.ك`
                : `Code "${appliedPromo.code}" applied — saving ${appliedPromo.totalDiscount.toFixed(3)} KWD`;
            showPromoNotification(msg, 'success');

            return true;
        } catch (err) {
            console.error('[PROMO] Validation error:', err);
            showPromoNotification('Failed to validate promo code', 'error');
            return false;
        }
    }

    // ═══════════════════════════════════════════════════
    // REMOVE PROMO CODE
    // ═══════════════════════════════════════════════════

    function removePromoCode() {
        appliedPromo = null;
        savePromoState();
        renderPromoUI();
        recalculateTotals();

        // Refresh checkout item display to remove per-item discount indicators
        if (typeof window.updateOrderSummary === 'function') window.updateOrderSummary();
    }

    // ═══════════════════════════════════════════════════
    // RE-VALIDATE (call when cart changes)
    // ═══════════════════════════════════════════════════

    async function revalidatePromo() {
        if (!appliedPromo) return;

        const cart = JSON.parse(localStorage.getItem('arteva_cart') || '[]');

        // If cart is empty, clear promo
        if (cart.length === 0) {
            removePromoCode();
            return;
        }

        // Check if any promo products are still in cart
        if (appliedPromo.discounts && appliedPromo.discounts.length > 0) {
            const cartProductIds = new Set(cart.map(item => item.id));
            const hasMatchingProduct = appliedPromo.discounts.some(d => cartProductIds.has(d.product));
            if (!hasMatchingProduct) {
                // All discounted products were removed
                removePromoCode();
                showPromoNotification('Promo code removed — discounted items no longer in cart', 'info');
                return;
            }
        }

        // Re-validate with server to recalculate amounts
        if (TOKEN()) {
            try {
                const cartItems = cart.map(item => ({
                    product: item.id,
                    quantity: item.quantity,
                    price: item.price
                }));

                const res = await fetch(`${API()}/promo-codes/validate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${TOKEN()}`
                    },
                    body: JSON.stringify({ code: appliedPromo.code, cartItems })
                });

                const data = await res.json();

                if (res.ok && data.success && data.data.matchedProducts > 0) {
                    appliedPromo = data.data;
                    savePromoState();
                } else {
                    // Promo no longer valid
                    removePromoCode();
                }
            } catch (err) {
                // Silently keep the current state if server unreachable
                console.warn('[PROMO] Re-validation failed:', err);
            }
        }

        renderPromoUI();
        recalculateTotals();
    }

    // ═══════════════════════════════════════════════════
    // RENDER UI
    // ═══════════════════════════════════════════════════

    function renderPromoUI() {
        // Render in ALL promo containers on the page (cart + checkout)
        const containers = document.querySelectorAll('.promo-code-section');
        containers.forEach(container => renderPromoContainer(container));
    }

    function renderPromoContainer(container) {
        if (!container) return;

        const inputRow = container.querySelector('.promo-input-row');
        const appliedRow = container.querySelector('.promo-applied-row');
        const discountRow = container.querySelector('.promo-discount-row');

        if (!inputRow || !appliedRow) return;

        if (appliedPromo && appliedPromo.totalDiscount > 0) {
            // Show applied state
            inputRow.style.display = 'none';
            appliedRow.style.display = 'flex';
            if (discountRow) discountRow.style.display = 'flex';

            const codeEl = appliedRow.querySelector('.promo-applied-code');
            const savingEl = appliedRow.querySelector('.promo-applied-saving');
            const discountAmountEl = container.querySelector('.promo-discount-amount');

            if (codeEl) codeEl.textContent = appliedPromo.code;

            const lang = localStorage.getItem('site_lang') || 'en';
            const currency = lang === 'ar' ? 'د.ك' : 'KWD';
            if (savingEl) savingEl.textContent = `-${appliedPromo.totalDiscount.toFixed(3)} ${currency}`;
            if (discountAmountEl) {
                discountAmountEl.innerHTML = `<span class="price-display" data-base-price="${appliedPromo.totalDiscount.toFixed(3)}">-${appliedPromo.totalDiscount.toFixed(3)} <span class="price-currency">${currency}</span></span>`;
            }
        } else {
            // Show input state
            inputRow.style.display = 'flex';
            appliedRow.style.display = 'none';
            if (discountRow) discountRow.style.display = 'none';
        }
    }

    // ═══════════════════════════════════════════════════
    // RECALCULATE TOTALS
    // ═══════════════════════════════════════════════════

    function recalculateTotals() {
        const cart = JSON.parse(localStorage.getItem('arteva_cart') || '[]');
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = 2.0;
        const discount = appliedPromo ? appliedPromo.totalDiscount : 0;
        const total = subtotal + shipping - discount;

        const lang = localStorage.getItem('site_lang') || 'en';
        const currency = lang === 'ar' ? 'د.ك' : 'KWD';

        function formatPriceHTML(val) {
            return `<span class="price-display" data-base-price="${val.toFixed(3)}">${val.toFixed(3)} <span class="price-currency">${currency}</span></span>`;
        }

        // Cart page elements
        const cartSubtotal = document.getElementById('cartPageSubtotal');
        const cartTotal = document.getElementById('cartPageTotal');
        if (cartSubtotal) cartSubtotal.innerHTML = formatPriceHTML(subtotal);
        if (cartTotal) cartTotal.innerHTML = formatPriceHTML(total);

        // Checkout page elements
        const checkoutSubtotal = document.getElementById('checkoutSubtotal');
        const checkoutTotal = document.getElementById('checkoutTotal');
        if (checkoutSubtotal) checkoutSubtotal.innerHTML = formatPriceHTML(subtotal);
        if (checkoutTotal) checkoutTotal.innerHTML = formatPriceHTML(total);

        // Currency update
        if (window.CurrencyAPI) window.CurrencyAPI.updatePagePrices();
    }

    // ═══════════════════════════════════════════════════
    // NOTIFICATION HELPER
    // ═══════════════════════════════════════════════════

    function showPromoNotification(message, type) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else if (typeof window.showAdminToast === 'function') {
            window.showAdminToast(message, type);
        } else {
            alert(message);
        }
    }

    // ═══════════════════════════════════════════════════
    // INIT — Auto-load on DOMContentLoaded
    // ═══════════════════════════════════════════════════

    function initPromo() {
        loadPromoState();
        renderPromoUI();

        // Bind apply buttons
        document.querySelectorAll('.promo-apply-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const input = btn.closest('.promo-input-row')?.querySelector('.promo-code-input');
                if (input) {
                    btn.disabled = true;
                    btn.textContent = '...';
                    await applyPromoCode(input.value);
                    btn.disabled = false;
                    const lang = localStorage.getItem('site_lang') || 'en';
                    btn.textContent = lang === 'ar' ? 'تطبيق' : 'Apply';
                }
            });
        });

        // Bind enter key on input
        document.querySelectorAll('.promo-code-input').forEach(input => {
            input.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const btn = input.closest('.promo-input-row')?.querySelector('.promo-apply-btn');
                    if (btn) btn.click();
                }
            });
        });

        // Bind remove buttons
        document.querySelectorAll('.promo-remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                removePromoCode();
            });
        });

        // If promo is active, update totals
        if (appliedPromo) {
            recalculateTotals();
        }
    }

    document.addEventListener('DOMContentLoaded', initPromo);

    // ═══════════════════════════════════════════════════
    // EXPORTS
    // ═══════════════════════════════════════════════════

    window.PromoModule = {
        apply: applyPromoCode,
        remove: removePromoCode,
        revalidate: revalidatePromo,
        getApplied: getAppliedPromo,
        recalculate: recalculateTotals,
        renderUI: renderPromoUI
    };

})();
