/**
 * ARTEVA Maison - Driver Dashboard
 * Mobile-first driver application logic
 */

let map = null;
let marker = null;
let socket = null;
let watchId = null;
let driverId = null;
let activeOrder = null;

// Default: Kuwait City
const DEFAULT_LAT = 29.3759;
const DEFAULT_LNG = 47.9774;

document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    if (!AuthAPI.isLoggedIn() || (AuthAPI.getUser().role !== 'driver' && AuthAPI.getUser().role !== 'admin')) {
        window.location.href = 'account.html';
        return;
    }

    const user = AuthAPI.getUser();
    driverId = user.id;
    document.getElementById('driverName').textContent = user.name;
    document.getElementById('driverAvatar').textContent = user.name.charAt(0).toUpperCase();

    initMap();
    initSocket();
    await loadOrders();

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        stopTracking();
        AuthAPI.logout();
    });
});

// UI: Tab Switching
window.switchTab = (tab) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.orders-list').forEach(l => l.classList.add('hidden'));

    if (tab === 'active') {
        document.querySelector('.tab-btn:first-child').classList.add('active');
        document.getElementById('activeOrders').classList.remove('hidden');
    } else {
        document.querySelector('.tab-btn:last-child').classList.add('active');
        document.getElementById('historyOrders').classList.remove('hidden');
    }
};

// Data: Load Orders
async function loadOrders() {
    const activeContainer = document.getElementById('activeOrders');
    const historyContainer = document.getElementById('historyOrders');

    activeContainer.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const response = await DriverAPI.getAssignedOrders();
        if (response.success) {
            const orders = response.data;
            window.allOrders = orders;

            const active = orders.filter(o => o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled');
            const history = orders.filter(o => o.orderStatus === 'delivered' || o.orderStatus === 'cancelled');

            renderList(activeContainer, active, true);
            renderList(historyContainer, history, false);
        }
    } catch (err) {
        console.error(err);
        activeContainer.innerHTML = '<p class="text-center">Failed to load orders.</p>';
    }
}

// UI: Render Lists
function renderList(container, orders, isActive) {
    if (orders.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#999; margin-top:40px;">No ${isActive ? 'active' : 'past'} orders.</p>`;
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="order-card" onclick="openOrderMap('${order._id}')">
            <div class="order-header">
                <span class="order-id">#${order.orderNumber}</span>
                <span class="badge ${order.orderStatus}">${order.orderStatus.replace(/_/g, ' ')}</span>
            </div>
            
            <div class="info-row">
                <span class="icon">👤</span>
                <span>${order.user ? order.user.name : (order.shippingAddress.firstName + ' ' + order.shippingAddress.lastName)}</span>
            </div>
            
            <div class="info-row">
                <span class="icon">📍</span>
                <span>${order.shippingAddress.street}, ${order.shippingAddress.city}</span>
            </div>

            ${isActive ? `
                <div class="btn-block">
                    <span>Tap to View Details & Actions</span>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Map: Open Modal
window.openOrderMap = (orderId) => {
    const order = window.allOrders.find(o => o._id === orderId);
    if (!order) return;

    activeOrder = order;

    // Show Modal
    const modal = document.getElementById('mapView');
    modal.classList.remove('hidden');

    // Setup Map
    setTimeout(() => {
        map.invalidateSize();

        let lat = order.shippingAddress?.coordinates?.lat || DEFAULT_LAT;
        let lng = order.shippingAddress?.coordinates?.lng || DEFAULT_LNG;

        // If no coords, approximate (in real app, use geocoding)
        if (!order.shippingAddress?.coordinates?.lat) {
            // Visualize "somewhere" for demo if no coords
            lat = DEFAULT_LAT + 0.01;
            lng = DEFAULT_LNG + 0.01;
        }

        map.setView([lat, lng], 15);

        if (marker) map.removeLayer(marker);
        marker = L.marker([lat, lng]).addTo(map)
            .bindPopup(`<b>${order.shippingAddress.street}</b><br>${order.shippingAddress.city}`).openPopup();
    }, 300);

    // Setup Controls
    renderControls(order);
};

window.closeMap = () => {
    document.getElementById('mapView').classList.add('hidden');
    loadOrders(); // Refresh list on close
};

function renderControls(order) {
    const container = document.getElementById('activeOrderControls');
    const isCompleted = order.orderStatus === 'delivered';
    const isStarted = order.orderStatus === 'out_for_delivery';

    let buttons = `
        <div class="action-grid">
            <button class="btn-action" onclick="window.open('tel:${order.shippingAddress.phone || order.user?.phone}')">
                <span style="font-size:24px">📞</span>
                Call
            </button>
            <button class="btn-action" onclick="window.open('https://maps.google.com/?q=${order.shippingAddress.coordinates?.lat},${order.shippingAddress.coordinates?.lng}')">
                <span style="font-size:24px">🗺️</span>
                Navigate
            </button>
        </div>
        <div style="background:#f9f9f9; padding:15px; border-radius:8px; margin-top:10px;">
            <strong style="display:block; margin-bottom:5px;">Customer Notes</strong>
            <p style="margin:0; font-size:14px; color:#555;">${order.notes || 'No notes provided.'}</p>
        </div>
    `;

    if (!isCompleted) {
        if (isStarted) {
            buttons += `
                <button class="btn-main finish" onclick="finishDelivery('${order._id}')">
                    ✅ Mark as Delivered
                </button>
            `;
        } else {
            buttons += `
                <button class="btn-main" onclick="startDelivery('${order._id}', '${order.orderNumber}')">
                    🚀 Start Delivery
                </button>
            `;
        }
    } else {
        buttons += `<div class="badge delivered" style="text-align:center; padding:15px; margin-top:10px;">Order Completed</div>`;
    }

    container.innerHTML = buttons;
}

// Logic: Actions
window.startDelivery = async (id, number) => {
    if (!confirm('Start delivering this order? Customer will be notified.')) return;

    try {
        await DriverAPI.updateStatus(id, 'out_for_delivery');
        startTracking(id, number);
        activeOrder.orderStatus = 'out_for_delivery';
        renderControls(activeOrder);
    } catch (e) {
        alert('Error: ' + e.message);
    }
};

window.finishDelivery = async (id) => {
    if (!confirm('Confirm delivery completion?')) return;

    try {
        await DriverAPI.updateStatus(id, 'delivered');
        stopTracking();
        activeOrder.orderStatus = 'delivered';
        renderControls(activeOrder);
        alert('Great job! Order delivered.');
        closeMap();
    } catch (e) {
        alert('Error: ' + e.message);
    }
};


// Map Init
function initMap() {
    // Define Layers (Copied from previous steps)
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' });
    const googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '© Google Maps' });
    const esriStreets = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri' });

    map = L.map('map', {
        center: [DEFAULT_LAT, DEFAULT_LNG],
        zoom: 13,
        zoomControl: false, // Cleaner UI
        layers: [googleHybrid]
    });

    L.control.layers({ "Satellite": googleHybrid, "Streets": esriStreets, "OSM": osm }).addTo(map);
}

// Init Socket
function initSocket() {
    socket = io();
    socket.on('connect', () => { if (driverId) socket.emit('join_pilot_room', driverId); });
}

// Tracking Logic
function startTracking(orderId, orderNumber) {
    if (watchId) navigator.geolocation.clearWatch(watchId);

    if (!navigator.geolocation) return;

    watchId = navigator.geolocation.watchPosition(pos => {
        const { latitude, longitude } = pos.coords;
        socket.emit('pilot_location_update', {
            orderNumber: orderNumber,
            pilotId: driverId,
            lat: latitude,
            lng: longitude
        });

        // Update own map
        if (map) {
            L.circleMarker([latitude, longitude], { radius: 8, color: '#10b981', fillOpacity: 1 }).addTo(map);
        }
    }, err => console.error(err), { enableHighAccuracy: true });
}

function stopTracking() {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    watchId = null;
}
