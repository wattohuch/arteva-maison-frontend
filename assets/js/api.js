/**
 * ARTEVA Maison - API Service Layer
 * Handles all communication with the backend API
 */

// Ensure API_BASE_URL is available - fallback chain
const getApiBaseUrl = () => {
    return window.API_BASE_URL || 
           (window.Config && window.Config.API_BASE_URL) || 
           'https://arteva-maison-backend-gy1x.onrender.com/api';
};

// ============================================
// Auth State
// ============================================
let authToken = localStorage.getItem('arteva_token');
let currentUser = JSON.parse(localStorage.getItem('arteva_user') || 'null');

// ============================================
// HTTP Client
// ============================================
async function apiRequest(endpoint, options = {}) {
    const url = `${getApiBaseUrl()}${endpoint}`;

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(url, config);
        
        // Handle network errors
        if (!response) {
            throw new Error('Network error. Please check your connection.');
        }

        const data = await response.json();

        if (!response.ok) {
            // Provide user-friendly error messages
            const message = data.message || `Request failed with status ${response.status}`;
            throw new Error(message);
        }

        return data;
    } catch (error) {
        // Re-throw with context for better error handling upstream
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Unable to connect to server. Please check your internet connection.');
        }
        throw error;
    }
}

// ============================================
// Auth API
// ============================================
const AuthAPI = {
    async register(name, email, password, phone = '') {
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, phone })
        });

        if (data.success && data.data.token) {
            authToken = data.data.token;
            currentUser = data.data;
            localStorage.setItem('arteva_token', authToken);
            localStorage.setItem('arteva_user', JSON.stringify(currentUser));
        }

        return data;
    },

    async login(email, password) {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.success && data.data.token) {
            authToken = data.data.token;
            currentUser = data.data;
            localStorage.setItem('arteva_token', authToken);
            localStorage.setItem('arteva_user', JSON.stringify(currentUser));
        }

        return data;
    },

    async getMe() {
        return apiRequest('/auth/me');
    },

    async updateProfile(updates) {
        return apiRequest('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    async addAddress(address) {
        return apiRequest('/auth/addresses', {
            method: 'POST',
            body: JSON.stringify(address)
        });
    },

    async deleteAddress(addressId) {
        return apiRequest(`/auth/addresses/${addressId}`, {
            method: 'DELETE'
        });
    },

    async requestPasswordReset(email) {
        return apiRequest('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },

    async verifyOTP(email, otp) {
        return apiRequest('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ email, otp })
        });
    },

    async resetPassword(email, otp, newPassword) {
        return apiRequest('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ email, otp, newPassword })
        });
    },

    logout() {
        authToken = null;
        currentUser = null;
        localStorage.removeItem('arteva_token');
        localStorage.removeItem('arteva_user');
        localStorage.removeItem('arteva_cart');
        window.location.href = '/account.html';
    },

    isLoggedIn() {
        return !!authToken;
    },

    getUser() {
        return currentUser;
    }
};

// ============================================
// Products API
// ============================================
const ProductsAPI = {
    async getAll(params = {}) {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/products${query ? '?' + query : ''}`);
    },

    async getById(id) {
        return apiRequest(`/products/${id}`);
    },

    async getBySlug(slug) {
        return apiRequest(`/products/slug/${slug}`);
    },

    async getFeatured(limit = 8) {
        return apiRequest(`/products/featured?limit=${limit}`);
    },

    async getCollectionFeatured(limit = 12) {
        return apiRequest(`/products/collection-featured?limit=${limit}`);
    },

    async search(query, options = {}) {
        return this.getAll({ search: query, ...options });
    },

    async getCollectionFeatured(limit = 12) {
        return apiRequest(`/products/collection-featured?limit=${limit}`);
    }
};

// ============================================
// Categories API
// ============================================
const CategoriesAPI = {
    async getAll() {
        return apiRequest('/categories');
    },

    async getById(id) {
        return apiRequest(`/categories/${id}`);
    },

    async getBySlug(slug) {
        return apiRequest(`/categories/slug/${slug}`);
    }
};

// ============================================
// Cart API (for logged-in users)
// ============================================
const CartAPI = {
    async get() {
        if (!AuthAPI.isLoggedIn()) {
            return { success: true, data: { items: [] } };
        }
        return apiRequest('/cart');
    },

    async add(productId, quantity = 1) {
        if (!AuthAPI.isLoggedIn()) {
            throw new Error('Please login to add items to cart');
        }
        return apiRequest('/cart', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity })
        });
    },

    async update(productId, quantity) {
        if (!AuthAPI.isLoggedIn()) {
            throw new Error('Please login to update cart');
        }
        return apiRequest(`/cart/${productId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity })
        });
    },

    async remove(productId) {
        if (!AuthAPI.isLoggedIn()) {
            throw new Error('Please login to remove items');
        }
        return apiRequest(`/cart/${productId}`, {
            method: 'DELETE'
        });
    },

    async clear() {
        if (!AuthAPI.isLoggedIn()) {
            return { success: true };
        }
        return apiRequest('/cart', {
            method: 'DELETE'
        });
    }
};

// ============================================
// Orders API
// ============================================
const OrdersAPI = {
    async create(orderData) {
        return apiRequest('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    },

    async getMyOrders(page = 1, limit = 10) {
        return apiRequest(`/orders?page=${page}&limit=${limit}`);
    },

    async getById(id) {
        return apiRequest(`/orders/${id}`);
    }
};

// ============================================
// Admin API
// ============================================
const AdminAPI = {
    async getStats() {
        return apiRequest('/admin/stats');
    },

    async getProducts() {
        return apiRequest('/admin/products');
    },

    async createProduct(formData) {
        // Note: formData is used here for file upload support
        const url = `${getApiBaseUrl()}/admin/products`;
        const options = {
            method: 'POST',
            body: formData,
            headers: {
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
                // Content-Type not set for FormData, browser sets it with boundary
            }
        };
        // Custom fetch call since apiRequest sets Content-Type to JSON by default
        const response = await fetch(url, options);
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to create product');
        }
        return await response.json();
    },

    async updateProduct(id, formData) {
        const url = `${getApiBaseUrl()}/admin/products/${id}`;
        const options = {
            method: 'PUT',
            body: formData,
            headers: {
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            }
        };
        const response = await fetch(url, options);
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to update product');
        }
        return await response.json();
    },

    async deleteProduct(id) {
        return apiRequest(`/admin/products/${id}`, { method: 'DELETE' });
    },

    async getOrders() {
        return apiRequest('/admin/orders');
    },

    async updateOrderStatus(id, status) {
        return apiRequest(`/admin/orders/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    },

    async assignDriver(orderId, driverId) {
        return apiRequest(`/admin/orders/${orderId}/assign`, {
            method: 'PUT',
            body: JSON.stringify({ driverId })
        });
    },

    async getUsers() {
        return apiRequest('/admin/users');
    },

    async updateUserRole(id, role) {
        return apiRequest(`/admin/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ role })
        });
    },

    async deleteUser(id) {
        return apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
    },

    async sendEmail(data) {
        return apiRequest('/admin/send-email', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async sendEmailWithImages(formData) {
        const url = `${getApiBaseUrl()}/admin/send-email`;
        const options = {
            method: 'POST',
            body: formData,
            headers: {
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
                // Content-Type not set for FormData, browser sets it with boundary
            }
        };
        const response = await fetch(url, options);
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to send email');
        }
        return await response.json();
    }
};

// ============================================
// Hero Slides API
// ============================================
const HeroAPI = {
    async getSlides() {
        return apiRequest('/hero');
    },

    async getAllSlides() {
        return apiRequest('/hero/all');
    },

    async createSlide(formData) {
        const url = `${getApiBaseUrl()}/hero`;
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            headers: {
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            }
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to create hero slide');
        }
        return await response.json();
    },

    async updateSlide(id, formData) {
        const url = `${getApiBaseUrl()}/hero/${id}`;
        const response = await fetch(url, {
            method: 'PUT',
            body: formData,
            headers: {
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            }
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to update hero slide');
        }
        return await response.json();
    },

    async deleteSlide(id) {
        return apiRequest(`/hero/${id}`, { method: 'DELETE' });
    },

    async reorderSlides(items) {
        return apiRequest('/hero/reorder', {
            method: 'PUT',
            body: JSON.stringify({ items })
        });
    }
};

// ============================================
// Driver API
// ============================================
const DriverAPI = {
    async getAssignedOrders() {
        return apiRequest('/driver/orders');
    },

    async updateStatus(orderId, status) {
        return apiRequest(`/driver/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }
};


// ============================================
// Reviews API
// ============================================
const ReviewsAPI = {
    async getByProduct(productId) {
        return apiRequest(`/products/${productId}/reviews`);
    },

    async create(productId, rating, comment) {
        return apiRequest(`/products/${productId}/reviews`, {
            method: 'POST',
            body: JSON.stringify({ rating, comment })
        });
    },

    async update(productId, reviewId, rating, comment) {
        return apiRequest(`/products/${productId}/reviews/${reviewId}`, {
            method: 'PUT',
            body: JSON.stringify({ rating, comment })
        });
    },

    async delete(productId, reviewId) {
        return apiRequest(`/products/${productId}/reviews/${reviewId}`, {
            method: 'DELETE'
        });
    }
};

// ============================================
// Payments API (MyFatoorah Integration)
// ============================================
const PaymentsAPI = {
    // Get available payment methods (KNET, Cards, Apple Pay)
    async getPaymentMethods(amount = 1) {
        return apiRequest(`/payments/methods?amount=${amount}`, {
            method: 'GET'
        });
    },

    // Create payment session (general)
    async createPaymentSession(shippingAddress) {
        return apiRequest('/payments/create-session', {
            method: 'POST',
            body: JSON.stringify({ shippingAddress })
        });
    },

    // Execute payment with specific method
    async executePayment(paymentMethodId, shippingAddress) {
        return apiRequest('/payments/execute', {
            method: 'POST',
            body: JSON.stringify({ paymentMethodId, shippingAddress })
        });
    },

    // Verify payment status
    async verifyPayment(paymentId) {
        return apiRequest(`/payments/verify/${paymentId}`, {
            method: 'GET'
        });
    },

    // Process Cash on Delivery
    async processCOD(shippingAddress, notes) {
        return apiRequest('/payments/cod', {
            method: 'POST',
            body: JSON.stringify({ shippingAddress, notes })
        });
    }
};

// ============================================
// Contact API
// ============================================
const ContactAPI = {
    async sendMessage(contactData) {
        return apiRequest('/contact', {
            method: 'POST',
            body: JSON.stringify(contactData)
        });
    }
};

// ============================================
// Export APIs
// ============================================
window.API = {
    auth: AuthAPI,
    products: ProductsAPI,
    categories: CategoriesAPI,
    cart: CartAPI,
    orders: OrdersAPI,
    admin: AdminAPI,
    driver: DriverAPI,
    contact: ContactAPI,
    reviews: ReviewsAPI,
    payments: PaymentsAPI,
    hero: HeroAPI
};

window.AuthAPI = AuthAPI;
window.ProductsAPI = ProductsAPI;
window.CategoriesAPI = CategoriesAPI;
window.CartAPI = CartAPI;
window.OrdersAPI = OrdersAPI;
window.AdminAPI = AdminAPI;
window.DriverAPI = DriverAPI;
window.ContactAPI = ContactAPI;
window.ReviewsAPI = ReviewsAPI;
window.PaymentsAPI = PaymentsAPI;
window.HeroAPI = HeroAPI;
window.apiRequest = apiRequest;
