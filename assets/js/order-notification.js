/**
 * Order Notification Sound Module
 * Plays professional notification sound + browser push + polling fallback
 */

let notificationEnabled = true;
let lastNotificationTime = 0;
const NOTIFICATION_DEBOUNCE = 3000; // 3 seconds between notifications

// Polling state
let orderPollInterval = null;
let lastKnownOrderCount = null;
const ORDER_POLL_INTERVAL = 30000; // 30 seconds

/**
 * Initialize notification system
 */
function initOrderNotifications() {
    // Load preference from localStorage
    const savedPref = localStorage.getItem('orderNotificationsEnabled');
    if (savedPref !== null) {
        notificationEnabled = savedPref === 'true';
    }
    
    // Update toggle UI if it exists
    updateNotificationToggle();
    
    // Request browser notification permission
    requestNotificationPermission();
    
    // Start polling fallback (runs alongside Socket.IO for reliability)
    startOrderPolling();
}

/**
 * Play notification sound — works even when tab is hidden
 */
function playOrderNotification() {
    if (!notificationEnabled) return;
    
    // Debounce to prevent spam
    const now = Date.now();
    if (now - lastNotificationTime < NOTIFICATION_DEBOUNCE) return;
    lastNotificationTime = now;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const playTone = (frequency, startTime, duration) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, startTime);
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };
        
        // Professional three-tone ascending chime
        const t = audioContext.currentTime;
        playTone(523.25, t, 0.12);         // C5
        playTone(659.25, t + 0.1, 0.12);   // E5
        playTone(1046.50, t + 0.2, 0.25);  // C6
        
    } catch (error) {
        console.error('Failed to play notification sound:', error);
    }
    
    // Vibrate on mobile
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }
}

/**
 * Toggle notifications on/off
 */
function toggleNotifications() {
    notificationEnabled = !notificationEnabled;
    localStorage.setItem('orderNotificationsEnabled', notificationEnabled.toString());
    updateNotificationToggle();
    
    if (typeof showToast === 'function') {
        showToast(
            'Notifications',
            notificationEnabled ? 'Order notifications enabled' : 'Order notifications disabled',
            'info'
        );
    }
    
    if (notificationEnabled) {
        setTimeout(() => playOrderNotification(), 500);
    }
}

/**
 * Update toggle UI
 */
function updateNotificationToggle() {
    const toggle = document.getElementById('notificationToggle');
    if (toggle) {
        toggle.checked = notificationEnabled;
        toggle.title = notificationEnabled ? 'Notifications enabled' : 'Notifications disabled';
    }
    
    const icon = document.getElementById('notificationIcon');
    if (icon) {
        icon.textContent = notificationEnabled ? '🔔' : '🔕';
    }
}

/**
 * Handle new order event from socket OR polling
 */
function handleNewOrderNotification(orderData) {
    // Play sound regardless of tab visibility
    playOrderNotification();
    
    // Show browser notification (works even in background)
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            const notification = new Notification('🛍️ New Order Received!', {
                body: `Order #${orderData.orderNumber || 'Unknown'}${orderData.total ? ' — ' + orderData.total.toFixed(3) + ' KWD' : ''}`,
                icon: '/assets/images/logo.png',
                badge: '/assets/images/favicon.png',
                tag: 'new-order-' + (orderData.orderNumber || Date.now()),
                requireInteraction: true,
                silent: false
            });
            
            // Click notification to focus admin panel
            notification.onclick = function() {
                window.focus();
                notification.close();
                // Switch to orders section
                const ordersLink = document.querySelector('a[href="#orders"]');
                if (ordersLink) ordersLink.click();
            };
            
            // Auto-close after 15 seconds
            setTimeout(() => notification.close(), 15000);
        } catch (e) {
            console.error('Browser notification error:', e);
        }
    }
    
    // Flash the page title
    flashPageTitle(orderData.orderNumber);
}

/**
 * Flash page title to attract attention
 */
let titleFlashInterval = null;
function flashPageTitle(orderNumber) {
    if (titleFlashInterval) clearInterval(titleFlashInterval);
    
    const originalTitle = document.title;
    const alertTitle = '🔴 New Order #' + (orderNumber || '') + '!';
    let isOriginal = true;
    
    titleFlashInterval = setInterval(() => {
        document.title = isOriginal ? alertTitle : originalTitle;
        isOriginal = !isOriginal;
    }, 1000);
    
    // Stop flashing when window gets focus
    const stopFlash = () => {
        if (titleFlashInterval) {
            clearInterval(titleFlashInterval);
            titleFlashInterval = null;
            document.title = originalTitle;
        }
        window.removeEventListener('focus', stopFlash);
    };
    
    window.addEventListener('focus', stopFlash);
    
    // Auto-stop after 60 seconds
    setTimeout(stopFlash, 60000);
}

/**
 * Request browser notification permission
 */
async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        try {
            await Notification.requestPermission();
        } catch (error) {
            console.error('Failed to request notification permission:', error);
        }
    }
}

/**
 * Polling fallback — checks for new orders every 30s
 * Acts as a safety net when Socket.IO disconnects
 */
function startOrderPolling() {
    // Clear any existing interval
    if (orderPollInterval) clearInterval(orderPollInterval);
    
    // Initial order count fetch
    fetchOrderCount();
    
    orderPollInterval = setInterval(fetchOrderCount, ORDER_POLL_INTERVAL);
}

async function fetchOrderCount() {
    try {
        const token = localStorage.getItem('arteva_token');
        if (!token) return;
        
        const baseUrl = window.API_BASE_URL || (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://arteva-maison-backend-gy1x.onrender.com/api');
        
        const res = await fetch(baseUrl + '/admin/stats', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!res.ok) return;
        const data = await res.json();
        
        if (!data.success) return;
        
        const currentCount = data.data.totalOrders || 0;
        
        // On first load, just save the count
        if (lastKnownOrderCount === null) {
            lastKnownOrderCount = currentCount;
            return;
        }
        
        // If count increased, we have new orders
        if (currentCount > lastKnownOrderCount) {
            const newOrders = currentCount - lastKnownOrderCount;
            lastKnownOrderCount = currentCount;
            
            // Trigger notification
            handleNewOrderNotification({
                orderNumber: 'NEW',
                total: null
            });
            
            if (typeof showToast === 'function') {
                showToast('New Order!', newOrders + ' new order' + (newOrders > 1 ? 's' : '') + ' received', 'order');
            }
            
            // Update badges
            const badge = document.getElementById('newOrderBadge');
            if (badge) {
                const count = parseInt(badge.textContent || '0') + newOrders;
                badge.textContent = count;
                badge.classList.remove('hidden');
            }
            
            const bottomBadge = document.getElementById('bottomNavOrderBadge');
            if (bottomBadge) {
                const count = parseInt(bottomBadge.textContent || '0') + newOrders;
                bottomBadge.textContent = count;
                bottomBadge.classList.remove('hidden');
            }
            
            // Refresh active section
            if (typeof refreshActiveSection === 'function') {
                refreshActiveSection();
            }
        } else {
            lastKnownOrderCount = currentCount;
        }
    } catch (err) {
        // Silently fail — polling is a fallback
    }
}

function stopOrderPolling() {
    if (orderPollInterval) {
        clearInterval(orderPollInterval);
        orderPollInterval = null;
    }
}

// Export functions
window.initOrderNotifications = initOrderNotifications;
window.playOrderNotification = playOrderNotification;
window.toggleNotifications = toggleNotifications;
window.handleNewOrderNotification = handleNewOrderNotification;
window.requestNotificationPermission = requestNotificationPermission;
window.startOrderPolling = startOrderPolling;
window.stopOrderPolling = stopOrderPolling;
