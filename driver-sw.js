/**
 * ARTEVA Maison - Driver Service Worker
 * Enables background notifications when browser is minimized
 */

const CACHE_NAME = 'arteva-driver-v1';

// Handle notification click — focus the driver page
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            // Focus existing driver tab if found
            for (const client of clientList) {
                if (client.url.includes('driver.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new tab
            if (clients.openWindow) {
                return clients.openWindow('driver.html');
            }
        })
    );
});

// Keep alive — respond to periodic messages from main page
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'KEEP_ALIVE') {
        // Acknowledge
        event.source.postMessage({ type: 'ALIVE' });
    }
});

// Install — activate immediately
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activate — claim clients immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});
