/**
 * ARTEVA Maison - Orders Page Script
 * Fetches and displays user's order history
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (!AuthAPI.isLoggedIn()) {
        window.location.href = 'account.html?redirect=orders.html';
        return;
    }

    // Initialize currency
    if (window.CurrencyAPI) {
        window.CurrencyAPI.init();
    }

    // Load Orders
    await loadOrders();

    // Logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            AuthAPI.logout();
        });
    }
});

async function loadOrders(page = 1) {
    const ordersList = document.getElementById('ordersList');
    const pagination = document.getElementById('pagination');
    const ordersContent = document.querySelector('.orders-content');

    // Check for ID param
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');

    if (orderId) {
        // Load Single Order
        await loadOrderDetails(orderId);
        return;
    }

    // Load List
    try {
        const data = await OrdersAPI.getMyOrders(page, 10);

        renderOrders(data.data);
        renderPagination(data.pagination);

    } catch (error) {
        console.error('Error loading orders:', error);
        ordersList.innerHTML = `<p class="error-text">Failed to load orders. Please try again later.</p>`;
    }
}

async function loadOrderDetails(id) {
    const ordersList = document.getElementById('ordersList');
    const pagination = document.getElementById('pagination');
    const title = document.querySelector('.orders-content h1');

    // Hide pagination
    if (pagination) pagination.style.display = 'none';

    // Update title
    if (title) {
        const orderDetailsText = window.getTranslation ? window.getTranslation('order_details') : 'Order Details';
        title.innerHTML = `<a href="orders.html" style="text-decoration:none;color:inherit;font-size:0.8em;margin-right:10px;">←</a> ${orderDetailsText}`;
    }

    try {
        const data = await OrdersAPI.getById(id);

        renderOrderDetails(data.data);

    } catch (error) {
        console.error('Error loading order details:', error);
        ordersList.innerHTML = `<p class="error-text">Failed to load order details. <a href="orders.html">Go back</a></p>`;
    }
}

// Global Image Error Handler (if not already defined in main.js)
if (!window.handleImageError) {
    window.handleImageError = function (img) {
        if (!img || img.dataset.fallbackAttempted) return;

        const src = img.src || img.getAttribute('src');
        if (!src) return;

        // Try .png if it's .jpeg
        if (src.includes('.jpeg') || src.includes('.jpg')) {
            img.dataset.fallbackAttempted = 'true';
            const pngSrc = src.replace(/\.jpe?g$/i, '.png');
            img.src = pngSrc;
            return;
        }

        // If already tried or not a jpeg, use placeholder
        img.dataset.fallbackAttempted = 'true';
        img.src = 'assets/images/products/placeholder.png';
    };
}

function renderOrderDetails(order) {
    const ordersList = document.getElementById('ordersList');

    const date = new Date(order.createdAt).toLocaleDateString(
        document.documentElement.lang === 'ar' ? 'ar-KW' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    );

    const statusKey = `status_${order.orderStatus.toLowerCase()}`;
    const statusLabel = window.getTranslation ? window.getTranslation(statusKey) : order.orderStatus;
    const currency = window.getTranslation ? window.getTranslation('currency') : 'KWD';

    const shipping = order.shippingAddress;

    // Calculate totals
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCost = order.total - subtotal; // Approximate if not stored separately

    ordersList.innerHTML = `
        <div class="order-details-container">
            <!-- Header -->
            <div class="order-card" style="margin-bottom: var(--space-6);">
                <div class="order-header">
                    <span class="order-id">Order #${order.orderNumber}</span>
                    <div class="order-header-info">
                        <span class="order-date">${date}</span>
                        <span class="order-status ${order.orderStatus.toLowerCase()}">${statusLabel}</span>
                    </div>
                </div>
            </div>

            <div class="orders-layout-details" style="display:grid; grid-template-columns: 2fr 1fr; gap: var(--space-6);">
                <!-- Items -->
                <div class="order-card p-6">
                    <h3 style="margin-bottom: var(--space-4); border-bottom: 1px solid var(--border-light); padding-bottom: var(--space-2);">Items</h3>
                    <div class="order-items-list" style="display: flex; flex-direction: column; gap: var(--space-4);">
                        ${order.items.map(item => `
                            <div class="order-item" style="display: flex; gap: var(--space-4); align-items: center;">
                                <div class="item-img" style="width: 60px; height: 60px; border: 1px solid var(--border-light); border-radius: var(--radius-sm); overflow: hidden;">
                                    <img src="${item.image || 'assets/images/logo.png'}" style="width: 100%; height: 100%; object-fit: cover;">
                                </div>
                                <div class="item-info" style="flex: 1;">
                                    <div style="font-weight: 500;">${item.name}</div>
                                    <div style="color: var(--text-muted); font-size: var(--fs-sm);">Qty: ${item.quantity}</div>
                                </div>
                                <div class="item-price" style="font-weight: 500;">
                                    ${parseFloat(item.price * item.quantity).toFixed(3)} ${currency}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Sidebar Info -->
                <div style="display: flex; flex-direction: column; gap: var(--space-6);">
                    <!-- Shipping -->
                    <div class="order-card" style="padding: var(--space-4);">
                        <h3 style="font-size: var(--fs-lg); margin-bottom: var(--space-3);">Shipping Address</h3>
                        <p style="color: var(--text-secondary); font-size: var(--fs-sm); line-height: 1.6;">
                            ${shipping.street}<br>
                            ${shipping.city}<br>
                            ${shipping.country || 'Kuwait'}<br>
                            Phone: ${shipping.phone}
                        </p>
                    </div>

                    <!-- Summary -->
                    <div class="order-card" style="padding: var(--space-4);">
                        <h3 style="font-size: var(--fs-lg); margin-bottom: var(--space-3);">Summary</h3>
                        <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2);">
                            <span>Subtotal</span>
                            <span>${subtotal.toFixed(3)} ${currency}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2); padding-bottom: var(--space-2); border-bottom: 1px solid var(--border-light);">
                            <span>Shipping</span>
                            <span>${shippingCost > 0 ? shippingCost.toFixed(3) + ' ' + currency : 'Free'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: var(--fs-lg);">
                            <span>Total</span>
                            <span>${parseFloat(order.total).toFixed(3)} ${currency}</span>
                        </div>
                        <div style="margin-top: var(--space-2); font-size: var(--fs-sm); color: var(--text-muted);">
                             Payment: ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'N/A'}
                        </div>
                        ${order.orderStatus === 'out_for_delivery' || order.orderStatus === 'handed_over' ? `
                        <div style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border-light);">
                            <a href="order-tracking.html?order=${order.orderNumber}" class="btn-view-order" style="display: block; text-align: center; background: #10b981; color: #fff; padding: 12px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                                📍 Track Your Order
                            </a>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add responsive check for mobile
    if (window.innerWidth < 768) {
        document.querySelector('.orders-layout-details').style.gridTemplateColumns = '1fr';
    }
}

function renderOrders(orders) {
    const ordersList = document.getElementById('ordersList');

    if (!orders || orders.length === 0) {
        ordersList.innerHTML = '<p>You haven\'t placed any orders yet.</p>';
        return;
    }

    ordersList.innerHTML = orders.map(order => {
        const date = new Date(order.createdAt).toLocaleDateString(
            document.documentElement.lang === 'ar' ? 'ar-KW' : 'en-US',
            { year: 'numeric', month: 'long', day: 'numeric' }
        );

        // Determine status display
        const statusKey = `status_${order.orderStatus.toLowerCase()}`;
        const statusLabel = window.getTranslation ? window.getTranslation(statusKey) : order.orderStatus;

        const viewDetailsText = window.getTranslation ? window.getTranslation('view_details') : 'View Details';
        const totalText = window.getTranslation ? window.getTranslation('total') : 'Total';
        const orderNumText = window.getTranslation ? window.getTranslation('order_number') : 'Order #';

        const total = parseFloat(order.total).toFixed(3);
        const currency = window.getTranslation ? window.getTranslation('currency') : 'KWD';

        // Limit items preview to 4 items
        const previewItems = order.items.slice(0, 4);
        const remainingCount = order.items.length - 4;

        return `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-id">${orderNumText} ${order.orderNumber}</span>
                    <div class="order-header-info">
                        <span class="order-date">${date}</span>
                        <span class="order-status ${order.orderStatus.toLowerCase()}">${statusLabel}</span>
                    </div>
                </div>
                
                <div class="order-body">
                    <div class="order-items-preview">
                        ${previewItems.map(item => `
                            <div class="order-item-thumb">
                                <img src="${item.image || 'assets/images/logo.png'}" 
                                     alt="${item.name}" 
                                     title="${item.name} x${item.quantity}">
                            </div>
                        `).join('')}
                        ${remainingCount > 0 ? `
                            <div class="order-item-thumb" style="display:flex;align-items:center;justify-content:center;background:#f8f9fa;">
                                <span style="font-weight:bold;color:var(--text-secondary);">+${remainingCount}</span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="order-footer">
                        <div class="order-total">
                            ${totalText}: ${total} ${currency}
                        </div>
                        <a href="receipt.html?id=${order._id}" target="_blank" class="btn-view-order" style="background:#fff; color:var(--text-secondary); border:1px solid var(--border-light); margin-right:10px;">Receipt</a>
                        ${order.orderStatus === 'out_for_delivery' || order.orderStatus === 'handed_over' ? `<a href="order-tracking.html?order=${order.orderNumber}" class="btn-view-order" style="background:#10b981; color:#fff; margin-right:10px;">📍 Track Order</a>` : ''}
                        <a href="orders.html?id=${order._id}" class="btn-view-order">${viewDetailsText}</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    if (!pagination || pagination.pages <= 1) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    let html = '';

    if (pagination.page > 1) {
        html += `<button onclick="loadOrders(${pagination.page - 1})" class="page-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>`;
    } else {
        html += `<button class="page-btn" disabled><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>`;
    }

    // Page numbers
    for (let i = 1; i <= pagination.pages; i++) {
        if (i === pagination.page) {
            html += `<button class="page-btn active">${i}</button>`;
        } else {
            html += `<button onclick="loadOrders(${i})" class="page-btn">${i}</button>`;
        }
    }

    if (pagination.page < pagination.pages) {
        html += `<button onclick="loadOrders(${pagination.page + 1})" class="page-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>`;
    } else {
        html += `<button class="page-btn" disabled><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>`;
    }

    container.innerHTML = html;
}
