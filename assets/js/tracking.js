/**
 * Order Tracking JavaScript
 * Handles real-time order tracking with Socket.IO and Leaflet map
 */

// Configuration
const API_URL = window.API_BASE_URL ? window.API_BASE_URL.replace('/api', '') : 'https://arteva-maison-backend-gy1x.onrender.com';
const SOCKET_URL = API_URL;

// Status display names and order
const STATUS_CONFIG = {
    pending: { name: 'Order Placed', icon: '📦', order: 1 },
    confirmed: { name: 'Confirmed', icon: '✓', order: 2 },
    packed: { name: 'Packed', icon: '📦', order: 3 },
    processing: { name: 'Processing', icon: '⚙️', order: 4 },
    handed_over: { name: 'Handed to Pilot', icon: '🤝', order: 5 },
    out_for_delivery: { name: 'Out for Delivery', icon: '🚗', order: 6 },
    delivered: { name: 'Delivered', icon: '✅', order: 7 },
    cancelled: { name: 'Cancelled', icon: '❌', order: -1 }
};

// Global state
let socket = null;
let map = null;
let pilotMarker = null;
let destinationMarker = null;
let currentOrderNumber = null;
let routePolyline = null;
let pilotLocationHistory = [];
let lastPilotPosition = null;
let estimatedTimeEl = null;
let distanceEl = null;

// DOM Elements
const orderLookupForm = document.getElementById('orderLookupForm');
const orderNumberInput = document.getElementById('orderNumberInput');
const loadingState = document.getElementById('loadingState');
const noOrderState = document.getElementById('noOrderState');
const noOrderMessage = document.getElementById('noOrderMessage');
const trackingContent = document.getElementById('trackingContent');
const currentStatusEl = document.getElementById('currentStatus');
const statusTimeline = document.getElementById('statusTimeline');
const pilotName = document.getElementById('pilotName');
const pilotPhone = document.getElementById('pilotPhone');
const pilotAvatar = document.getElementById('pilotAvatar');
const locationUpdate = document.getElementById('locationUpdate');

// Create estimated time and distance elements if they don't exist
function ensureETAElements() {
    const mapInfo = document.getElementById('mapInfo');
    if (!mapInfo) return;

    if (!estimatedTimeEl) {
        estimatedTimeEl = document.createElement('div');
        estimatedTimeEl.className = 'location-update';
        estimatedTimeEl.id = 'estimatedTime';
        estimatedTimeEl.style.marginTop = '8px';
        estimatedTimeEl.style.fontWeight = '500';
        estimatedTimeEl.style.color = '#10b981';
        mapInfo.appendChild(estimatedTimeEl);
    }

    if (!distanceEl) {
        distanceEl = document.createElement('div');
        distanceEl.className = 'location-update';
        distanceEl.id = 'distance';
        distanceEl.style.marginTop = '4px';
        distanceEl.style.fontSize = '0.875rem';
        mapInfo.appendChild(distanceEl);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();

    // Check for order number in URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderNumber = urlParams.get('order');

    if (orderNumber) {
        orderNumberInput.value = orderNumber;
        trackOrder(orderNumber);
    }
});

// Form submission
orderLookupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const orderNumber = orderNumberInput.value.trim().toUpperCase();
    if (orderNumber) {
        trackOrder(orderNumber);
    }
});

/**
 * Initialize Socket.IO connection
 */
function initializeSocket() {
    socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        timeout: 20000
    });

    socket.on('connect', () => {
        console.log('🔌 Connected to real-time updates');

        // Rejoin order room if we were tracking
        if (currentOrderNumber) {
            socket.emit('join_order_room', currentOrderNumber);
        }
    });

    socket.on('disconnect', () => {
        console.log('🔌 Disconnected from real-time updates');
    });

    // Listen for status updates
    socket.on('order_status_update', (data) => {
        console.log('📦 Status update received:', data);
        if (data.orderNumber === currentOrderNumber) {
            updateStatusDisplay(data.status, data.statusHistory);
        }
    });

    // Listen for location updates
    socket.on('delivery_location_update', (data) => {
        console.log('📍 Location update received:', data);
        if (data.lat && data.lng) {
            updatePilotLocation(data.lat, data.lng);
            const lastUpdateText = window.getTranslation ? window.getTranslation('last_update') : 'Last update';
            locationUpdate.textContent = `${lastUpdateText}: ${formatTime(data.timestamp || new Date().toISOString())}`;
            locationUpdate.style.color = '#10b981';
        }
    });

    // Listen for pilot assignment
    socket.on('pilot_assigned', (data) => {
        console.log('🚀 Pilot assigned:', data);
        if (data.orderNumber === currentOrderNumber) {
            updatePilotInfo(data.pilot);
        }
    });
}

/**
 * Track an order by order number
 */
async function trackOrder(orderNumber) {
    currentOrderNumber = orderNumber;

    // Update URL without reload
    const newUrl = `${window.location.pathname}?order=${orderNumber}`;
    history.pushState({}, '', newUrl);

    // Show loading state
    showState('loading');

    try {
        const response = await fetch(`${API_URL}/api/delivery/track/${orderNumber}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Order not found');
        }

        const orderData = result.data;

        if (!orderData) {
            throw new Error('Invalid order data received from server');
        }

        // Join Socket.IO room for this order
        socket.emit('join_order_room', orderNumber);

        // Display tracking info
        displayTrackingInfo(orderData);
        showState('tracking');

    } catch (error) {
        console.error('Error tracking order:', error);

        const errorMsg = error.message || (window.getTranslation ? window.getTranslation('order_not_found_error') : 'Order not found. Please check the order number.');
        noOrderMessage.textContent = errorMsg;
        showState('noOrder');
    }
}

/**
 * Display tracking information
 */
function displayTrackingInfo(orderData) {
    // Update current status
    const statusConfig = STATUS_CONFIG[orderData.status] || { name: orderData.status, order: 0 };
    const statusKey = `status_${orderData.status}`;
    const statusName = window.getTranslation ? window.getTranslation(statusKey) : statusConfig.name;
    currentStatusEl.textContent = statusName;

    // Build timeline
    buildTimeline(orderData.statusHistory, orderData.status);

    // Update pilot info
    if (orderData.deliveryPilot) {
        updatePilotInfo(orderData.deliveryPilot);
    }

    // Initialize map
    initializeMap(orderData);
}

/**
 * Build the status timeline
 */
function buildTimeline(statusHistory, currentStatus) {
    statusTimeline.innerHTML = '';

    // Get ordered statuses for display
    const orderedStatuses = Object.entries(STATUS_CONFIG)
        .filter(([key, val]) => val.order > 0)
        .sort((a, b) => a[1].order - b[1].order);

    const currentOrder = STATUS_CONFIG[currentStatus]?.order || 0;

    orderedStatuses.forEach(([statusKey, config]) => {
        // Find if this status exists in history
        const historyEntry = statusHistory?.find(h => h.status === statusKey);
        const isCompleted = config.order < currentOrder;
        const isActive = statusKey === currentStatus;

        const item = document.createElement('div');
        item.className = `timeline-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`;

        item.innerHTML = `
            <div class="timeline-dot">
                ${isCompleted || isActive ? `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                ` : ''}
            </div>
            <div class="timeline-content">
                <h4>${window.getTranslation ? window.getTranslation('status_' + statusKey) : config.name}</h4>
                <p>${historyEntry ? formatDateTime(historyEntry.timestamp) : (isCompleted ? 'Completed' : 'Pending')}</p>
            </div>
        `;

        statusTimeline.appendChild(item);
    });
}

/**
 * Update pilot information display
 */
function updatePilotInfo(pilot) {
    if (pilot && pilot.name) {
        pilotName.textContent = pilot.name;
        pilotPhone.textContent = pilot.phone || (window.getTranslation ? window.getTranslation('no_phone') : 'No phone available');
        pilotAvatar.textContent = pilot.name.charAt(0).toUpperCase();

        // If pilot has location, update marker
        if (pilot.location) {
            updatePilotLocation(pilot.location.lat, pilot.location.lng);
        }
    }
}

/**
 * Initialize the Leaflet map
 */
function initializeMap(orderData) {
    // Default center (Kuwait City)
    let center = [29.3759, 47.9774];
    let zoom = 12;

    // If we have destination coordinates, use them
    if (orderData.shippingAddress?.coordinates?.lat) {
        center = [orderData.shippingAddress.coordinates.lat, orderData.shippingAddress.coordinates.lng];
        zoom = 14;
    }

    // If we have delivery location, use that as center
    if (orderData.deliveryLocation?.lat) {
        center = [orderData.deliveryLocation.lat, orderData.deliveryLocation.lng];
        zoom = 15;
    }

    // Create map if not exists
    if (!map) {
        // Define Layers
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        });

        const googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '© Google Maps'
        });

        const esriStreets = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri'
        });

        // Initialize map with Google Hybrid as default for better accuracy
        map = L.map('tracking-map', {
            center: center,
            zoom: zoom,
            layers: [googleHybrid]
        });

        // Layer Control
        const baseMaps = {
            "Satellite": googleHybrid,
            "Streets (Esri)": esriStreets,
            "Streets (OSM)": osm
        };
        L.control.layers(baseMaps).addTo(map);

    } else {
        map.setView(center, zoom);
    }

    // Add destination marker if we have coordinates
    if (orderData.shippingAddress?.coordinates?.lat) {
        if (destinationMarker) {
            destinationMarker.remove();
        }

        const destinationIcon = L.divIcon({
            className: 'destination-marker',
            html: `<div style="background: #ef4444; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); border: 3px solid white;">🏠</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        destinationMarker = L.marker(
            [orderData.shippingAddress.coordinates.lat, orderData.shippingAddress.coordinates.lng],
            { icon: destinationIcon }
        ).addTo(map).bindPopup('Delivery Destination');
    }

    // Ensure ETA elements exist before updating location
    ensureETAElements();

    // Add pilot marker if we have location
    if (orderData.deliveryLocation?.lat) {
        updatePilotLocation(orderData.deliveryLocation.lat, orderData.deliveryLocation.lng, true);
    } else if (orderData.deliveryPilot?.location?.lat) {
        updatePilotLocation(orderData.deliveryPilot.location.lat, orderData.deliveryPilot.location.lng, true);
    }

    // Fit map to show both markers after a short delay to ensure markers are rendered
    setTimeout(() => {
        fitMapToMarkers();
    }, 500);
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

/**
 * Calculate estimated time of arrival (ETA) in minutes
 */
function calculateETA(distanceKm) {
    // Average delivery speed: 30 km/h in city
    const avgSpeedKmh = 30;
    const timeHours = distanceKm / avgSpeedKmh;
    return Math.ceil(timeHours * 60); // Convert to minutes
}

/**
 * Update pilot marker location on map with smooth animation
 */
function updatePilotLocation(lat, lng, isInitial = false) {
    if (!map) {
        console.warn('Map not initialized yet');
        return;
    }

    // Ensure ETA elements exist
    if (!estimatedTimeEl || !distanceEl) {
        ensureETAElements();
    }

    // Store location history for route visualization
    pilotLocationHistory.push([lat, lng]);

    // Keep only last 50 points to avoid performance issues
    if (pilotLocationHistory.length > 50) {
        pilotLocationHistory.shift();
    }

    const pilotIcon = L.divIcon({
        className: 'pilot-marker',
        html: `<div style="background: #10b981; color: white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); border: 3px solid white; animation: pulse 2s infinite;">🚗</div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
    });

    if (pilotMarker) {
        // Smooth animation to new position
        const oldLatLng = pilotMarker.getLatLng();
        const newLatLng = [lat, lng];

        // Animate marker movement
        animateMarker(pilotMarker, oldLatLng, newLatLng, 1000); // 1 second animation

        // Update route polyline
        updateRoutePolyline();
    } else {
        pilotMarker = L.marker([lat, lng], {
            icon: pilotIcon,
            rotationAngle: 0
        })
            .addTo(map)
            .bindPopup('Delivery Driver');
    }

    lastPilotPosition = [lat, lng];

    // Calculate distance and ETA if destination exists
    if (destinationMarker) {
        const destLatLng = destinationMarker.getLatLng();
        const distance = calculateDistance(lat, lng, destLatLng.lat, destLatLng.lng);
        const eta = calculateETA(distance);

        if (estimatedTimeEl) {
            estimatedTimeEl.textContent = `⏱️ Estimated arrival: ${eta} min`;
        }
        if (distanceEl) {
            distanceEl.textContent = `📍 Distance: ${distance.toFixed(2)} km`;
        }
    }

    // Auto-fit map to show both driver and destination
    if (!isInitial) {
        fitMapToMarkers();
    }
}

/**
 * Smoothly animate marker from old position to new position
 */
function animateMarker(marker, from, to, duration) {
    const startTime = Date.now();
    const fromLat = from.lat || from[0];
    const fromLng = from.lng || from[1];
    const toLat = to.lat || to[0];
    const toLng = to.lng || to[1];

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        const currentLat = fromLat + (toLat - fromLat) * easeProgress;
        const currentLng = fromLng + (toLng - fromLng) * easeProgress;

        marker.setLatLng([currentLat, currentLng]);

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    animate();
}

/**
 * Update route polyline showing driver's path
 */
function updateRoutePolyline() {
    if (pilotLocationHistory.length < 2) return;

    if (routePolyline) {
        map.removeLayer(routePolyline);
    }

    routePolyline = L.polyline(pilotLocationHistory, {
        color: '#10b981',
        weight: 4,
        opacity: 0.7,
        smoothFactor: 1.0
    }).addTo(map);
}

/**
 * Fit map to show both driver and destination markers
 */
function fitMapToMarkers() {
    if (!map || !pilotMarker || !destinationMarker) return;

    const pilotLatLng = pilotMarker.getLatLng();
    const destLatLng = destinationMarker.getLatLng();

    const bounds = L.latLngBounds([pilotLatLng, destLatLng]);
    map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 16
    });
}

/**
 * Update status display from real-time update
 */
function updateStatusDisplay(status, statusHistory) {
    const statusConfig = STATUS_CONFIG[status] || { name: status, order: 0 };
    currentStatusEl.textContent = statusConfig.name;

    // Rebuild timeline
    buildTimeline(statusHistory, status);

    // Show notification
    const statusKey = `status_${status}`;
    const statusName = window.getTranslation ? window.getTranslation(statusKey) : statusConfig.name;
    const orderStatusTitle = window.getTranslation ? window.getTranslation('order_status_title') : 'Order status';
    showNotification(`${orderStatusTitle}: ${statusName}`);
}

/**
 * Show a brief notification
 */
function showNotification(message) {
    // Check if browser supports notifications
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ARTEVA Maison', { body: message });
    }
}

/**
 * Show/hide states
 */
function showState(state) {
    loadingState.classList.add('hidden');
    noOrderState.classList.add('hidden');
    trackingContent.classList.add('hidden');

    switch (state) {
        case 'loading':
            loadingState.classList.remove('hidden');
            break;
        case 'noOrder':
            noOrderState.classList.remove('hidden');
            break;
        case 'tracking':
            trackingContent.classList.remove('hidden');
            break;
    }
}

/**
 * Format timestamp for display
 */
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format time only
 */
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}
