/**
 * ARTEVA Maison - Service Worker
 * Handles push notifications for order status updates
 */

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
    let data = { title: 'ARTÉVA Maison', body: 'You have an update!' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body || '',
        icon: '/assets/images/favicon.png',
        badge: '/assets/images/favicon.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/',
            orderNumber: data.orderNumber || null
        },
        actions: data.actions || [
            { action: 'view', title: 'View Order' }
        ],
        tag: data.tag || 'arteva-notification',
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'ARTÉVA Maison', options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            // Try to focus an existing window
            for (const client of clientList) {
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Open a new window
            return clients.openWindow(url);
        })
    );
});
