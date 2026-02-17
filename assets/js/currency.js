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
        'OMR': 1.26
    },

    symbols: {
        'KWD': 'KWD',
        'SAR': 'SAR',
        'AED': 'AED',
        'QAR': 'QAR',
        'BHD': 'BHD',
        'OMR': 'OMR'
    },

    flags: {
        'KWD': 'kw',
        'SAR': 'sa',
        'AED': 'ae',
        'QAR': 'qa',
        'BHD': 'bh',
        'OMR': 'om'
    },

    names: {
        'KWD': 'Kuwaiti Dinar',
        'SAR': 'Saudi Riyal',
        'AED': 'UAE Dirham',
        'QAR': 'Qatari Riyal',
        'BHD': 'Bahraini Dinar',
        'OMR': 'Omani Rial'
    },

    // Decimals for formatting
    decimals: {
        'KWD': 3,
        'SAR': 2,
        'AED': 2,
        'QAR': 2,
        'BHD': 3,
        'OMR': 3
    },

    getCurrent() {
        return localStorage.getItem('arteva_currency') || 'KWD';
    },

    setCurrent(code) {
        if (!this.rates[code]) return;
        localStorage.setItem('arteva_currency', code);
        this.updatePagePrices();
        this.updateSwitcherUI();

        // Sync with backend if logged in
        if (window.AuthAPI && window.AuthAPI.isLoggedIn()) {
            window.AuthAPI.updateProfile({ currency: code })
                .catch(err => console.error('Failed to sync currency preference', err));
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
        const priceElements = document.querySelectorAll('.product-price .current-price, .price-display');

        priceElements.forEach(el => {
            // Ensure we have the base price
            let basePrice = el.getAttribute('data-base-price');

            // If not set, try to parse from text (only works if text is currently KWD)
            // Better to rely on data-base-price. If missing, we skip or try to parse once.
            if (!basePrice) {
                const text = el.textContent.trim().split(' ')[0];
                const val = parseFloat(text);
                if (!isNaN(val)) {
                    basePrice = val;
                    el.setAttribute('data-base-price', basePrice);
                }
            }

            if (basePrice) {
                const val = parseFloat(basePrice);
                // Update text
                // We reconstruct the HTML: value + <span class="price-currency">CODE</span>
                const rate = this.rates[currentCode];
                const converted = val * rate;
                const decimals = this.decimals[currentCode];

                el.innerHTML = `${converted.toFixed(decimals)} <span class="price-currency">${this.symbols[currentCode]}</span>`;
            }
        });
    },

    updateSwitcherUI() {
        const current = this.getCurrent();

        // Update footer currency buttons
        const btns = document.querySelectorAll('.currency-btn');
        btns.forEach(btn => {
            if (btn.dataset.currency === current) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update ALL currency selectors (header and footer)
        const triggers = document.querySelectorAll('.currency-trigger');
        triggers.forEach(trigger => {
            const flag = trigger.querySelector('.currency-flag');
            const codeElement = trigger.querySelector('.currency-code');
            
            if (flag) {
                const flagCode = this.flags[current] || 'kw';
                flag.className = 'currency-flag fi fi-' + flagCode;
                flag.style.display = 'block';
            }
            
            // Show code in footer, hide in header
            if (codeElement) {
                const isFooter = trigger.closest('.footer-currency-selector');
                if (isFooter) {
                    codeElement.textContent = current;
                    codeElement.style.display = 'inline-block';
                } else {
                    codeElement.style.display = 'none';
                }
            }
            
            trigger.classList.add('active');
        });

        // Update ALL dropdown options
        const options = document.querySelectorAll('.currency-option');
        options.forEach(option => {
            const currencyCode = option.dataset.currency;
            if (currencyCode === current) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }

            const flagElement = option.querySelector('.currency-option-flag');
            const codeElement = option.querySelector('.currency-option-code');
            const isFooter = option.closest('.footer-currency-selector');

            if (flagElement && this.flags[currencyCode]) {
                const flagCode = this.flags[currencyCode];
                flagElement.className = 'currency-option-flag fi fi-' + flagCode;
                flagElement.style.display = 'block';
            }

            // Show code in footer, hide in header
            if (codeElement) {
                if (isFooter) {
                    codeElement.style.display = 'inline-block';
                } else {
                    codeElement.style.display = 'none';
                }
            }
        });

        const display = document.getElementById('currentCurrencyDisplay');
        if (display) display.textContent = current;
    },

    init() {
        // Load saved preferences
        let savedCurrency = localStorage.getItem('arteva_currency');

        // Check if user has a saved preference in their profile
        if (window.AuthAPI && window.AuthAPI.isLoggedIn()) {
            const user = window.AuthAPI.getUser();
            if (user && user.currency && this.rates[user.currency]) {
                savedCurrency = user.currency;
                localStorage.setItem('arteva_currency', savedCurrency);
            }
        }

        if (!savedCurrency) savedCurrency = 'KWD';

        // Immediately hide all currency codes and ensure flags are visible
        document.querySelectorAll('.currency-option-code').forEach(codeEl => {
            codeEl.style.display = 'none';
            codeEl.textContent = ''; // Clear any text content
        });

        // Ensure all flags are visible and properly set
        document.querySelectorAll('.currency-option').forEach(option => {
            const currencyCode = option.dataset.currency;
            const flagEl = option.querySelector('.currency-option-flag');
            if (flagEl && this.flags[currencyCode]) {
                const flagCode = this.flags[currencyCode];
                flagEl.className = 'currency-option-flag fi fi-' + flagCode;
                flagEl.style.display = 'block';
                flagEl.style.visibility = 'visible';
            }
        });

        this.updatePagePrices();
        this.updateSwitcherUI();

        // Attach event listeners to switchers - use event delegation with better handling
        document.addEventListener('click', (e) => {
            // Footer currency buttons
            if (e.target.matches('.currency-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const code = e.target.dataset.currency;
                if (code) {
                    this.setCurrent(code);
                }
                return;
            }

            // Currency dropdown options (works for both header and footer)
            const option = e.target.closest('.currency-option');
            if (option) {
                e.preventDefault();
                e.stopPropagation();
                const code = option.dataset.currency;
                if (code) {
                    this.setCurrent(code);
                    // Close the dropdown
                    const selector = option.closest('.currency-selector');
                    if (selector) selector.classList.remove('open');
                }
                return;
            }

            // Currency trigger button (works for both header and footer)
            const trigger = e.target.closest('.currency-trigger');
            if (trigger) {
                e.preventDefault();
                e.stopPropagation();
                const selector = trigger.closest('.currency-selector');
                if (selector) {
                    const isOpen = selector.classList.contains('open');
                    // Close all other dropdowns first
                    document.querySelectorAll('.currency-selector.open').forEach(s => {
                        if (s !== selector) s.classList.remove('open');
                    });
                    selector.classList.toggle('open', !isOpen);
                }
                return;
            }

            // Close dropdown when clicking outside
            const openSelectors = document.querySelectorAll('.currency-selector.open');
            openSelectors.forEach(selector => {
                if (!selector.contains(e.target)) {
                    selector.classList.remove('open');
                }
            });
        });

        // Close dropdown on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.currency-selector.open').forEach(selector => {
                    selector.classList.remove('open');
                });
            }
        });
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
