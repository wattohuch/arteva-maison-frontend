/**
 * ARTEVA Maison - Checkout & Payment Integration
 * MyFatoorah Payment Gateway (KNET, Cards, Apple Pay)
 */

// Payment methods available
let availablePaymentMethods = [];

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

    // 3. Load payment methods from MyFatoorah
    await loadPaymentMethods();

    // 4. Show Apple Pay option only on supported devices
    initApplePayVisibility();

    // 5. Initialize saved addresses (will use the map)
    await initSavedAddresses();

    // 6. Initialize rest of the form
    initCheckoutForm();
    initPaymentMethodSelection();
    updateOrderSummary();

    // 7. Handle browser back-button from payment gateway
    // pageshow fires when page is restored from bfcache (back/forward navigation)
    window.addEventListener('pageshow', function (event) {
        if (event.persisted) {
            // Page was restored from bfcache — user pressed back from payment gateway
            const submitBtn = document.querySelector('#checkoutForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = window.getTranslation ? window.getTranslation('place_order') : 'Place Order';
            }
        }
    });
});


// ============================================
// Apple Pay Device Detection
// ============================================
function initApplePayVisibility() {
    const applePayMethod = document.getElementById('applePayMethod');
    if (!applePayMethod) return;

    // Show Apple Pay only on supported devices AND if the method is available from MyFatoorah
    const applePayAvailable = availablePaymentMethods.find(
        m => (m.name || '').toLowerCase().includes('apple') || (m.code || '').toLowerCase().includes('ap')
    );

    if (applePayAvailable && window.ApplePaySession && ApplePaySession.canMakePayments()) {
        applePayMethod.style.display = '';
    }
}

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
        // Silently fail - saved addresses are optional
        // User can still enter address manually
    }
}

function fillAddressForm(addr) {
    if (!addr) return;

    // console.log('Filling address form with:', addr);

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
        // console.log('Address has coordinates:', addr.coordinates);

        const lat = parseFloat(addr.coordinates.lat || addr.coordinates.latitude);
        const lng = parseFloat(addr.coordinates.lng || addr.coordinates.longitude);

        // console.log('Parsed coordinates:', { lat, lng });
        // console.log('Map exists:', !!window.map, 'Marker exists:', !!window.marker);

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
                        // console.log('Map updated to:', lat, lng);
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
                        // console.log('Map updated to (retry):', lat, lng);
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

    // console.log('Map initialized:', !!window.map, 'Marker initialized:', !!window.marker);

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
                        let errorMessage = 'Could not get your location. ';
                        if (error.code === error.PERMISSION_DENIED) {
                            errorMessage += 'Please enable location permissions in your browser settings.';
                        } else if (error.code === error.POSITION_UNAVAILABLE) {
                            errorMessage += 'Location information is unavailable.';
                        } else if (error.code === error.TIMEOUT) {
                            errorMessage += 'Location request timed out.';
                        } else {
                            errorMessage += 'Please check browser permissions.';
                        }
                        alert(errorMessage);
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
// Load Payment Methods from MyFatoorah
// ============================================
async function loadPaymentMethods() {
    try {
        const response = await window.PaymentsAPI.getPaymentMethods(1);
        if (response.success) {
            availablePaymentMethods = response.data;
            console.log('Available payment methods:', availablePaymentMethods.map(m => `${m.name} (ID: ${m.id})`));
        }
    } catch (error) {
        // Continue with default methods (COD, KNET, Card) if API fails
        availablePaymentMethods = [];
    }
}

// ============================================
// Helper: Get dynamic PaymentMethodId
// ============================================
function getPaymentMethodId(type) {
    // Fallback IDs (common defaults)
    const fallbacks = { knet: 1, card: 2, applepay: 20 };

    if (!availablePaymentMethods || availablePaymentMethods.length === 0) {
        return fallbacks[type] || null;
    }

    let method;
    if (type === 'knet') {
        method = availablePaymentMethods.find(
            m => (m.name || '').toLowerCase().includes('knet') || (m.code || '').toLowerCase() === 'kn'
        );
    } else if (type === 'card') {
        method = availablePaymentMethods.find(
            m => (m.name || '').toLowerCase().includes('visa') ||
                (m.name || '').toLowerCase().includes('master') ||
                (m.code || '').toLowerCase() === 'vm'
        );
    } else if (type === 'applepay') {
        method = availablePaymentMethods.find(
            m => (m.name || '').toLowerCase().includes('apple') || (m.code || '').toLowerCase().includes('ap')
        );
    }

    return method ? method.id : (fallbacks[type] || null);
}

// ============================================
// Sync LocalStorage Cart to Server
// ============================================
async function syncCartToServer() {
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
        // Clear server cart first - use direct API call if CartAPI.clear doesn't exist
        if (window.CartAPI && typeof window.CartAPI.clear === 'function') {
            await window.CartAPI.clear();
        } else {
            // Fallback: direct API call
            await window.apiRequest('/cart', { method: 'DELETE' });
        }

        // Add each item to server cart
        for (const item of localCart) {
            if (window.CartAPI && typeof window.CartAPI.add === 'function') {
                await window.CartAPI.add(item.id || item._id, item.quantity);
            } else {
                // Fallback: direct API call
                await window.apiRequest('/cart', {
                    method: 'POST',
                    body: JSON.stringify({
                        productId: item.id || item._id,
                        quantity: item.quantity
                    })
                });
            }
        }
    } catch (error) {
        console.error('Cart sync error:', error);
        throw new Error('Failed to sync cart. Please try again.');
    }
}


// ============================================
// Collect & validate shipping address
// ============================================
function collectShippingAddress() {
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

    if (!shippingAddress.street || !shippingAddress.city) {
        showCheckoutNotification(window.getTranslation ? window.getTranslation('fill_required_fields') : 'Please fill in all required address fields', 'error');
        return null;
    }
    return shippingAddress;
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

        const shippingAddress = collectShippingAddress();
        if (!shippingAddress) return;

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
                await processCardPayment(shippingAddress);
            } else if (paymentMethod === 'cod') {
                await processCODPayment(shippingAddress);
            } else if (paymentMethod === 'knet') {
                await processKNETPayment(shippingAddress);
            } else if (paymentMethod === 'applepay') {
                await processApplePayPayment(shippingAddress);
            }
        } catch (error) {
            showCheckoutNotification(error.message || (window.getTranslation ? window.getTranslation('payment_failed') : 'Payment failed'), 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = window.getTranslation ? window.getTranslation('place_order') : 'Place Order';
            }
        }
    });

    // ============================================
    // Apple Pay: Direct order on button click
    // ============================================
    initApplePayDirectOrder();
}

// ============================================
// Apple Pay Direct Order (click = place order)
// ============================================
function initApplePayDirectOrder() {
    const applePayBtn = document.getElementById('applePayMethod');
    if (!applePayBtn) return;

    applePayBtn.addEventListener('click', async (e) => {
        // Prevent the radio from being selected (we handle everything here)
        e.preventDefault();
        e.stopPropagation();

        // Validate login
        if (!window.AuthAPI?.isLoggedIn()) {
            showCheckoutNotification(window.getTranslation ? window.getTranslation('login_required') : 'Please login to checkout', 'error');
            window.location.href = '/account.html?redirect=checkout';
            return;
        }

        // Validate address
        const shippingAddress = collectShippingAddress();
        if (!shippingAddress) return;

        // Visual feedback on Apple Pay button
        applePayBtn.style.opacity = '0.6';
        applePayBtn.style.pointerEvents = 'none';

        // Also disable the Place Order button to prevent double-submit
        const submitBtn = document.querySelector('#checkoutForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = window.getTranslation ? window.getTranslation('processing') : 'Processing...';
        }

        try {
            await syncCartToServer();
            await processApplePayPayment(shippingAddress);
        } catch (error) {
            showCheckoutNotification(error.message || (window.getTranslation ? window.getTranslation('payment_failed') : 'Payment failed'), 'error');
            applePayBtn.style.opacity = '1';
            applePayBtn.style.pointerEvents = 'auto';
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = window.getTranslation ? window.getTranslation('place_order') : 'Place Order';
            }
        }
    });
}

// ============================================
// Process Card Payment (MyFatoorah)
// ============================================
async function processCardPayment(shippingAddress) {
    if (!window.AuthAPI?.isLoggedIn()) {
        showCheckoutNotification(window.getTranslation ? window.getTranslation('login_required') : 'Please login to checkout', 'error');
        window.location.href = '/account.html?redirect=checkout';
        return;
    }

    // Use dynamic Payment Method ID from InitiatePayment API
    const methodId = getPaymentMethodId('card');
    console.log('Card payment - using method ID:', methodId);
    const data = await window.PaymentsAPI.executePayment(methodId, shippingAddress);

    // Redirect to MyFatoorah payment page
    if (data.success && data.data.paymentUrl) {
        window.location.href = data.data.paymentUrl;
    } else {
        throw new Error('Failed to initiate payment');
    }
}

// ============================================
// Process KNET Payment (MyFatoorah)
// ============================================
async function processKNETPayment(shippingAddress) {
    if (!window.AuthAPI?.isLoggedIn()) {
        showCheckoutNotification(window.getTranslation ? window.getTranslation('login_required') : 'Please login to checkout', 'error');
        window.location.href = '/account.html?redirect=checkout';
        return;
    }

    // Use dynamic Payment Method ID from InitiatePayment API
    const methodId = getPaymentMethodId('knet');
    console.log('KNET payment - using method ID:', methodId);
    const data = await window.PaymentsAPI.executePayment(methodId, shippingAddress);

    // Redirect to MyFatoorah KNET payment page
    if (data.success && data.data.paymentUrl) {
        window.location.href = data.data.paymentUrl;
    } else {
        throw new Error('Failed to initiate KNET payment');
    }
}

// ============================================
// Process Apple Pay Payment (MyFatoorah)
// ============================================
async function processApplePayPayment(shippingAddress) {
    if (!window.AuthAPI?.isLoggedIn()) {
        showCheckoutNotification(window.getTranslation ? window.getTranslation('login_required') : 'Please login to checkout', 'error');
        window.location.href = '/account.html?redirect=checkout';
        return;
    }

    // Use dynamic Payment Method ID from InitiatePayment API
    const methodId = getPaymentMethodId('applepay');
    console.log('Apple Pay - using method ID:', methodId);
    const data = await window.PaymentsAPI.executePayment(methodId, shippingAddress);

    // Redirect to MyFatoorah Apple Pay page
    if (data.success && data.data.paymentUrl) {
        window.location.href = data.data.paymentUrl;
    } else {
        throw new Error('Failed to initiate Apple Pay');
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

    const notes = document.getElementById('orderNotes')?.value || '';

    const data = await window.PaymentsAPI.processCOD(shippingAddress, notes);

    // Clear local cart
    if (window.clearCart) {
        window.clearCart();
    }

    // Redirect to success page
    window.location.href = `/order-success.html?order=${data.data.orderNumber}`;
}

// ============================================
// Process KNET Payment (MyFatoorah) - Deprecated, use processKNETPayment above
// ============================================
// This function is kept for backward compatibility but redirects to new implementation

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
    let shipping = 2.0; // Fixed 2 KD shipping for all orders in Kuwait
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
    if (shippingEl) shippingEl.innerHTML = formatPrice(shipping); // Always show 2 KD
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
window.processCardPayment = processCardPayment;
window.processKNETPayment = processKNETPayment;
window.processApplePayPayment = processApplePayPayment;
window.processCODPayment = processCODPayment;
window.updateOrderSummary = updateOrderSummary;
window.syncCartToServer = syncCartToServer;
