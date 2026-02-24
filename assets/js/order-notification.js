/**
 * Order Notification Sound Module
 * Plays professional notification sound when new orders arrive
 */

let notificationEnabled = true;
let lastNotificationTime = 0;
const NOTIFICATION_DEBOUNCE = 3000; // 3 seconds between notifications

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
}

/**
 * Play notification sound
 */
function playOrderNotification() {
    if (!notificationEnabled) {
        return;
    }
    
    // Debounce to prevent spam
    const now = Date.now();
    if (now - lastNotificationTime < NOTIFICATION_DEBOUNCE) {
        return;
    }
    lastNotificationTime = now;
    
    // Create professional office notification sound using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a pleasant two-tone chime
        const playTone = (frequency, startTime, duration) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, startTime);
            
            // Envelope for smooth sound
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };
        
        // Professional notification: E5 -> C6 (pleasant ascending chime)
        const now = audioContext.currentTime;
        playTone(659.25, now, 0.15);        // E5
        playTone(1046.50, now + 0.1, 0.2);  // C6
        
    } catch (error) {
        console.error('Failed to play notification sound:', error);
    }
}

/**
 * Toggle notifications on/off
 */
function toggleNotifications() {
    notificationEnabled = !notificationEnabled;
    localStorage.setItem('orderNotificationsEnabled', notificationEnabled.toString());
    updateNotificationToggle();
    
    // Show feedback
    if (typeof showToast === 'function') {
        showToast(
            'Notifications',
            notificationEnabled ? 'Order notifications enabled' : 'Order notifications disabled',
            'info'
        );
    }
    
    // Play test sound if enabling
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
 * Handle new order event from socket
 */
function handleNewOrderNotification(orderData) {
    // Only play if admin dashboard is open and visible
    if (document.hidden) {
        return;
    }
    
    playOrderNotification();
    
    // Optional: Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Order Received', {
            body: `Order #${orderData.orderNumber || 'Unknown'} - ${orderData.total ? orderData.total.toFixed(3) + ' KWD' : ''}`,
            icon: '/assets/images/logo.png',
            badge: '/assets/images/favicon.png',
            tag: 'new-order',
            requireInteraction: false
        });
    }
}

/**
 * Request browser notification permission
 */
async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                if (typeof showToast === 'function') {
                    showToast('Success', 'Browser notifications enabled', 'success');
                }
            }
        } catch (error) {
            console.error('Failed to request notification permission:', error);
        }
    }
}

// Export functions
window.initOrderNotifications = initOrderNotifications;
window.playOrderNotification = playOrderNotification;
window.toggleNotifications = toggleNotifications;
window.handleNewOrderNotification = handleNewOrderNotification;
window.requestNotificationPermission = requestNotificationPermission;
