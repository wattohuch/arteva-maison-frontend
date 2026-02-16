/**
 * ARTEVA Maison - Tracking Client Script
 * Handles real-time order tracking for customers
 */

let map;
let pilotMarker;
let deliveryMarker;
let socket;
let currentOrderId;

document.addEventListener('DOMContentLoaded', async () => {
    // Get Order ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentOrderId = urlParams.get('id');

    if (!currentOrderId) {
        showError('No order specified.');
        return;
    }

    if (!AuthAPI.token) { // Using api.js exposed variables if possible, or check localStorage
        // If api.js doesn't expose authToken directly, check check localStorage check
        if (!localStorage.getItem('arteva_token')) {
            window.location.href = `account.html?redirect=track-order.html?id=${currentOrderId}`;
            return;
        }
    }

    try {
        await loadOrderDetails(currentOrderId);
    } catch (error) {
        showError(error.message);
    }
});

async function loadOrderDetails(orderId) {
    // 1. Fetch Order Data
    const data = await apiRequest(`/orders/${orderId}`); // Using api.js helper
    const order = data.data;

    if (!order) throw new Error('Order not found');

    // 2. Render Header Info
    const trackOrderText = window.getTranslation ? window.getTranslation('track_your_order') : 'Tracking Order';
    const placedOnText = window.getTranslation ? (document.documentElement.lang === 'ar' ? 'بتاريخ' : 'Placed on') : 'Placed on';

    document.getElementById('orderTitle').textContent = `${trackOrderText} #${order.orderNumber}`;
    document.getElementById('orderMeta').textContent = `${placedOnText} ${new Date(order.createdAt).toLocaleDateString(
        document.documentElement.lang === 'ar' ? 'ar-KW' : 'en-US'
    )}`;

    // 3. Render Timeline
    renderTimeline(order);

    // 4. Setup Map if applicable
    const activeStatuses = ['handed_over', 'out_for_delivery', 'on_the_way']; // Check exact status strings
    // Backend uses: pending, confirmed, packed, processing, handed_over, out_for_delivery, delivered, cancelled

    // Note: 'on_the_way' is likely a sub-status or the same as out_for_delivery in some contexts, but backend enum has 'out_for_delivery'.
    // Driver dashboard uses 'out_for_delivery' or similar.

    // Show content
    document.getElementById('trackingContent').style.display = 'grid';

    // Initialize Map
    initMap(order);

    // 5. Connect Socket if active
    if (order.orderStatus === 'out_for_delivery' || order.orderStatus === 'on_the_way') {
        initSocket(orderId);

        // Show driver info if available
        if (order.deliveryPilot) {
            document.getElementById('driverInfo').style.display = 'flex';
            // Populate driver details if backend returns them (need to ensure populate includes details)
            // Assuming order.deliveryPilot is populated
            if (order.deliveryPilot.name) {
                document.getElementById('driverName').textContent = order.deliveryPilot.name;
                // document.getElementById('driverPhone').textContent = order.deliveryPilot.phone; // If phone is shared
            }
        }
    }
}

function initMap(order) {
    // Default to Kuwait City if no coords
    const deliveryLat = order.shippingAddress?.coordinates?.lat || 29.3759;
    const deliveryLng = order.shippingAddress?.coordinates?.lng || 47.9774;

    map = L.map('map').setView([deliveryLat, deliveryLng], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Delivery Location Marker (Customer House)
    const deliveryLocText = document.documentElement.lang === 'ar' ? 'موقع التوصيل' : 'Delivery Location';
    deliveryMarker = L.marker([deliveryLat, deliveryLng]).addTo(map)
        .bindPopup(deliveryLocText).openPopup();

    // If order has a last known pilot location, show it
    if (order.deliveryLocation && order.deliveryLocation.lat) {
        updatePilotMarker(order.deliveryLocation.lat, order.deliveryLocation.lng);
    }
}

function initSocket(orderId) {
    const backendUrl = window.API_BASE_URL ? window.API_BASE_URL.replace('/api', '') : 'https://arteva-maison-backend-gy1x.onrender.com';
    socket = io(backendUrl);

    socket.on('connect', () => {
        console.log('Connected to tracking server');
        socket.emit('join_order_room', orderId);
    });

    socket.on('pilot_location_update', (data) => {
        console.log('Pilot location update:', data);
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
        // Create custom icon for pilot
        const pilotIcon = L.icon({
            iconUrl: 'assets/images/delivery-truck.png', // Ensure this asset exists or use default
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        // Fallback to default icon if image missing
        pilotMarker = L.marker(newLatLng).addTo(map)
            .bindPopup(driverHereText);
    }

    // Fit bounds to show both
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

    timeline.innerHTML = history.map((entry, index) => {
        const isActive = index === 0;
        const date = new Date(entry.timestamp).toLocaleString(
            document.documentElement.lang === 'ar' ? 'ar-KW' : 'en-US'
        );

        const statusKey = `status_${entry.status.toLowerCase()}`;
        const statusLabel = window.getTranslation ? window.getTranslation(statusKey) : entry.status.replace(/_/g, ' ').toUpperCase();

        return `
            <div class="timeline-item ${isActive ? 'active' : 'completed'}">
                <div class="timeline-time">${date}</div>
                <div class="timeline-status">${statusLabel}</div>
                <div class="timeline-note">${entry.note || ''}</div>
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
