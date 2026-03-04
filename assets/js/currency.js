/**
 * ARTEVA Maison - Currency Service
 * Handles GCC currency conversion and persistence
 */

const CurrencyAPI = {
    // Base currency is KWD
    rates: {
        'KWD': 1,
        'SAR': 12.25,
        'AED': 12.00,
        'QAR': 12.00,
        'BHD': 1.23,
        'OMR': 1.26,
        'USD': 3.25
    },

    symbols: {
        'KWD': 'KWD',
        'SAR': 'SAR',
        'AED': 'AED',
        'QAR': 'QAR',
        'BHD': 'BHD',
        'OMR': 'OMR',
        'USD': 'USD'
    },

    flags: {
        'KWD': 'kw',
        'SAR': 'sa',
        'AED': 'ae',
        'QAR': 'qa',
        'BHD': 'bh',
        'OMR': 'om',
        'USD': 'us'
    },

    names: {
        'KWD': 'Kuwaiti Dinar',
        'SAR': 'Saudi Riyal',
        'AED': 'UAE Dirham',
        'QAR': 'Qatari Riyal',
        'BHD': 'Bahraini Dinar',
        'OMR': 'Omani Rial',
        'USD': 'US Dollar'
    },

    // Decimals for formatting
    decimals: {
        'KWD': 3,
        'SAR': 2,
        'AED': 2,
        'QAR': 2,
        'BHD': 3,
        'OMR': 3,
        'USD': 2
    },

    getCurrent() {
        // Priority: 1. User profile (if logged in), 2. localStorage, 3. Default 'KWD'
        if (window.AuthAPI && window.AuthAPI.isLoggedIn()) {
            const user = window.AuthAPI.getUser();
            if (user && user.currency && this.rates[user.currency]) {
                localStorage.setItem('arteva_currency', user.currency);
                return user.currency;
            }
        }
        return localStorage.getItem('arteva_currency') || 'KWD';
    },

    setCurrent(code) {
        if (!this.rates[code]) return;

        // Save to localStorage FIRST
        localStorage.setItem('arteva_currency', code);

        // Force immediate UI update - pass code directly to avoid stale reads
        this.updatePagePrices();
        this.updateSwitcherUI(code);

        // Also trigger cart and checkout updates if available
        if (window.CartAPI && typeof window.CartAPI.updateCartDisplay === 'function') {
            window.CartAPI.updateCartDisplay();
        }
        if (window.updateOrderSummary && typeof window.updateOrderSummary === 'function') {
            window.updateOrderSummary();
        }

        // Sync with backend if logged in (async, don't wait)
        if (window.AuthAPI && window.AuthAPI.isLoggedIn()) {
            window.AuthAPI.updateProfile({ currency: code })
                .then(updatedUser => {
                    if (updatedUser && updatedUser.data) {
                        localStorage.setItem('arteva_user', JSON.stringify(updatedUser.data));
                    }
                })
                .catch(() => { }); // Silent fail
        }
    },

    // Convert and format a KWD value
    format(kwdValue, targetCode) {
        const rate = this.rates[targetCode];
        const converted = kwdValue * rate;
        const decimals = this.decimals[targetCode];
        return converted.toFixed(decimals) + ' ' + this.symbols[targetCode];
    },

    // Update all price elements on the page
    updatePagePrices() {
        const currentCode = this.getCurrent();
        // Expanded selector to catch all price elements including checkout
        const priceElements = document.querySelectorAll('.current-price, .price-display, .product-current-price, #checkoutSubtotal, #checkoutTotal, .checkout-item-price, .cart-item-price');

        priceElements.forEach(el => {
            let basePrice = el.getAttribute('data-base-price');

            // If no base price stored, extract it (assuming it's in KWD)
            if (!basePrice) {
                const text = el.textContent.trim().replace(/[^\d.]/g, '');
                const val = parseFloat(text);
                if (!isNaN(val) && val > 0) {
                    basePrice = val;
                    el.setAttribute('data-base-price', basePrice);
                }
            }

            if (basePrice) {
                const val = parseFloat(basePrice);
                const rate = this.rates[currentCode];
                const converted = val * rate;
                const decimals = this.decimals[currentCode];

                // Update the element with new currency
                el.innerHTML = `${converted.toFixed(decimals)} <span class="price-currency">${this.symbols[currentCode]}</span>`;
            }
        });

        // Don't trigger cart update here to avoid recursion - cart will call this
    },

    updateSwitcherUI(overrideCode) {
        const current = overrideCode || this.getCurrent();

        // Update floating widget trigger
        const floatingTrigger = document.querySelector('.floating-currency-trigger');
        if (floatingTrigger) {
            const flag = floatingTrigger.querySelector('.currency-flag');
            const codeText = floatingTrigger.querySelector('.currency-code-text');
            if (flag) {
                const flagCode = this.flags[current] || 'kw';
                flag.className = 'currency-flag fi fi-' + flagCode;
            }
            if (codeText) {
                codeText.textContent = current;
            }
        }

        // Update floating dropdown active state
        const floatingOptions = document.querySelectorAll('.floating-currency-option');
        floatingOptions.forEach(option => {
            if (option.dataset.currency === current) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });

        // Also update legacy selectors if any still exist
        const btns = document.querySelectorAll('.currency-btn');
        btns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.currency === current);
        });

        const display = document.getElementById('currentCurrencyDisplay');
        if (display) display.textContent = current;
    },

    _createFloatingWidget() {
        // Don't create on admin pages
        if (document.body.classList.contains('admin-body')) return;

        // Don't double-create
        if (document.querySelector('.floating-currency')) return;

        const current = this.getCurrent();
        const flagCode = this.flags[current] || 'kw';

        const currencies = Object.keys(this.rates);
        const optionsHTML = currencies.map(code => {
            const fc = this.flags[code];
            return `<div class="floating-currency-option ${code === current ? 'active' : ''}" data-currency="${code}">
                <span class="option-flag fi fi-${fc}"></span>
                <span class="option-name">${this.names[code]}</span>
                <span class="option-code">${code}</span>
            </div>`;
        }).join('');

        const widget = document.createElement('div');
        widget.className = 'floating-currency';
        widget.innerHTML = `
            <div class="floating-currency-trigger">
                <span class="currency-flag fi fi-${flagCode}"></span>
                <span class="currency-code-text">${current}</span>
                <svg class="currency-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
            </div>
            <div class="floating-currency-dropdown">
                ${optionsHTML}
            </div>
        `;

        document.body.appendChild(widget);
    },

    init() {
        // Load currency preference
        let savedCurrency = 'KWD';

        if (window.AuthAPI && window.AuthAPI.isLoggedIn()) {
            const user = window.AuthAPI.getUser();
            if (user && user.currency && this.rates[user.currency]) {
                savedCurrency = user.currency;
                localStorage.setItem('arteva_currency', savedCurrency);
            } else {
                savedCurrency = localStorage.getItem('arteva_currency') || 'KWD';
            }
        } else {
            savedCurrency = localStorage.getItem('arteva_currency') || 'KWD';
        }

        // Create the floating widget
        this._createFloatingWidget();

        // Apply currency immediately
        this.updatePagePrices();
        this.updateSwitcherUI();

        // Event delegation for the floating widget
        document.addEventListener('click', (e) => {
            // Floating currency option click
            const floatingOption = e.target.closest('.floating-currency-option');
            if (floatingOption) {
                e.preventDefault();
                e.stopPropagation();
                const code = floatingOption.dataset.currency;
                if (code) {
                    this.setCurrent(code);
                    // Close dropdown
                    const widget = document.querySelector('.floating-currency');
                    if (widget) widget.classList.remove('open');
                }
                return;
            }

            // Floating trigger click (toggle)
            const floatingTrigger = e.target.closest('.floating-currency-trigger');
            if (floatingTrigger) {
                e.preventDefault();
                e.stopPropagation();
                const widget = floatingTrigger.closest('.floating-currency');
                if (widget) {
                    widget.classList.toggle('open');
                }
                return;
            }

            // Legacy: currency-btn clicks
            if (e.target.matches('.currency-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const code = e.target.dataset.currency;
                if (code) this.setCurrent(code);
                return;
            }

            // Legacy: currency-option clicks
            const option = e.target.closest('.currency-option');
            if (option) {
                e.preventDefault();
                e.stopPropagation();
                const code = option.dataset.currency;
                if (code) {
                    this.setCurrent(code);
                    const selector = option.closest('.currency-selector');
                    if (selector) selector.classList.remove('open');
                }
                return;
            }

            // Close floating on outside click
            const floatingWidget = document.querySelector('.floating-currency');
            if (floatingWidget && !floatingWidget.contains(e.target)) {
                floatingWidget.classList.remove('open');
            }

            // Close legacy selectors
            document.querySelectorAll('.currency-selector.open').forEach(s => {
                if (!s.contains(e.target)) s.classList.remove('open');
            });
        });

        // Desktop: open on hover
        const widget = document.querySelector('.floating-currency');
        if (widget) {
            let hoverTimer;
            widget.addEventListener('mouseenter', () => {
                clearTimeout(hoverTimer);
                // Only use hover on non-touch devices
                if (!('ontouchstart' in window)) {
                    widget.classList.add('open');
                }
            });
            widget.addEventListener('mouseleave', () => {
                if (!('ontouchstart' in window)) {
                    hoverTimer = setTimeout(() => {
                        widget.classList.remove('open');
                    }, 200);
                }
            });
        }

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const w = document.querySelector('.floating-currency');
                if (w) w.classList.remove('open');
                document.querySelectorAll('.currency-selector.open').forEach(s => s.classList.remove('open'));
            }
        });

        // MutationObserver: auto-apply currency when new price elements appear
        const priceObserver = new MutationObserver((mutations) => {
            let hasNewPrices = false;
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        if (node.matches && (node.matches('.current-price, .price-display, .product-current-price') || node.querySelector('.current-price, .price-display, .product-current-price'))) {
                            hasNewPrices = true;
                        }
                    }
                });
            });
            if (hasNewPrices) {
                this.updatePagePrices();
                this.updateSwitcherUI();
            }
        });

        priceObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    // Convenience method for other scripts to call after dynamically loading content
    reapply() {
        this.updatePagePrices();
        this.updateSwitcherUI();
    }
};

// Expose to window for dynamic calls
window.CurrencyAPI = CurrencyAPI;

// Initialize on load - ensure it runs early
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        CurrencyAPI.init();
    });
} else {
    // DOM already loaded
    CurrencyAPI.init();
}
