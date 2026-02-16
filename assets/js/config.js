/**
 * ARTEVA Maison - Configuration Module
 * Centralized environment-specific configuration
 */

const Config = {
    // Auto-detect API URL based on environment
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'
        : 'https://arteva-maison-backend-gy1x.onrender.com/api',

    // Socket.IO URL (backend URL without /api suffix)
    SOCKET_URL: function() {
        return this.API_BASE_URL.replace('/api', '');
    },

    // Stripe configuration (to be updated when Stripe account is ready)
    STRIPE_PUBLIC_KEY: 'pk_test_disabled',

    // Feature flags for payment methods
    FEATURES: {
        STRIPE_ENABLED: false,  // Disabled until Stripe account is configured
        KNET_ENABLED: false,    // Disabled until KNET merchant account is ready
        COD_ENABLED: true       // Cash on Delivery is enabled
    }
};

// Export to window for global access
window.Config = Config;
