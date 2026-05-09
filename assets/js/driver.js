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
                <button class="btn-main finish" onclick="window.captureDeliveryProof('${order._id}')">
                    📷 Take Photo & Mark Delivered
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
        buttons += `<div class="badge delivered" style="text-align:center; padding:15px; margin-top:10px;">Order Completed ✅</div>`;
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

window.finishDelivery = async (id, proofBlob) => {
    try {
        // Save proof photo locally as backup
        if (proofBlob) {
            await saveProofLocally(id, activeOrder?.orderNumber || id, proofBlob);
        }

        if (proofBlob) {
            // Upload proof to backend — this marks as delivered + emails customer
            showDriverToast('Uploading...', 'Sending delivery proof to customer...');

            const formData = new FormData();
            formData.append('photo', proofBlob, `proof_${id}_${Date.now()}.jpg`);

            const token = localStorage.getItem('arteva_token');
            const apiBase = window.API_BASE_URL || (window.Config && Config.API_BASE_URL) || '';

            const res = await fetch(`${apiBase}/driver/orders/${id}/proof`, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Upload failed');

            stopTracking();
            activeOrder.orderStatus = 'delivered';
            renderControls(activeOrder);
            showDriverToast('Order Delivered! 🎉', 'Photo sent to customer\'s email. Great job!');
            closeMap();
        } else {
            // No photo — fallback to status-only update
            await DriverAPI.updateStatus(id, 'delivered');
            stopTracking();
            activeOrder.orderStatus = 'delivered';
            renderControls(activeOrder);
            showDriverToast('Order Delivered! 🎉', 'Marked as delivered.');
            closeMap();
        }
    } catch (e) {
        console.error('Delivery error:', e);
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

// Init Socket — with live order assignment listener
function initSocket() {
    socket = io(Config.SOCKET_URL());
    socket.on('connect', () => {
        if (driverId) {
            socket.emit('join_pilot_room', driverId);
            console.log('🔌 Driver connected to socket, room: pilot_' + driverId);
        }
    });

    // Live: New order assigned to this driver
    socket.on('driver_new_order', (data) => {
        console.log('📦 New order assigned:', data);
        showDriverToast('New Order Assigned! 🚀', `Order #${data.orderNumber} — ${data.customer || 'Customer'}`);
        // Auto-refresh orders list
        loadOrders();
        // Vibrate if supported
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    });

    // Live: Order status changed by admin
    socket.on('driver_order_update', (data) => {
        console.log('🔄 Order updated:', data);
        loadOrders();
    });

    socket.on('disconnect', () => {
        console.log('🔌 Driver disconnected from socket');
    });

    socket.on('reconnect', () => {
        if (driverId) socket.emit('join_pilot_room', driverId);
        loadOrders();
    });
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

// ── Toast Notifications ──
function showDriverToast(title, message) {
    // Remove existing
    document.querySelectorAll('.driver-toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'driver-toast';
    toast.innerHTML = `<div class="toast-title">${title}</div><div>${message}</div>`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

// ── Camera Proof for Delivery ──
let _cameraStream = null;
let _pendingDeliveryId = null;

window.captureDeliveryProof = async (orderId) => {
    _pendingDeliveryId = orderId;
    const overlay = document.getElementById('cameraOverlay');
    const video = document.getElementById('cameraVideo');
    const preview = document.getElementById('cameraPreview');
    const controls = document.getElementById('cameraControls');

    overlay.classList.remove('hidden');
    preview.style.display = 'none';
    video.style.display = 'block';

    try {
        _cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
            audio: false
        });
        video.srcObject = _cameraStream;

        controls.innerHTML = `
            <button class="cam-btn-capture" onclick="window.takePhoto()">📷 Capture</button>
            <button class="cam-btn-cancel" onclick="window.closeCameraOverlay()">Cancel</button>
        `;
    } catch (err) {
        console.error('Camera error:', err);
        // Fallback to file input
        controls.innerHTML = `
            <div style="color:#fff;text-align:center;">
                <p>Camera not available. Select a photo instead:</p>
                <input type="file" accept="image/*" capture="environment" id="proofFileInput" style="margin-top:10px;">
                <br><button class="cam-btn-cancel" onclick="window.closeCameraOverlay()" style="margin-top:12px;">Cancel</button>
            </div>
        `;
        document.getElementById('proofFileInput')?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await finishDelivery(_pendingDeliveryId, file);
                closeCameraOverlay();
            }
        });
    }
};

window.takePhoto = () => {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const preview = document.getElementById('cameraPreview');
    const controls = document.getElementById('cameraControls');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    preview.src = dataUrl;
    preview.style.display = 'block';
    video.style.display = 'none';

    controls.innerHTML = `
        <button class="cam-btn-confirm" onclick="window.confirmProof()">✅ Confirm & Deliver</button>
        <button class="cam-btn-retake" onclick="window.retakePhoto()">🔄 Retake</button>
        <button class="cam-btn-cancel" onclick="window.closeCameraOverlay()">Cancel</button>
    `;
};

window.retakePhoto = () => {
    const video = document.getElementById('cameraVideo');
    const preview = document.getElementById('cameraPreview');
    const controls = document.getElementById('cameraControls');

    preview.style.display = 'none';
    video.style.display = 'block';

    controls.innerHTML = `
        <button class="cam-btn-capture" onclick="window.takePhoto()">📷 Capture</button>
        <button class="cam-btn-cancel" onclick="window.closeCameraOverlay()">Cancel</button>
    `;
};

window.confirmProof = async () => {
    const canvas = document.getElementById('cameraCanvas');
    canvas.toBlob(async (blob) => {
        await finishDelivery(_pendingDeliveryId, blob);
        closeCameraOverlay();
    }, 'image/jpeg', 0.85);
};

window.closeCameraOverlay = () => {
    const overlay = document.getElementById('cameraOverlay');
    overlay.classList.add('hidden');
    if (_cameraStream) {
        _cameraStream.getTracks().forEach(t => t.stop());
        _cameraStream = null;
    }
    _pendingDeliveryId = null;
};

// ── IndexedDB Local Photo Storage ──
const DB_NAME = 'ArtevaDriveProofs';
const DB_STORE = 'photos';

function openProofDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(DB_STORE)) {
                db.createObjectStore(DB_STORE, { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveProofLocally(orderId, orderNumber, blob) {
    try {
        const db = await openProofDB();
        const tx = db.transaction(DB_STORE, 'readwrite');
        const store = tx.objectStore(DB_STORE);
        store.add({
            orderId,
            orderNumber: orderNumber || orderId,
            timestamp: new Date().toISOString(),
            driverId,
            photo: blob
        });
        await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
        console.log(`📸 Proof photo saved locally for order ${orderNumber}`);
    } catch (err) {
        console.error('Failed to save proof locally:', err);
    }
}
