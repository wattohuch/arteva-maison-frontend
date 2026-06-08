/**
 * ARTEVA Maison - Tracking Client Script
 * Handles real-time order tracking for customers
 * 
 * Supports two modes:
 *   1. Public: ?order=ART-XXXXXX&token=XXXXX (shareable link, no login)
 *   2. Authenticated: ?id=MONGODB_ID (requires login, ownership check)
 */

let map;
let pilotMarker;
let deliveryMarker;
let socket;
let currentOrderId;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderNumber = urlParams.get('order');
    const trackingToken = urlParams.get('token');
    const orderId = urlParams.get('id');

    if (!orderNumber && !orderId) {
        showError('No order specified. / لم يتم تحديد الطلب.');
        return;
    }

    try {
        if (orderNumber && trackingToken) {
            // Mode 1: Public tracking via token (from WhatsApp/email links)
            await loadPublicTracking(orderNumber, trackingToken);
        } else if (orderId) {
            // Mode 2: Authenticated tracking (from orders page)
            if (!localStorage.getItem('arteva_token')) {
                window.location.href = `account.html?redirect=track-order.html?id=${orderId}`;
                return;
            }
            await loadAuthenticatedTracking(orderId);
        } else if (orderNumber) {
            // Has order number but no token — require login
            if (!localStorage.getItem('arteva_token')) {
                window.location.href = `account.html?redirect=track-order.html?order=${orderNumber}`;
                return;
            }
            // Try to load via authenticated by-number endpoint
            await loadAuthenticatedTrackingByNumber(orderNumber);
        }
    } catch (error) {
        showError(error.message || 'Failed to load tracking details.');
    }
});

/**
 * Public tracking — no login needed, validated by token
 */
async function loadPublicTracking(orderNumber, token) {
    const apiUrl = window.API_BASE_URL || 'https://arteva-maison-backend-gy1x.onrender.com/api';

    const res = await fetch(`${apiUrl}/orders/track/${orderNumber}/${token}`);
    
    if (res.status === 403) {
        showError('Invalid tracking link. This link may have expired or is incorrect.\nرابط التتبع غير صالح. قد يكون هذا الرابط منتهي الصلاحية أو غير صحيح.');
        return;
    }
    
    if (!res.ok) {
        showError('Order not found. / الطلب غير موجود.');
        return;
    }

    const data = await res.json();
    const order = data.data;
    if (!order) throw new Error('Order not found');

    renderTrackingUI(order, true); // isPublic = true
}

/**
 * Authenticated tracking by MongoDB ID
 */
async function loadAuthenticatedTracking(orderId) {
    const data = await apiRequest(`/orders/${orderId}`);
    const order = data.data;
    if (!order) throw new Error('Order not found');
    currentOrderId = orderId;
    renderTrackingUI(order, false);
}

/**
 * Authenticated tracking by order number
 */
async function loadAuthenticatedTrackingByNumber(orderNumber) {
    const data = await apiRequest(`/orders/by-number/${orderNumber}`);
    const order = data.data;
    if (!order) throw new Error('Order not found');
    currentOrderId = order._id;
    renderTrackingUI(order, false);
}

/**
 * Render the tracking UI for both public and authenticated modes
 */
function renderTrackingUI(order, isPublic) {
    // Header Info
    const trackOrderText = window.getTranslation ? window.getTranslation('track_your_order') : 'Tracking Order';
    const placedOnText = document.documentElement.lang === 'ar' ? 'بتاريخ' : 'Placed on';
    const isAr = document.documentElement.lang === 'ar';

    document.getElementById('orderTitle').textContent = `${trackOrderText} #${order.orderNumber}`;
    document.getElementById('orderMeta').textContent = `${placedOnText} ${new Date(order.createdAt).toLocaleDateString(
        isAr ? 'ar-KW' : 'en-US'
    )}`;

    // Render Timeline
    renderTimeline(order);

    // Show content
    document.getElementById('trackingContent').style.display = 'grid';

    // Initialize Map — use proper null checks to avoid || treating 0 as falsy
    function getSafeCoords(coordsObj) {
        if (coordsObj && coordsObj.lat != null && coordsObj.lng != null && !(coordsObj.lat === 0 && coordsObj.lng === 0)) {
            return { lat: coordsObj.lat, lng: coordsObj.lng };
        }
        return { lat: 29.3759, lng: 47.9774 }; // Kuwait City default
    }
    const rawCoords = isPublic
        ? order.deliveryArea?.coordinates
        : order.shippingAddress?.coordinates;
    const deliveryCoords = getSafeCoords(rawCoords);

    initMap(order, deliveryCoords);

    // Connect Socket for real-time updates if active
    if (order.orderStatus === 'out_for_delivery' || order.orderStatus === 'handed_over') {
        initSocket(order.orderNumber || currentOrderId);

        // Show driver info if available
        if (order.deliveryPilot) {
            document.getElementById('driverInfo').style.display = 'flex';
            if (order.deliveryPilot.name) {
                document.getElementById('driverName').textContent = order.deliveryPilot.name;
            }
        }
    }
}

function initMap(order, coords) {
    const deliveryLat = (coords.lat != null && coords.lat !== 0) ? coords.lat : 29.3759;
    const deliveryLng = (coords.lng != null && coords.lng !== 0) ? coords.lng : 47.9774;

    map = L.map('map', {
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: true
    }).setView([deliveryLat, deliveryLng], 12);

    // CartoDB Positron — fast, clean, modern tiles (free, no API key)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Delivery Location Marker
    const deliveryLocText = document.documentElement.lang === 'ar' ? 'موقع التوصيل' : 'Delivery Location';
    
    const deliveryIcon = L.divIcon({
        className: 'delivery-marker',
        html: '<div style="background:#10b981;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });
    
    deliveryMarker = L.marker([deliveryLat, deliveryLng], { icon: deliveryIcon }).addTo(map)
        .bindPopup(deliveryLocText).openPopup();

    // If order has a last known pilot location, show it
    if (order.deliveryLocation && order.deliveryLocation.lat) {
        updatePilotMarker(order.deliveryLocation.lat, order.deliveryLocation.lng);
    }

    // Force map to recalculate size after CSS transitions
    setTimeout(() => map.invalidateSize(), 300);
}

function initSocket(orderIdOrNumber) {
    const backendUrl = window.API_BASE_URL ? window.API_BASE_URL.replace('/api', '') : 'https://arteva-maison-backend-gy1x.onrender.com';
    socket = io(backendUrl);

    socket.on('connect', () => {
        socket.emit('join_order_room', orderIdOrNumber);
    });

    socket.on('pilot_location_update', (data) => {
        updatePilotMarker(data.lat, data.lng);
    });
}

function updatePilotMarker(lat, lng) {
    if (!map) return;

    const newLatLng = [lat, lng];
    const driverHereText = document.documentElement.lang === 'ar' ? 'السائق هنا' : 'Driver is here';

    if (pilotMarker) {
        pilotMarker.setLatLng(newLatLng);
    } else {
        const pilotIcon = L.divIcon({
            className: 'pilot-marker',
            html: '<div style="background:#3b82f6;width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 10px rgba(59,130,246,0.5);animation:pulse 2s infinite;"></div>',
            iconSize: [26, 26],
            iconAnchor: [13, 13]
        });

        pilotMarker = L.marker(newLatLng, { icon: pilotIcon }).addTo(map)
            .bindPopup(driverHereText);
    }

    // Fit bounds to show both markers
    if (deliveryMarker) {
        const bounds = L.latLngBounds([deliveryMarker.getLatLng(), newLatLng]);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

function renderTimeline(order) {
    const timeline = document.getElementById('statusTimeline');
    const history = order.statusHistory || [];

    // Sort history by date descending
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const isAr = document.documentElement.lang === 'ar';
    
    const statusEmojis = {
        pending: '⏳', confirmed: '✅', packed: '📦',
        processing: '⚙️', handed_over: '🚚',
        out_for_delivery: '🛵', delivered: '✅', cancelled: '❌'
    };

    timeline.innerHTML = history.map((entry, index) => {
        const isActive = index === 0;
        const date = new Date(entry.timestamp).toLocaleString(
            isAr ? 'ar-KW' : 'en-US'
        );

        const statusKey = `status_${entry.status.toLowerCase()}`;
        const statusLabel = window.getTranslation ? window.getTranslation(statusKey) : entry.status.replace(/_/g, ' ').toUpperCase();
        const emoji = statusEmojis[entry.status] || '📋';

        return `
            <div class="timeline-item ${isActive ? 'active' : 'completed'}">
                <div class="timeline-dot">${emoji}</div>
                <div class="timeline-content">
                    <div class="timeline-status">${statusLabel}</div>
                    <div class="timeline-time">${date}</div>
                    ${entry.note ? `<div class="timeline-note">${entry.note}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function showError(msg) {
    const el = document.getElementById('errorMessage');
    el.textContent = msg;
    el.style.display = 'block';
    document.getElementById('trackingContent').style.display = 'none';
}
