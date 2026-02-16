/**
 * ARTEVA Maison - Checkout & Payment Integration
 * Handles checkout flow and payment processing
 */

var API_BASE_URL = window.API_BASE_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://arteva-maison-backend-gy1x.onrender.com/api');

// Stripe public key (loaded from backend or config)

let stripePublicKey = null;

// ============================================
// Initialize Checkout
// ============================================
document.addEventListener('DOMContentLoaded', async function () {
    // Check if user is logged in
    if (!window.AuthAPI?.isLoggedIn()) {
        window.location.href = 'account.html?redirect=checkout&action=register';
        return;
    }

    // 1. Initialize Map first so it's ready for any address selection
    initMap();

    // 2. Wait for map to be fully initialized
    setTimeout(() => {
        if (window.map) window.map.invalidateSize();
    }, 100);

    // 3. Load configurations
    await loadStripeConfig();

    // 4. Initialize saved addresses (will use the map)
    await initSavedAddresses();

    // 5. Initialize rest of the form
    initCheckoutForm();
    initPaymentMethodSelection();
    updateOrderSummary();
});

// ============================================
// Saved Addresses
// ============================================
async function initSavedAddresses() {
    const container = document.getElementById('savedAddressesContainer');
    const selector = document.getElementById('savedAddressSelector');

    if (!container || !selector) return;

    try {
        const response = await AuthAPI.getMe();
        if (!response.success || !response.data || !response.data.addresses || response.data.addresses.length === 0) {
            return;
        }

        const addresses = response.data.addresses;
        container.style.display = 'block';

        addresses.forEach(addr => {
            const option = document.createElement('option');
            option.value = JSON.stringify(addr);
            option.textContent = `${addr.label} - ${addr.street}`;
            if (addr.isDefault) option.textContent += ' (Default)';
            selector.appendChild(option);
        });

        // Auto-select default if exists
        const defaultAddr = addresses.find(a => a.isDefault);
        if (defaultAddr) {
            selector.value = JSON.stringify(defaultAddr);
            fillAddressForm(defaultAddr);
        }

        // Change handler
        selector.addEventListener('change', (e) => {
            if (e.target.value) {
                const addr = JSON.parse(e.target.value);
                fillAddressForm(addr);
            }
        });

    } catch (error) {
        console.error('Failed to load saved addresses:', error);
    }
}

function fillAddressForm(addr) {
    if (!addr) return;

    console.log('Filling address form with:', addr);

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('street', addr.street);
    setVal('city', addr.city);
    setVal('state', addr.state || '');
    setVal('zipCode', addr.zipCode);
    setVal('phone', addr.phone);
    setVal('country', addr.country || 'Kuwait');

    // Map coordinates - Update pin if coordinates exist
    if (addr.coordinates) {
        console.log('Address has coordinates:', addr.coordinates);

        const lat = parseFloat(addr.coordinates.lat || addr.coordinates.latitude);
        const lng = parseFloat(addr.coordinates.lng || addr.coordinates.longitude);

        console.log('Parsed coordinates:', { lat, lng });
        console.log('Map exists:', !!window.map, 'Marker exists:', !!window.marker);

        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            if (window.map && window.marker) {
                const newLatLng = new L.LatLng(lat, lng);
                window.marker.setLatLng(newLatLng);
                window.map.setView(newLatLng, 15);
                updateCoordinates(lat, lng);

                // Force map to refresh its container size
                setTimeout(() => {
                    if (window.map) {
                        window.map.invalidateSize();
                        console.log('Map updated to:', lat, lng);
                    }
                }, 100);
            } else {
                console.error('Map or marker not initialized yet');
                // Retry after a short delay
                setTimeout(() => {
                    if (window.map && window.marker) {
                        const newLatLng = new L.LatLng(lat, lng);
                        window.marker.setLatLng(newLatLng);
                        window.map.setView(newLatLng, 15);
                        updateCoordinates(lat, lng);
                        window.map.invalidateSize();
                        console.log('Map updated to (retry):', lat, lng);
                    }
                }, 500);
            }
        } else {
            console.warn('Invalid coordinates:', { lat, lng });
        }
    } else {
        console.warn('Address has no coordinates');
    }
}

// ============================================
// Map Integration
// ============================================
window.map = null;
window.marker = null;

function initMap() {
    // Fix for Leaflet marker icons not loading due to browser restrictions
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    // Default to Kuwait City
    const defaultLat = 29.3759;
    const defaultLng = 47.9774;

    window.map = L.map('map').setView([defaultLat, defaultLng], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(window.map);

    // Add draggable marker
    window.marker = L.marker([defaultLat, defaultLng], {
        draggable: true
    }).addTo(window.map);

    console.log('Map initialized:', !!window.map, 'Marker initialized:', !!window.marker);

    // Update hidden inputs on drag
    window.marker.on('dragend', function (e) {
        const position = window.marker.getLatLng();
        updateCoordinates(position.lat, position.lng);
    });

    // Handle "Use Current Location"
    const locateBtn = document.getElementById('locateMeBtn');
    if (locateBtn) {
        locateBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                locateBtn.textContent = 'Locating...';
                locateBtn.disabled = true;

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        window.map.setView([latitude, longitude], 15);
                        window.marker.setLatLng([latitude, longitude]);
                        updateCoordinates(latitude, longitude);

                        locateBtn.innerHTML = '<span style="margin-right: 4px;">📍</span> Found!';
                        setTimeout(() => {
                            locateBtn.innerHTML = '<span style="margin-right: 4px;">📍</span> Use Current Location';
                            locateBtn.disabled = false;
                        }, 2000);
                    },
                    (error) => {
                        console.error('Geolocation error:', error);
                        alert('Could not get your location. Please check browser permissions.');
                        locateBtn.disabled = false;
                        locateBtn.innerHTML = '<span style="margin-right: 4px;">📍</span> Use Current Location';
                    }
                );
            } else {
                alert('Geolocation is not supported by this browser.');
            }
        });
    }

    // Initial value
    updateCoordinates(defaultLat, defaultLng);

    // Fix map rendering issues in tabs/hidden containers (if any)
    setTimeout(() => {
        if (window.map) window.map.invalidateSize();
    }, 500);
}

function updateCoordinates(lat, lng) {
    const latInput = document.getElementById('lat');
    const lngInput = document.getElementById('lng');
    if (latInput) latInput.value = lat;
    if (lngInput) lngInput.value = lng;
}

// ============================================
// Load Stripe Config
// ============================================
async function loadStripeConfig() {
    try {
        // In production, fetch this from your backend
        // For now, we'll use the publishable key from environment
        stripePublicKey = 'pk_test_your_stripe_publishable_key_here';
        // Stripe.js is loaded via script tag in checkout.html
    } catch (error) {
        console.error('Failed to load Stripe config:', error);
    }
}

// ============================================
// Sync LocalStorage Cart to Server
// ============================================
async function syncCartToServer() {
    if (!window.CartAPI) {
        throw new Error('API service not loaded. Please refresh the page.');
    }

    const token = localStorage.getItem('arteva_token');
    if (!token) {
        throw new Error('Please login to checkout');
    }

    // Get cart from localStorage
    const localCart = JSON.parse(localStorage.getItem('arteva_cart') || '[]');
    if (localCart.length === 0) {
        throw new Error('Your cart is empty');
    }

    try {
        // Clear server cart first using CartAPI
        await window.CartAPI.clear();

        // Add each item to server cart
        for (const item of localCart) {
            await window.CartAPI.add(item.id || item._id, item.quantity);
        }
    } catch (error) {
        console.error('Failed to sync cart:', error);
        throw new Error(error.message || 'Failed to sync cart with server');
    }
}


// ============================================
// Initialize Checkout Form
// ============================================
function initCheckoutForm() {
    const checkoutForm = document.getElementById('checkoutForm');
    if (!checkoutForm) return;

    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;

        if (!paymentMethod) {
            showCheckoutNotification(window.getTranslation ? window.getTranslation('select_payment_method') : 'Please select a payment method', 'error');
            return;
        }

        // Collect shipping address
        const shippingAddress = {
            street: document.getElementById('street')?.value,
            city: document.getElementById('city')?.value,
            state: document.getElementById('state')?.value,
            country: document.getElementById('country')?.value || 'Kuwait',
            zipCode: document.getElementById('zipCode')?.value,
            phone: document.getElementById('phone')?.value,
            coordinates: {
                lat: parseFloat(document.getElementById('lat')?.value || 0),
                lng: parseFloat(document.getElementById('lng')?.value || 0)
            }
        };

        // Validate required fields
        if (!shippingAddress.street || !shippingAddress.city) {
            showCheckoutNotification(window.getTranslation ? window.getTranslation('fill_required_fields') : 'Please fill in all required address fields', 'error');
            return;
        }

        // Disable submit button
        const submitBtn = checkoutForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = window.getTranslation ? window.getTranslation('processing') : 'Processing...';
        }

        try {
            // Sync localStorage cart to server before payment
            await syncCartToServer();

            if (paymentMethod === 'card') {
                await processStripePayment(shippingAddress);
            } else if (paymentMethod === 'cod') {
                await processCODPayment(shippingAddress);
            } else if (paymentMethod === 'knet') {
                await processKNETPayment(shippingAddress);
            }
        } catch (error) {
            showCheckoutNotification(error.message || (window.getTranslation ? window.getTranslation('payment_failed') : 'Payment failed'), 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = window.getTranslation ? window.getTranslation('place_order') : 'Place Order';
            }
        }
    });
}

// ============================================
// Process Stripe Payment
// ============================================
async function processStripePayment(shippingAddress) {
    if (!window.AuthAPI?.isLoggedIn()) {
        showCheckoutNotification(window.getTranslation ? window.getTranslation('login_required') : 'Please login to checkout', 'error');
        window.location.href = '/account.html?redirect=checkout';
        return;
    }

    // Check if Stripe is enabled
    if (window.Config && !window.Config.FEATURES.STRIPE_ENABLED) {
        showCheckoutNotification(
            window.getTranslation ? window.getTranslation('stripe_unavailable') : 'Card payment is temporarily unavailable. Please use Cash on Delivery.',
            'warning'
        );
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = window.getTranslation ? window.getTranslation('place_order') : 'Place Order';
        }
        return;
    }

    try {
        const data = await window.PaymentsAPI.createCheckoutSession(shippingAddress, 'card');

        // Redirect to Stripe Checkout
        if (data.url) {
            window.location.href = data.url;
        } else if (data.sessionId && window.Stripe) {
            const stripe = window.Stripe(stripePublicKey);
            await stripe.redirectToCheckout({ sessionId: data.sessionId });
        }
    } catch (error) {
        console.error('Stripe payment error:', error);
        throw error;
    }
}

// ============================================
// Process COD Payment
// ============================================
async function processCODPayment(shippingAddress) {
    if (!window.AuthAPI?.isLoggedIn()) {
        showCheckoutNotification(window.getTranslation ? window.getTranslation('login_required') : 'Please login to checkout', 'error');
        window.location.href = '/account.html?redirect=checkout';
        return;
    }

    try {
        const notes = document.getElementById('orderNotes')?.value || '';

        const data = await window.PaymentsAPI.processCOD(shippingAddress, notes);

        // Clear local cart
        if (window.clearCart) {
            window.clearCart();
        }

        // Redirect to success page
        window.location.href = `/order-success.html?order=${data.data.orderNumber}`;
    } catch (error) {
        console.error('COD payment error:', error);
        throw error;
    }
}

// ============================================
// Process KNET Payment
// ============================================
async function processKNETPayment(shippingAddress) {
    // Check if KNET is enabled
    if (window.Config && !window.Config.FEATURES.KNET_ENABLED) {
        showCheckoutNotification(
            window.getTranslation ? window.getTranslation('knet_unavailable') : 'KNET payment requires merchant setup. Please choose another payment method or contact support.',
            'warning'
        );

        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = window.getTranslation ? window.getTranslation('place_order') : 'Place Order';
        }
        return;
    }

    // KNET implementation would go here when merchant account is ready
    showCheckoutNotification(
        window.getTranslation ? window.getTranslation('knet_unavailable') : 'KNET payment requires merchant setup. Please choose another payment method or contact support.',
        'warning'
    );

    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = window.getTranslation ? window.getTranslation('place_order') : 'Place Order';
    }
}

// ============================================
// Initialize Payment Method Selection
// ============================================
function initPaymentMethodSelection() {
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    const cardDetails = document.getElementById('cardPaymentDetails');
    const codDetails = document.getElementById('codPaymentDetails');
    const knetDetails = document.getElementById('knetPaymentDetails');

    paymentMethods.forEach(radio => {
        radio.addEventListener('change', () => {
            // Hide all detail sections
            if (cardDetails) cardDetails.style.display = 'none';
            if (codDetails) codDetails.style.display = 'none';
            if (knetDetails) knetDetails.style.display = 'none';

            // Show selected section
            if (radio.value === 'card' && cardDetails) {
                cardDetails.style.display = 'block';
            } else if (radio.value === 'cod' && codDetails) {
                codDetails.style.display = 'block';
            } else if (radio.value === 'knet' && knetDetails) {
                knetDetails.style.display = 'block';
            }
        });
    });
}

// ============================================
// Update Order Summary
// ============================================
function updateOrderSummary() {
    const summaryItems = document.getElementById('checkoutItems');
    const subtotalEl = document.getElementById('checkoutSubtotal');
    const shippingEl = document.getElementById('checkoutShipping');
    const totalEl = document.getElementById('checkoutTotal');

    if (!summaryItems) return;

    // Get cart from localStorage
    const cart = JSON.parse(localStorage.getItem('arteva_cart') || '[]');

    if (cart.length === 0) {
        summaryItems.innerHTML = `<p>${window.getTranslation ? window.getTranslation('cart_empty_error') : 'Your cart is empty'}</p>`;
        return;
    }

    // Calculate totals
    let subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let shipping = subtotal >= 50 ? 0 : 2.5;
    let total = subtotal + shipping;

    // Render items
    const lang = localStorage.getItem('site_lang') || 'en';
    summaryItems.innerHTML = cart.map(item => `
    <div class="checkout-item">
      <div class="checkout-item-image">
        <img src="${item.image}" alt="${(lang === 'ar' && item.nameAr) ? item.nameAr : item.name}">
        <span class="checkout-item-qty">${item.quantity}</span>
      </div>
      <div class="checkout-item-info">
        <span class="checkout-item-name">${(lang === 'ar' && item.nameAr) ? item.nameAr : item.name}</span>
        <span class="checkout-item-price">${formatPrice(item.price * item.quantity)}</span>
      </div>
    </div>
  `).join('');

    // Update totals
    if (subtotalEl) subtotalEl.innerHTML = formatPrice(subtotal);
    if (shippingEl) shippingEl.innerHTML = shipping > 0 ? formatPrice(shipping) : (window.getTranslation ? window.getTranslation('free') : 'FREE');
    if (totalEl) totalEl.innerHTML = formatPrice(total);

    // Trigger currency update
    if (window.CurrencyAPI) window.CurrencyAPI.updatePagePrices();
}

// ============================================
// Helper: Format Price
// ============================================
function formatPrice(price) {
    const lang = localStorage.getItem('site_lang') || 'en';
    const currency = lang === 'ar' ? 'د.ك' : 'KWD';
    const val = parseFloat(price);
    return `<span class="price-display" data-base-price="${val.toFixed(3)}">${val.toFixed(3)} <span class="price-currency">${currency}</span></span>`;
}

// ============================================
// Helper: Show Notification (non-recursive)
// ============================================
function showCheckoutNotification(message, type = 'info') {
    // Use main.js showNotification if available, otherwise fallback to alert
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}

// ============================================
// Export Functions
// ============================================
window.processStripePayment = processStripePayment;
window.processCODPayment = processCODPayment;
window.updateOrderSummary = updateOrderSummary;
window.syncCartToServer = syncCartToServer;
