/**
 * ARTEVA Maison - Push Notification Client
 * Registers service worker and subscribes for push notifications
 */

const PushNotifications = {
    swRegistration: null,
    isSubscribed: false,

    async init() {
        // Only init if service workers are supported
        if (!('serviceWorker' in navigator)) {
            console.log('Service Workers not supported');
            return;
        }

        if (!('PushManager' in window)) {
            console.log('Push notifications not supported');
            return;
        }

        try {
            // Register service worker
            this.swRegistration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker registered');

            // Check subscription status
            const subscription = await this.swRegistration.pushManager.getSubscription();
            this.isSubscribed = !!subscription;

            // Auto-subscribe if logged in and not already subscribed
            if (!this.isSubscribed && window.AuthAPI && window.AuthAPI.isLoggedIn()) {
                await this.subscribe();
            }
        } catch (err) {
            console.error('Push init error:', err);
        }
    },

    async subscribe() {
        try {
            // Get VAPID key from server
            const response = await fetch(`${window.API_BASE_URL || ''}/push/vapid-key`);
            const data = await response.json();

            if (!data.success || !data.key) {
                console.log('Push not configured on server');
                return;
            }

            // Convert VAPID key
            const applicationServerKey = this._urlBase64ToUint8Array(data.key);

            // Ask for permission and subscribe
            const subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey
            });

            // Send subscription to server
            const token = localStorage.getItem('arteva_token');
            if (token) {
                await fetch(`${window.API_BASE_URL || ''}/push/subscribe`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ subscription })
                });
            }

            this.isSubscribed = true;
            console.log('✅ Subscribed to push notifications');
        } catch (err) {
            if (Notification.permission === 'denied') {
                console.log('Push notifications blocked by user');
            } else {
                console.error('Push subscribe error:', err);
            }
        }
    },

    async unsubscribe() {
        try {
            const subscription = await this.swRegistration.pushManager.getSubscription();
            if (subscription) {
                const token = localStorage.getItem('arteva_token');
                if (token) {
                    await fetch(`${window.API_BASE_URL || ''}/push/unsubscribe`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ endpoint: subscription.endpoint })
                    });
                }
                await subscription.unsubscribe();
                this.isSubscribed = false;
                console.log('Unsubscribed from push notifications');
            }
        } catch (err) {
            console.error('Push unsubscribe error:', err);
        }
    },

    _urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
};

// Expose globally
window.PushNotifications = PushNotifications;

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PushNotifications.init());
} else {
    PushNotifications.init();
}
