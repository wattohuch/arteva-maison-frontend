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
let _newOrderIds = new Set();  // Track newly assigned orders for highlighting

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
    driverId = user._id || user.id;
    document.getElementById('driverName').textContent = user.name;
    document.getElementById('driverAvatar').textContent = user.name.charAt(0).toUpperCase();

    // Request notification permission
    requestNotificationPermission();

    // Register service worker for background notifications
    registerServiceWorker();

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

            let active = orders.filter(o => o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled');
            const history = orders.filter(o => o.orderStatus === 'delivered' || o.orderStatus === 'cancelled');

            renderList(activeContainer, active, true);
            renderList(historyContainer, history, false);

            // Auto-switch to active tab if new orders came in
            if (_newOrderIds.size > 0) {
                switchTab('active');
            }
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

    container.innerHTML = orders.map(order => {
        const isNew = _newOrderIds.has(order._id);
        return `
        <div class="order-card ${isNew ? 'order-new-glow' : ''}" onclick="openOrderMap('${order._id}')">
            <div class="order-header">
                <span class="order-id">#${order.orderNumber}</span>
                <div style="display:flex;gap:6px;align-items:center;">
                    ${isNew ? '<span class="badge-new">🆕 NEW</span>' : ''}
                    <span class="badge ${order.orderStatus}">${order.orderStatus.replace(/_/g, ' ')}</span>
                </div>
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
    `}).join('');

    // Clear new highlights after 8 seconds
    if (_newOrderIds.size > 0) {
        setTimeout(() => {
            _newOrderIds.clear();
            document.querySelectorAll('.order-new-glow').forEach(el => el.classList.remove('order-new-glow'));
            document.querySelectorAll('.badge-new').forEach(el => el.remove());
        }, 8000);
    }
}

// Map: Open Modal
window.openOrderMap = (orderId) => {
    const order = window.allOrders.find(o => o._id === orderId);
    if (!order) return;

    activeOrder = order;

    // Show Modal
    const modal = document.getElementById('mapView');
    modal.classList.remove('hidden');

    // Helper: safely extract coordinates, only fall back if truly missing
    function getOrderCoords(ord) {
        const c = ord.shippingAddress?.coordinates;
        if (c && c.lat != null && c.lng != null && !(c.lat === 0 && c.lng === 0)) {
            return { lat: c.lat, lng: c.lng };
        }
        return { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
    }

    // Setup Map
    setTimeout(() => {
        map.invalidateSize();

        const { lat, lng } = getOrderCoords(order);

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

    // Safe coordinate access for Navigate button
    const navLat = order.shippingAddress?.coordinates?.lat;
    const navLng = order.shippingAddress?.coordinates?.lng;
    const hasCoords = navLat != null && navLng != null && !(navLat === 0 && navLng === 0);
    const navUrl = hasCoords
        ? `https://maps.google.com/?q=${navLat},${navLng}`
        : `https://maps.google.com/?q=${encodeURIComponent(order.shippingAddress.street + ', ' + order.shippingAddress.city)}`;

    let buttons = `
        <div class="action-grid">
            <button class="btn-action" onclick="window.open('tel:${order.shippingAddress.phone || order.user?.phone}')">
                <span style="font-size:24px">📞</span>
                Call
            </button>
            <button class="btn-action" onclick="window.open('${navUrl}')">
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
        const backendUrl = (window.API_BASE_URL || '').replace('/api', '');
        const proofUrl = order.deliveryProof ? `${backendUrl}${order.deliveryProof}` : null;
        buttons += `<div class="badge delivered" style="text-align:center; padding:15px; margin-top:10px;">Order Completed ✅</div>`;
        if (proofUrl) {
            buttons += `
                <div style="margin-top:12px; text-align:center;">
                    <p style="font-size:13px; color:#999; margin-bottom:8px;">📸 Delivery Proof Photo</p>
                    <img src="${proofUrl}" alt="Delivery proof" style="max-width:100%; border-radius:12px; border:1px solid #eee; box-shadow:0 2px 12px rgba(0,0,0,0.1); cursor:pointer;" onclick="window.open('${proofUrl}','_blank')">
                </div>
            `;
        }
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
    // Define Layers (Light theme map)
    const cartoLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '© CartoDB © OpenStreetMap'
    });
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' });
    const googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '© Google Maps' });
    const esriStreets = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri' });

    map = L.map('map', {
        center: [DEFAULT_LAT, DEFAULT_LNG],
        zoom: 13,
        zoomControl: false, // Cleaner UI
        layers: [cartoLight]
    });

    L.control.layers({ "Light Map": cartoLight, "OSM": osm, "Satellite": googleHybrid, "Streets": esriStreets }).addTo(map);
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

        // Track this order as "new" for highlighting + sorting to top
        if (data.orderId) _newOrderIds.add(data.orderId);

        // Play alert sound FIRST (most noticeable)
        playNotificationSound();

        // Native OS notification (works when browser minimized)
        showNativeNotification(
            '🚀 New Order Assigned!',
            `Order #${data.orderNumber}\n${data.customer || 'Customer'}\n${data.address || ''}`,
            data
        );

        showDriverToast('New Order Assigned! 🚀', `Order #${data.orderNumber} — ${data.customer || 'Customer'}`);

        // Auto-refresh orders list (new order will be on top with glow)
        loadOrders();

        // Vibrate if supported
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
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

// ── Native OS Notifications ──
function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return;
    }
    if (Notification.permission === 'default') {
        Notification.requestPermission().then(perm => {
            console.log('🔔 Notification permission:', perm);
        });
    }
}

function showNativeNotification(title, body, data) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
        const options = {
            body: body,
            icon: 'assets/images/favicon.png',
            badge: 'assets/images/favicon.png',
            tag: 'arteva-driver-' + (data?.orderId || Date.now()),
            renotify: true,
            requireInteraction: true, // Stay until user interacts
            vibrate: [200, 100, 200, 100, 200],
            silent: false, // Ensure system notification sound plays
            data: data
        };

        // Try service worker notification first (works in background)
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(reg => {
                reg.showNotification(title, options);
            });
        } else {
            // Fallback to regular Notification
            const notif = new Notification(title, options);
            notif.onclick = () => {
                window.focus();
                notif.close();
            };
        }
    } catch (err) {
        console.error('Notification error:', err);
    }
}

// ── Notification Sound ──
let _notifAudio = null;

// Pre-warm: create audio on first user interaction (unlocks mobile autoplay)
document.addEventListener('touchstart', _warmAudio, { once: true });
document.addEventListener('click', _warmAudio, { once: true });

function _warmAudio() {
    if (!_notifAudio) {
        _notifAudio = _createChimeAudio();
        // Append to DOM to ensure it behaves like media element on mobile
        _notifAudio.style.display = 'none';
        document.body.appendChild(_notifAudio);

        _notifAudio.volume = 0.01;
        _notifAudio.play().then(() => {
            _notifAudio.pause();
            _notifAudio.currentTime = 0;
            _notifAudio.volume = 1.0;
            console.log('🔊 Audio unlocked for notifications');
        }).catch(() => {});
    }
}

function _createChimeAudio() {
    const sampleRate = 44100;
    const duration = 1.2;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    const ws = (v, o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };

    ws(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    ws(view, 8, 'WAVE');
    ws(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    ws(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);

    const chime = [
        { freq: 523.25, start: 0, end: 0.2 },
        { freq: 659.25, start: 0.15, end: 0.35 },
        { freq: 783.99, start: 0.3, end: 0.55 },
        { freq: 523.25, start: 0.6, end: 0.8 },
        { freq: 659.25, start: 0.75, end: 0.95 },
        { freq: 783.99, start: 0.9, end: 1.15 },
    ];

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;
        for (const note of chime) {
            if (t >= note.start && t < note.end) {
                const nt = t - note.start;
                const env = Math.sin(Math.PI * nt / (note.end - note.start));
                sample += Math.sin(2 * Math.PI * note.freq * t) * env * 0.4;
            }
        }
        view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 32000, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const audio = new Audio(URL.createObjectURL(blob));
    audio.preload = 'auto';
    return audio;
}

function playNotificationSound() {
    try {
        if (!_notifAudio) _notifAudio = _createChimeAudio();
        _notifAudio.currentTime = 0;
        _notifAudio.volume = 1.0;
        _notifAudio.play().catch(e => console.warn('Audio play failed:', e));
    } catch (e) {
        console.warn('Audio notification failed:', e);
    }
}

// ── Service Worker Registration ──
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('driver-sw.js')
            .then(reg => {
                console.log('🔧 Driver service worker registered:', reg.scope);
            })
            .catch(err => {
                console.warn('Service worker registration failed:', err);
            });
    }
}
