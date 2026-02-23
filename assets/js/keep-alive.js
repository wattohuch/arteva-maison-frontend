/**
 * ARTEVA Maison - Keep-Alive Pinger
 * Pings backend every 5 minutes to prevent Render free tier from sleeping
 */

const KeepAlive = {
    interval: null,
    pingInterval: 5 * 60 * 1000, // 5 minutes
    
    async ping() {
        try {
            const apiUrl = window.Config?.API_BASE_URL || 'https://arteva-maison-backend-gy1x.onrender.com/api';
            await fetch(`${apiUrl}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            // Silent fail
        }
    },
    
    start() {
        this.ping();
        this.interval = setInterval(() => this.ping(), this.pingInterval);
    },
    
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
};

// Auto-start when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => KeepAlive.start());
} else {
    KeepAlive.start();
}

window.KeepAlive = KeepAlive;
