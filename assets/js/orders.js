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
        ordersList.innerHTML = '<p class="error-text">Failed to load orders. Please try again later.</p>';
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
        title.innerHTML = '<a href="orders.html" style="text-decoration:none;color:inherit;font-size:0.8em;margin-right:10px;">\u2190</a> ' + orderDetailsText;
    }

    try {
        const data = await OrdersAPI.getById(id);

        renderOrderDetails(data.data);

    } catch (error) {
        console.error('Error loading order details:', error);
        ordersList.innerHTML = '<p class="error-text">Failed to load order details. <a href="orders.html">Go back</a></p>';
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

    const statusKey = 'status_' + order.orderStatus.toLowerCase();
    const statusLabel = window.getTranslation ? window.getTranslation(statusKey) : order.orderStatus;
    const currency = window.getTranslation ? window.getTranslation('currency') : 'KWD';

    const shipping = order.shippingAddress;

    // Calculate totals - use server values when available
    const subtotal = order.subtotal || order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCost = order.shippingCost != null ? order.shippingCost : 2.0;
    const promoDiscount = (order.promoCode && order.promoCode.totalDiscount) ? order.promoCode.totalDiscount : (order.discount || 0);

    // WhatsApp cancel/return for detail view
    let actionBtnHtml = '';
    const isDelivered = order.orderStatus === 'delivered';
    const isCancellable = ['confirmed', 'packed', 'processing'].includes(order.orderStatus);
    const itemNames = order.items.map(i => i.name).join(', ');
    const totalVal = parseFloat(order.total).toFixed(3);

    if (isDelivered && order.deliveredAt) {
        const daysSince = Math.floor((Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60 * 24));
        const daysLeft = 14 - daysSince;
        const msg = encodeURIComponent('Hello ART\u00c9VA Maison,\n\nI would like to return/exchange:\n\nOrder #: ' + order.orderNumber + '\nItems: ' + itemNames + '\nTotal: ' + totalVal + ' KWD\n\nReason: ');
        if (daysSince <= 14) {
            actionBtnHtml = '<div style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border-light);">' +
                '<a href="https://api.whatsapp.com/send?phone=' + (window.ARTEVA_SOCIAL && window.ARTEVA_SOCIAL.whatsappNumber || '96550683207') + '&text=' + msg + '" target="_blank" rel="noopener" style="display:block;text-align:center;background:#25d366;color:#fff;padding:12px;border-radius:6px;text-decoration:none;font-weight:500;">' +
                '\u21a9 Return / Exchange (' + daysLeft + ' days remaining)</a></div>';
        } else {
            actionBtnHtml = '<div style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border-light);">' +
                '<span style="display:block;text-align:center;background:#e5e7eb;color:#9ca3af;padding:12px;border-radius:6px;font-weight:500;">' +
                '\ud83d\udeab Return Period Expired (14 days)</span></div>';
        }
    } else if (isCancellable) {
        const msg = encodeURIComponent('Hello ART\u00c9VA Maison,\n\nI would like to cancel:\n\nOrder #: ' + order.orderNumber + '\nItems: ' + itemNames + '\nTotal: ' + totalVal + ' KWD\n\nReason: ');
        actionBtnHtml = '<div style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border-light);">' +
            '<a href="https://api.whatsapp.com/send?phone=' + (window.ARTEVA_SOCIAL && window.ARTEVA_SOCIAL.whatsappNumber || '96550683207') + '&text=' + msg + '" target="_blank" rel="noopener" style="display:block;text-align:center;background:#ef4444;color:#fff;padding:12px;border-radius:6px;text-decoration:none;font-weight:500;">' +
            '\u2715 Cancel Order via WhatsApp</a></div>';
    }

    // Track order button — all except pending and cancelled
    let trackBtnHtml = '';
    if (order.orderStatus !== 'pending' && order.orderStatus !== 'cancelled') {
        trackBtnHtml = '<div style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border-light);">' +
            '<a href="track-order.html?order=' + order.orderNumber + '" class="btn-view-order" style="display: block; text-align: center; background: #10b981; color: #fff; padding: 12px; border-radius: 6px; text-decoration: none; font-weight: 500;">' +
            '\ud83d\udccd Track Your Order</a></div>';
    }

    ordersList.innerHTML =
        '<div class="order-details-container">' +
            '<div class="order-card" style="margin-bottom: var(--space-6);">' +
                '<div class="order-header">' +
                    '<span class="order-id">Order #' + order.orderNumber + '</span>' +
                    '<div class="order-header-info">' +
                        '<span class="order-date">' + date + '</span>' +
                        '<span class="order-status ' + order.orderStatus.toLowerCase() + '">' + statusLabel + '</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="orders-layout-details" style="display:grid; grid-template-columns: 2fr 1fr; gap: var(--space-6);">' +
                '<div class="order-card p-6">' +
                    '<h3 style="margin-bottom: var(--space-4); border-bottom: 1px solid var(--border-light); padding-bottom: var(--space-2);">Items</h3>' +
                    '<div class="order-items-list" style="display: flex; flex-direction: column; gap: var(--space-4);">' +
                        order.items.map(function(item) {
                            var originalUnit = parseFloat(item.price).toFixed(3);
                            var originalTotal = parseFloat(item.price * item.quantity).toFixed(3);
                            var itemDiscount = null;
                            if (order.promoCode && order.promoCode.discounts) {
                                itemDiscount = order.promoCode.discounts.find(function(d) {
                                    var dProd = (d.product && d.product._id) ? d.product._id : (d.product || '');
                                    var iProd = (item.product && item.product._id) ? item.product._id : (item.product || item._id || '');
                                    return String(dProd) === String(iProd);
                                });
                            }
                            var priceHtml;
                            var promoLabelHtml = '';
                            if (itemDiscount) {
                                var discountedUnit = ((item.price * item.quantity - itemDiscount.discountAmount) / item.quantity).toFixed(3);
                                var discountedTotal = (item.price * item.quantity - itemDiscount.discountAmount).toFixed(3);
                                promoLabelHtml = '<div style="color: #059669; font-size: 11px; font-weight: 600; margin-top: 4px;">🏷️ Promo: ' + order.promoCode.code + ' (-' + parseFloat(itemDiscount.discountAmount).toFixed(3) + ' KWD)</div>';
                                priceHtml = '<div style="font-size: var(--fs-sm); color: var(--text-muted);">' +
                                                'Unit: <span style="text-decoration: line-through;">' + originalUnit + ' ' + currency + '</span> ' +
                                                '<span style="color: #059669; font-weight: 600;">' + discountedUnit + ' ' + currency + '</span>' +
                                            '</div>' +
                                            '<div style="font-weight: 500; margin-top: 4px;">' +
                                                'Total: <span style="text-decoration: line-through; color: var(--text-muted); font-size: var(--fs-sm);">' + originalTotal + ' ' + currency + '</span> ' +
                                                '<span style="color: #059669; font-weight: 600;">' + discountedTotal + ' ' + currency + '</span>' +
                                            '</div>';
                            } else {
                                priceHtml = '<div style="font-size: var(--fs-sm); color: var(--text-muted);">' +
                                                'Unit: ' + originalUnit + ' ' + currency +
                                            '</div>' +
                                            '<div style="font-weight: 500; margin-top: 4px;">' +
                                                'Total: ' + originalTotal + ' ' + currency +
                                            '</div>';
                            }
                            return '<div class="order-item" style="display: flex; gap: var(--space-4); align-items: center;">' +
                                '<div class="item-img" style="width: 60px; height: 60px; border: 1px solid var(--border-light); border-radius: var(--radius-sm); overflow: hidden;">' +
                                    '<img src="' + (item.image || 'assets/images/logo.png') + '" style="width: 100%; height: 100%; object-fit: cover;">' +
                                '</div>' +
                                '<div class="item-info" style="flex: 1;">' +
                                    '<div style="font-weight: 500;">' + item.name + '</div>' +
                                    '<div style="color: var(--text-muted); font-size: var(--fs-sm);">' + 'Qty: ' + item.quantity + '</div>' +
                                    promoLabelHtml +
                                '</div>' +
                                '<div class="item-price" style="text-align: right;">' +
                                    priceHtml +
                                '</div>' +
                            '</div>';
                        }).join('') +
                    '</div>' +
                '</div>' +
                '<div style="display: flex; flex-direction: column; gap: var(--space-6);">' +
                    '<div class="order-card" style="padding: var(--space-4);">' +
                        '<h3 style="font-size: var(--fs-lg); margin-bottom: var(--space-3);">Shipping Address</h3>' +
                        '<p style="color: var(--text-secondary); font-size: var(--fs-sm); line-height: 1.6;">' +
                            shipping.street + '<br>' +
                            shipping.city + '<br>' +
                            (shipping.country || 'Kuwait') + '<br>' +
                            'Phone: ' + shipping.phone +
                        '</p>' +
                    '</div>' +
                    '<div class="order-card" style="padding: var(--space-4);">' +
                        '<h3 style="font-size: var(--fs-lg); margin-bottom: var(--space-3);">Summary</h3>' +
                        '<div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2);">' +
                            '<span>Subtotal</span>' +
                            '<span>' + subtotal.toFixed(3) + ' ' + currency + '</span>' +
                        '</div>' +
                        '<div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2);">' +
                            '<span>Shipping</span>' +
                            '<span>' + (shippingCost > 0 ? shippingCost.toFixed(3) + ' ' + currency : 'Free') + '</span>' +
                        '</div>' +
                        (order.promoCode && order.promoCode.code ?
                            '<div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2); color: #059669; font-style: italic;">' +
                                '<span>Promo Code: ' + order.promoCode.code + '</span>' +
                                '<span>-' + parseFloat(promoDiscount).toFixed(3) + ' ' + currency + '</span>' +
                            '</div>' : '') +
                        '<div style="padding-top: var(--space-2); border-top: 1px solid var(--border-light); margin-bottom: var(--space-2);"></div>' +
                        '<div style="display: flex; justify-content: space-between; font-weight: bold; font-size: var(--fs-lg);">' +
                            '<span>Total</span>' +
                            '<span>' + parseFloat(order.total).toFixed(3) + ' ' + currency + '</span>' +
                        '</div>' +
                        '<div style="margin-top: var(--space-2); font-size: var(--fs-sm); color: var(--text-muted);">' +
                            'Payment: ' + (order.paymentMethod ? order.paymentMethod.toUpperCase() : 'N/A') +
                        '</div>' +
                        trackBtnHtml +
                        actionBtnHtml +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

    // Add responsive check for mobile
    if (window.innerWidth < 768) {
        var detailsGrid = document.querySelector('.orders-layout-details');
        if (detailsGrid) detailsGrid.style.gridTemplateColumns = '1fr';
    }
}

function renderOrders(orders) {
    const ordersList = document.getElementById('ordersList');

    if (!orders || orders.length === 0) {
        ordersList.innerHTML = '<p>You haven\'t placed any orders yet.</p>';
        return;
    }

    ordersList.innerHTML = orders.map(function(order) {
        const date = new Date(order.createdAt).toLocaleDateString(
            document.documentElement.lang === 'ar' ? 'ar-KW' : 'en-US',
            { year: 'numeric', month: 'long', day: 'numeric' }
        );

        const statusKey = 'status_' + order.orderStatus.toLowerCase();
        const statusLabel = window.getTranslation ? window.getTranslation(statusKey) : order.orderStatus;
        const viewDetailsText = window.getTranslation ? window.getTranslation('view_details') : 'View Details';
        const totalText = window.getTranslation ? window.getTranslation('total') : 'Total';
        const orderNumText = window.getTranslation ? window.getTranslation('order_number') : 'Order #';
        const total = parseFloat(order.total).toFixed(3);
        const currency = window.getTranslation ? window.getTranslation('currency') : 'KWD';

        const previewItems = order.items.slice(0, 4);
        const remainingCount = order.items.length - 4;

        // WhatsApp cancel/return button logic
        let whatsappBtn = '';
        const isDelivered = order.orderStatus === 'delivered';
        const isCancellable = ['confirmed', 'packed', 'processing'].includes(order.orderStatus);
        const itemNames = order.items.map(function(i) { return i.name; }).join(', ');

        if (isDelivered && order.deliveredAt) {
            const daysSince = Math.floor((Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60 * 24));
            const daysLeft = 14 - daysSince;
            const msg = encodeURIComponent('Hello ART\u00c9VA Maison,\n\nI would like to return/exchange:\n\nOrder #: ' + order.orderNumber + '\nItems: ' + itemNames + '\nTotal: ' + total + ' KWD\n\nReason: ');
            if (daysSince <= 14) {
                whatsappBtn = '<a href="https://api.whatsapp.com/send?phone=' + (window.ARTEVA_SOCIAL && window.ARTEVA_SOCIAL.whatsappNumber || '96550683207') + '&text=' + msg + '" target="_blank" rel="noopener" class="btn-view-order" style="background:#25d366;color:#fff;font-size:12px;">\u21a9 Return (' + daysLeft + 'd left)</a>';
            } else {
                whatsappBtn = '<span class="btn-view-order" style="background:#e5e7eb;color:#9ca3af;cursor:not-allowed;font-size:11px;">Return Expired</span>';
            }
        } else if (isCancellable) {
            const msg = encodeURIComponent('Hello ART\u00c9VA Maison,\n\nI would like to cancel:\n\nOrder #: ' + order.orderNumber + '\nItems: ' + itemNames + '\nTotal: ' + total + ' KWD\n\nReason: ');
            whatsappBtn = '<a href="https://api.whatsapp.com/send?phone=' + (window.ARTEVA_SOCIAL && window.ARTEVA_SOCIAL.whatsappNumber || '96550683207') + '&text=' + msg + '" target="_blank" rel="noopener" class="btn-view-order" style="background:#ef4444;color:#fff;font-size:12px;">\u2715 Cancel</a>';
        }

        // Track order — show for all except pending and cancelled
        let trackBtn = '';
        if (order.orderStatus !== 'pending' && order.orderStatus !== 'cancelled') {
            trackBtn = '<a href="track-order.html?order=' + order.orderNumber + '" class="btn-view-order" style="background:#10b981;color:#fff;">\ud83d\udccd Track</a>';
        }

        return '<div class="order-card">' +
            '<div class="order-header">' +
                '<span class="order-id">' + orderNumText + ' ' + order.orderNumber + '</span>' +
                '<div class="order-header-info">' +
                    '<span class="order-date">' + date + '</span>' +
                    '<span class="order-status ' + order.orderStatus.toLowerCase() + '">' + statusLabel + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="order-body">' +
                '<div class="order-items-preview">' +
                    previewItems.map(function(item) {
                        return '<div class="order-item-thumb">' +
                            '<img src="' + (item.image || 'assets/images/logo.png') + '" alt="' + item.name + '" title="' + item.name + ' x' + item.quantity + '">' +
                        '</div>';
                    }).join('') +
                    (remainingCount > 0 ? '<div class="order-item-thumb" style="display:flex;align-items:center;justify-content:center;background:#f8f9fa;"><span style="font-weight:bold;color:var(--text-secondary);">+' + remainingCount + '</span></div>' : '') +
                '</div>' +
                '<div class="order-footer">' +
                    '<div class="order-total">' + totalText + ': ' + total + ' ' + currency + '</div>' +
                    '<div class="order-actions" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;">' +
                        '<a href="receipt.html?order=' + encodeURIComponent(order.orderNumber) + '&token=' + encodeURIComponent(order.trackingToken || '') + '" target="_blank" class="btn-view-order" style="background:#fff;color:var(--text-secondary);border:1px solid var(--border-light);">Receipt</a>' +
                        trackBtn +
                        whatsappBtn +
                        '<a href="orders.html?id=' + order._id + '" class="btn-view-order">' + viewDetailsText + '</a>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
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
        html += '<button onclick="loadOrders(' + (pagination.page - 1) + ')" class="page-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>';
    } else {
        html += '<button class="page-btn" disabled><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>';
    }

    // Page numbers
    for (let i = 1; i <= pagination.pages; i++) {
        if (i === pagination.page) {
            html += '<button class="page-btn active">' + i + '</button>';
        } else {
            html += '<button onclick="loadOrders(' + i + ')" class="page-btn">' + i + '</button>';
        }
    }

    if (pagination.page < pagination.pages) {
        html += '<button onclick="loadOrders(' + (pagination.page + 1) + ')" class="page-btn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>';
    } else {
        html += '<button class="page-btn" disabled><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>';
    }

    container.innerHTML = html;
}
