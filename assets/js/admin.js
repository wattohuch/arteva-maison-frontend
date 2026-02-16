/**
 * ARTEVA Maison - Admin Dashboard Logic v3
 * Full rewrite: search, real-time notifications, drivers tab, mobile support
 */

// ==========================================
// Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const user = AuthAPI.getUser();
    if (!AuthAPI.isLoggedIn() || !user || user.role !== 'admin') {
        window.location.href = 'account.html';
        return;
    }

    try {
        // Initialize language
        initLanguage();

        initUI();
        initNavigation();
        initSearch();
        initMobileSidebar();

        const hash = window.location.hash.substring(1);
        if (hash) {
            const link = document.querySelector(`.sidebar-link[href="#${hash}"]`);
            if (link) link.click();
            else loadDashboard();
        } else {
            loadDashboard();
        }

        loadCategories();
        initSocket();

        // Auto-refresh dashboard every 30s
        setInterval(() => {
            if (!document.getElementById('dashboard').classList.contains('hidden')) {
                loadDashboard();
            }
        }, 30000);

        console.log('Admin Dashboard v4 Initialized');
    } catch (err) {
        console.error('Initialization error:', err);
        showToast('Error', 'Dashboard initialization failed', 'error');
    }
});

// ==========================================
// Language Support
// ==========================================
function initLanguage() {
    // Check for saved language preference
    const savedLang = localStorage.getItem('site_lang') || 'en';
    if (window.setLanguage) {
        window.setLanguage(savedLang);
    }

    // Update language switcher buttons
    const langBtnEn = document.getElementById('lang-en');
    const langBtnAr = document.getElementById('lang-ar');

    if (langBtnEn && langBtnAr) {
        // Set active state
        if (savedLang === 'en') {
            langBtnEn.classList.add('active');
            langBtnAr.classList.remove('active');
        } else {
            langBtnAr.classList.add('active');
            langBtnEn.classList.remove('active');
        }

        // Add click handlers
        langBtnEn.addEventListener('click', () => {
            if (window.setLanguage) {
                window.setLanguage('en');
                langBtnEn.classList.add('active');
                langBtnAr.classList.remove('active');
                updateAdminTranslations();
            }
        });

        langBtnAr.addEventListener('click', () => {
            if (window.setLanguage) {
                window.setLanguage('ar');
                langBtnAr.classList.add('active');
                langBtnEn.classList.remove('active');
                updateAdminTranslations();
            }
        });
    }

    // Initial translation update
    setTimeout(() => updateAdminTranslations(), 100);
}

function updateAdminTranslations() {
    if (!window.getTranslation) return;

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = window.getTranslation(key);
        if (translation) {
            if (el.tagName === 'INPUT' && el.type === 'text' || el.tagName === 'TEXTAREA') {
                // Don't update if input has value (user might be typing)
                if (!el.value || el.hasAttribute('data-i18n-placeholder')) {
                    el.placeholder = translation;
                }
            } else if (el.hasAttribute('data-i18n-placeholder')) {
                el.placeholder = translation;
            } else {
                el.textContent = translation;
            }
        }
    });

    // Update placeholder attributes
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const translation = window.getTranslation(key);
        if (translation) {
            el.placeholder = translation;
        }
    });

    // Update select options
    document.querySelectorAll('select option[data-i18n]').forEach(option => {
        const key = option.getAttribute('data-i18n');
        const translation = window.getTranslation(key);
        if (translation) {
            option.textContent = translation;
        }
    });
}

// ==========================================
// Toast Notifications
// ==========================================
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';

    const icons = { info: '📋', success: '✅', error: '❌', order: '🛍️' };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || '📋'}</span>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    // Auto-dismiss after 6s
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 6000);
}

// ==========================================
// Notification Sound
// ==========================================
function playNotificationSound() {
    // Use Web Audio API for a crisp chime
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1); // C#6
        osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.2); // E6

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
        // Fallback: try the audio element
        const audio = document.getElementById('notificationSound');
        if (audio) audio.play().catch(() => { });
    }
}

// ==========================================
// Socket.IO - Real-time
// ==========================================
let socket;
function initSocket() {
    // Connect to backend URL (remove /api suffix)
    const baseUrl = window.API_BASE_URL || (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://arteva-maison-backend-gy1x.onrender.com/api');
    const backendUrl = baseUrl.replace('/api', '');

    console.log('🔌 Initializing Socket.io connection to:', backendUrl);

    socket = io(backendUrl, {
        transports: ['websocket', 'polling'],
        withCredentials: true
    });

    socket.on('connect', () => {
        console.log('🔌 Connected to real-time updates');
        socket.emit('join_admin_room');
    });

    socket.on('order_status_update', (data) => {
        console.log('Order update:', data);
        refreshActiveSection();
    });

    // Listen for admin-specific order status updates
    socket.on('admin_order_status_update', (data) => {
        console.log('📦 Admin order status update:', data);

        // If orders section is visible, update the specific order row
        const ordersSection = document.getElementById('orders');
        if (ordersSection && !ordersSection.classList.contains('hidden')) {
            // Try to find order by orderId first, then by orderNumber
            const orderIdentifier = data.orderId || data.orderNumber;
            if (orderIdentifier) {
                updateOrderRow(orderIdentifier, data.status);
            }
        }
    });

    socket.on('new_order', (data) => {
        console.log('🆕 New order received:', data);
        playNotificationSound();
        showToast('New Order!', `Order #${data.orderNumber || 'Unknown'} received`, 'order');

        // Update badge
        const badge = document.getElementById('newOrderBadge');
        if (badge) {
            const count = parseInt(badge.textContent || '0') + 1;
            badge.textContent = count;
            badge.classList.remove('hidden');
        }

        refreshActiveSection();
    });
}

function refreshActiveSection() {
    if (!document.getElementById('dashboard').classList.contains('hidden')) loadDashboard();
    if (!document.getElementById('orders').classList.contains('hidden')) loadOrders();
}

// ==========================================
// Mobile Sidebar
// ==========================================
function initMobileSidebar() {
    const toggle = document.getElementById('mobileToggle');
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggle) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

// ==========================================
// Navigation
// ==========================================
function initNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-link');
    const sections = document.querySelectorAll('.admin-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            if (!href || href === '#') {
                // Logout
                if (link.id === 'logoutBtn') {
                    AuthAPI.logout();
                }
                return;
            }

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const targetId = href.substring(1);
            sections.forEach(s => s.classList.add('hidden'));
            const target = document.getElementById(targetId);
            if (target) target.classList.remove('hidden');

            // Load data
            switch (targetId) {
                case 'dashboard': loadDashboard(); break;
                case 'products': loadProducts(); break;
                case 'orders':
                    loadOrders();
                    // Clear badge
                    const badge = document.getElementById('newOrderBadge');
                    if (badge) { badge.textContent = '0'; badge.classList.add('hidden'); }
                    break;
                case 'users': loadUsers(); break;
                case 'drivers': loadDrivers(); break;
                case 'settings': loadSettings(); break;
            }

            closeMobileSidebar();
            window.location.hash = targetId;
        });
    });
}

// ==========================================
// Search
// ==========================================
let allProducts = [];
let allOrders = [];
let allUsers = [];
let allDrivers = [];

function initSearch() {
    const productSearch = document.getElementById('productSearch');
    const orderSearch = document.getElementById('orderSearch');
    const userSearch = document.getElementById('userSearch');
    const driverSearch = document.getElementById('driverSearch');

    if (productSearch) {
        productSearch.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = allProducts.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.nameAr && p.nameAr.includes(q)) ||
                (p.category?.name || '').toLowerCase().includes(q)
            );
            renderProductsTable(filtered, true);
        });
    }

    if (orderSearch) {
        orderSearch.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = allOrders.filter(o =>
                (o.orderNumber || '').toLowerCase().includes(q) ||
                (o.user?.name || '').toLowerCase().includes(q) ||
                (o.shippingAddress?.firstName || '').toLowerCase().includes(q) ||
                (o.shippingAddress?.lastName || '').toLowerCase().includes(q) ||
                (o.orderStatus || '').toLowerCase().includes(q)
            );
            renderOrdersTable(filtered, true);
        });
    }

    if (userSearch) {
        userSearch.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = allUsers.filter(u =>
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.role.toLowerCase().includes(q)
            );
            renderUsersTable(filtered, true);
        });
    }

    if (driverSearch) {
        driverSearch.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = allDrivers.filter(d =>
                d.name.toLowerCase().includes(q) ||
                d.email.toLowerCase().includes(q)
            );
            renderDriversTable(filtered, true);
        });
    }
}

// ==========================================
// Dashboard
// ==========================================
async function loadDashboard() {
    try {
        const response = await AdminAPI.getStats();
        if (response.success) {
            const { totalUsers, totalProducts, totalOrders, totalRevenue, recentOrders } = response.data;

            document.getElementById('statMembers').textContent = totalUsers;
            document.getElementById('statProducts').textContent = totalProducts;
            document.getElementById('statOrders').textContent = totalOrders;
            document.getElementById('statRevenue').textContent = totalRevenue.toFixed(3) + ' KWD';

            window.dashboardOrders = recentOrders;
            renderRecentOrders(recentOrders);
        }
    } catch (err) {
        console.error('Failed to load stats:', err);
    }
}

function renderRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersTable');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 32px; color: var(--admin-text-muted);">No recent orders</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr onclick="window.viewOrder('${order._id}')" style="cursor: pointer;">
            <td>#${order.orderNumber}</td>
            <td>${order.user ? order.user.name : 'Guest'}</td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td>${order.total.toFixed(3)} KWD</td>
            <td><span class="status-badge ${order.orderStatus}">${order.orderStatus.replace(/_/g, ' ')}</span></td>
        </tr>
    `).join('');
}

// ==========================================
// Products
// ==========================================
async function loadProducts() {
    try {
        const response = await AdminAPI.getProducts();
        if (response.success) {
            allProducts = response.data;
            renderProductsTable(allProducts);
            // Clear search
            const search = document.getElementById('productSearch');
            if (search) search.value = '';
        }
    } catch (err) {
        console.error('Failed to load products:', err);
    }
}

function renderProductsTable(products, isFiltered = false) {
    if (!isFiltered) window.allProductsView = products;

    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    if (products.length === 0) {
        const noProductsText = window.getTranslation ? window.getTranslation('admin_no_products') : 'No products found';
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--admin-text-muted);">${noProductsText}</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr onclick="window.viewProductDetails('${p._id}')">
            <td><img src="${p.images[0]?.url || 'assets/images/placeholder.png'}" class="product-thumb" alt="${p.name}" onerror="if(typeof handleImageError==='function') handleImageError(this); else this.src='assets/images/placeholder.png';"></td>
            <td><strong>${p.name}</strong></td>
            <td>${p.category?.name || '-'}</td>
            <td>${p.price.toFixed(3)}</td>
            <td>${p.stock}</td>
            <td onclick="event.stopPropagation()">
                <button class="admin-btn-icon" onclick="editProduct('${p._id}')" title="Edit">✏️</button>
                <button class="admin-btn-icon delete" onclick="deleteProduct('${p._id}')" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// ==========================================
// Products UI
// ==========================================
let productModal, productForm;

function initUI() {
    productModal = document.getElementById('productModal');
    productForm = document.getElementById('productForm');

    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('productId').value;
            const formData = new FormData(productForm);
            formData.set('isFeatured', productForm.isFeatured.checked);
            formData.set('isNewArrival', productForm.isNewArrival.checked);
            formData.set('isComingSoon', productForm.isComingSoon.checked);

            try {
                if (id) {
                    await AdminAPI.updateProduct(id, formData);
                    showToast('Success', 'Product updated', 'success');
                } else {
                    await AdminAPI.createProduct(formData);
                    showToast('Success', 'Product created', 'success');
                }
                closeProductModal();
                loadProducts();
            } catch (err) {
                showToast('Error', err.message || 'Operation failed', 'error');
            }
        });
    }
}

window.openAddProductModal = () => {
    if (!productForm || !productModal) initUI();
    if (!productForm) return;

    productForm.reset();
    document.getElementById('modalTitle').textContent = 'Add New Product';
    document.getElementById('productId').value = '';

    const catSelect = document.getElementById('categorySelect');
    if (catSelect) catSelect.value = '';

    productModal.classList.remove('hidden');
};

window.closeProductModal = () => {
    if (productModal) productModal.classList.add('hidden');
};

async function loadCategories() {
    const select = document.getElementById('categorySelect');
    if (!select) return;

    const selectedValue = select.value;

    try {
        const response = await CategoriesAPI.getAll();
        if (response.success) {
            let options = '<option value="">Select Category</option>';
            response.data.forEach(cat => {
                options += `<option value="${cat._id}">${cat.name}</option>`;
            });
            select.innerHTML = options;
            if (selectedValue) select.value = selectedValue;
        }
    } catch (err) {
        console.error('Failed to load categories', err);
    }
}

window.editProduct = async (id) => {
    try {
        const response = await ProductsAPI.getById(id);
        if (response.success) {
            const p = response.data;
            document.getElementById('productId').value = p._id;
            document.getElementById('modalTitle').textContent = 'Edit Product';

            if (document.getElementById('categorySelect').options.length <= 1) {
                await loadCategories();
            }

            if (productForm.name) productForm.name.value = p.name;
            if (productForm.nameAr) productForm.nameAr.value = p.nameAr || '';
            if (productForm.price) productForm.price.value = p.price;
            if (productForm.stock) productForm.stock.value = p.stock;
            if (productForm.sku) productForm.sku.value = p.sku || '';
            if (productForm.description) productForm.description.value = p.description || '';
            if (productForm.descriptionAr) productForm.descriptionAr.value = p.descriptionAr || '';
            if (productForm.category) {
                productForm.category.value = p.category?._id || p.category || '';
            }
            if (productForm.isFeatured) productForm.isFeatured.checked = !!p.isFeatured;
            if (productForm.isNewArrival) productForm.isNewArrival.checked = !!p.isNewArrival;
            if (productForm.isComingSoon) productForm.isComingSoon.checked = !!p.isComingSoon;

            productModal.classList.remove('hidden');
        }
    } catch (err) {
        showToast('Error', 'Could not load product', 'error');
    }
};

window.deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
        await AdminAPI.deleteProduct(id);
        showToast('Deleted', 'Product removed', 'success');
        loadProducts();
    } catch (err) {
        showToast('Error', 'Failed to delete product', 'error');
    }
};

window.viewProductDetails = (id) => {
    const product = allProducts.find(p => p._id === id);
    if (!product) return;

    const modal = document.getElementById('productViewModal');
    const mainImg = product.images[0]?.url || 'assets/images/placeholder.png';
    const viewProductImage = document.getElementById('viewProductImage');
    viewProductImage.src = mainImg;
    viewProductImage.onerror = function () {
        if (typeof handleImageError === 'function') handleImageError(this);
        else this.src = 'assets/images/placeholder.png';
    };

    document.getElementById('viewProductGallery').innerHTML = product.images.map(img => `
        <img src="${img.url}" onclick="document.getElementById('viewProductImage').src='${img.url}'" alt="Gallery" onerror="if(typeof handleImageError==='function') handleImageError(this); else this.src='assets/images/placeholder.png';">
    `).join('');

    document.getElementById('viewProductName').textContent = product.name;
    document.getElementById('viewProductNameAr').textContent = product.nameAr || '';
    document.getElementById('viewProductPrice').textContent = product.price.toFixed(3) + ' KWD';
    document.getElementById('viewProductStock').textContent = product.stock;
    document.getElementById('viewProductCategory').textContent = product.category?.name || '-';
    document.getElementById('viewProductSku').textContent = product.sku || '-';
    document.getElementById('viewProductDescription').textContent = product.description || 'No description';
    document.getElementById('viewProductDescriptionAr').textContent = product.descriptionAr || 'لا يوجد وصف';

    document.getElementById('viewProductFeatured').style.display = product.isFeatured ? 'inline-block' : 'none';
    document.getElementById('viewProductNew').style.display = product.isNewArrival ? 'inline-block' : 'none';

    modal.classList.remove('hidden');
};

window.closeProductViewModal = () => {
    document.getElementById('productViewModal').classList.add('hidden');
};

// ==========================================
// Orders
// ==========================================
let orderModal;

async function loadOrders() {
    try {
        const response = await AdminAPI.getOrders();
        if (response.success) {
            allOrders = response.data;
            renderOrdersTable(allOrders);
            populateDriverSelects();
            const search = document.getElementById('orderSearch');
            if (search) search.value = '';
        }
    } catch (err) {
        console.error('Failed to load orders:', err);
    }
}

function renderOrdersTable(orders, isFiltered = false) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    const noOrdersText = window.getTranslation ? window.getTranslation('admin_no_orders') : 'No orders found';
    const selectDriverText = window.getTranslation ? window.getTranslation('admin_select_driver') : 'Select Driver';
    const unlockText = window.getTranslation ? window.getTranslation('admin_unlock') : 'Unlock';
    const viewText = window.getTranslation ? window.getTranslation('admin_view') : 'View';
    const trackText = window.getTranslation ? window.getTranslation('admin_track') : 'Track';

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: var(--admin-text-muted);">${noOrdersText}</td></tr>`;
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const isDelivered = order.orderStatus === 'delivered';
        const disabledAttr = isDelivered ? 'disabled' : '';
        const unlockBtn = isDelivered
            ? `<button class="admin-btn-icon" onclick="window.enableOrderEdit('${order._id}', this)" title="Unlock">🔓</button>`
            : '';

        return `
        <tr>
            <td><strong>${order.orderNumber}</strong></td>
            <td>${order.user ? order.user.name : (order.shippingAddress ? order.shippingAddress.firstName + ' ' + order.shippingAddress.lastName : 'Guest')}</td>
            <td>${order.total.toFixed(3)} KWD</td>
            <td>
                <select id="status-${order._id}" onchange="window.updateOrderStatus('${order._id}', this.value)" class="admin-select" ${disabledAttr}>
                    ${['pending', 'confirmed', 'processing', 'packed', 'handed_over', 'out_for_delivery', 'delivered', 'cancelled'].map(s =>
            `<option value="${s}" ${order.orderStatus === s ? 'selected' : ''}>${s.replace(/_/g, ' ')}</option>`
        ).join('')}
                </select>
            </td>
            <td>
                <select id="driver-${order._id}" onchange="window.assignDriver('${order._id}', this.value)" class="admin-select" ${disabledAttr}>
                    <option value="">${selectDriverText}</option>
                    ${order.deliveryPilot ? `<option value="${order.deliveryPilot._id}" selected>${order.deliveryPilot.name}</option>` : ''}
                </select>
            </td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td onclick="event.stopPropagation()">
                ${unlockBtn}
                ${order.deliveryPilot && (order.orderStatus === 'out_for_delivery' || order.orderStatus === 'handed_over') ? `<button class="admin-btn-icon" onclick="window.trackDriver('${order._id}', '${order.orderNumber}')" title="${window.getTranslation ? window.getTranslation('admin_track_driver') : 'Track Driver'}">🚗</button>` : ''}
                <button class="admin-btn-icon" onclick="window.viewOrder('${order._id}')" title="${viewText}">👁️</button>
            </td>
        </tr>`;
    }).join('');
}

window.enableOrderEdit = (orderId, btn) => {
    const statusSelect = document.getElementById(`status-${orderId}`);
    const driverSelect = document.getElementById(`driver-${orderId}`);
    if (statusSelect) statusSelect.disabled = false;
    if (driverSelect) driverSelect.disabled = false;
    if (btn) btn.style.display = 'none';
};

window.viewOrder = (orderId) => {
    const order = allOrders.find(o => o._id === orderId) || (window.dashboardOrders || []).find(o => o._id === orderId);
    if (!order) return;

    if (!orderModal) orderModal = document.getElementById('orderModal');

    document.getElementById('modalOrderNumber').textContent = '#' + order.orderNumber;

    const userName = order.user ? order.user.name : (order.shippingAddress ? order.shippingAddress.firstName + ' ' + order.shippingAddress.lastName : 'Guest');
    const userEmail = order.user ? order.user.email : (order.contactEmail || 'N/A');
    const userPhone = order.shippingAddress ? order.shippingAddress.phone : (order.contactPhone || 'N/A');

    document.getElementById('modalCustomerName').textContent = userName;
    document.getElementById('modalCustomerEmail').textContent = userEmail;
    document.getElementById('modalCustomerPhone').textContent = userPhone;
    document.getElementById('modalPaymentMethod').textContent = order.paymentMethod || 'COD';
    document.getElementById('modalDriverName').textContent = order.deliveryPilot ? order.deliveryPilot.name : 'Unassigned';

    if (order.shippingAddress) {
        const addr = order.shippingAddress;
        const lines = [addr.addressLine1, addr.addressLine2, `${addr.city}, ${addr.state || ''} ${addr.zipCode || ''}`, addr.country].filter(Boolean).join('<br>');
        document.getElementById('modalShippingAddress').innerHTML = lines;
    } else {
        document.getElementById('modalShippingAddress').textContent = 'No shipping address';
    }

    document.getElementById('modalOrderItems').innerHTML = order.items.map(item => `
        <tr>
            <td style="display: flex; align-items: center; gap: 10px;">
                <img src="${item.image || 'assets/images/placeholder.png'}" class="product-thumb" style="width: 36px; height: 36px;" onerror="if(typeof handleImageError==='function') handleImageError(this); else this.src='assets/images/placeholder.png';">
                <span>${item.name}</span>
            </td>
            <td style="text-align: center;">${item.price.toFixed(3)}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">${(item.price * item.quantity).toFixed(3)}</td>
        </tr>
    `).join('');

    document.getElementById('modalSubtotal').textContent = order.total.toFixed(3);
    document.getElementById('modalTotal').textContent = order.total.toFixed(3);

    // Add Action Buttons
    const footer = document.querySelector('#orderModal .admin-modal-footer');
    if (footer) {
        const trackDriverBtn = order.deliveryPilot && (order.orderStatus === 'out_for_delivery' || order.orderStatus === 'handed_over')
            ? `<button class="admin-btn secondary" onclick="window.trackDriver('${order._id}', '${order.orderNumber}')">🚗 Track Driver</button>`
            : '';
        footer.innerHTML = `
            <button class="admin-btn secondary" onclick="window.open('receipt.html?id=${order._id}', '_blank')">📄 Receipt</button>
            <button class="admin-btn secondary" onclick="window.open('order-tracking.html?order=${order.orderNumber}', '_blank')">📍 Track</button>
            ${trackDriverBtn}
            <button class="admin-btn" onclick="closeOrderModal()">Close</button>
        `;
    }

    orderModal.classList.remove('hidden');
};

window.closeOrderModal = () => {
    if (!orderModal) orderModal = document.getElementById('orderModal');
    if (orderModal) orderModal.classList.add('hidden');
};

// ==========================================
// Track Driver
// ==========================================
let trackDriverMap = null;
let trackDriverMarker = null;
let trackDriverSocket = null;
let currentTrackedOrderNumber = null;
let currentTrackedPilotId = null;

window.trackDriver = async (orderId, orderNumber) => {
    const order = allOrders.find(o => o._id === orderId);
    if (!order || !order.deliveryPilot) {
        showToast('Error', 'Driver not assigned to this order', 'error');
        return;
    }

    currentTrackedOrderNumber = orderNumber;
    currentTrackedPilotId = order.deliveryPilot._id;

    const modal = document.getElementById('trackDriverModal');
    modal.classList.remove('hidden');

    // Update modal info
    document.getElementById('trackDriverOrderNumber').textContent = '#' + orderNumber;
    document.getElementById('trackDriverName').textContent = order.deliveryPilot.name || '-';
    document.getElementById('trackDriverPhone').textContent = order.deliveryPilot.phone || '-';
    document.getElementById('trackDriverStatus').textContent = order.orderStatus.replace(/_/g, ' ');

    // Initialize map
    setTimeout(() => {
        if (!trackDriverMap) {
            const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' });
            const googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '© Google Maps' });

            trackDriverMap = L.map('trackDriverMap', {
                center: [29.3759, 47.9774], // Kuwait City default
                zoom: 13,
                layers: [googleHybrid]
            });

            L.control.layers({ "Satellite": googleHybrid, "Streets": osm }).addTo(trackDriverMap);
        }

        // Set destination marker if shipping address has coordinates
        if (order.shippingAddress?.coordinates?.lat && order.shippingAddress?.coordinates?.lng) {
            const destLat = order.shippingAddress.coordinates.lat;
            const destLng = order.shippingAddress.coordinates.lng;

            // Remove existing destination marker
            trackDriverMap.eachLayer(layer => {
                if (layer instanceof L.Marker && layer.options.icon?.options?.html?.includes('🏠')) {
                    trackDriverMap.removeLayer(layer);
                }
            });

            const destMarker = L.marker([destLat, destLng], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="background: #ef4444; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 18px;">🏠</div>',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                })
            }).addTo(trackDriverMap);
            destMarker.bindPopup('Delivery Address').openPopup();

            // Fit map to show both markers if driver location exists
            if (trackDriverMarker) {
                const group = new L.featureGroup([trackDriverMarker, destMarker]);
                trackDriverMap.fitBounds(group.getBounds().pad(0.1));
            } else {
                trackDriverMap.setView([destLat, destLng], 15);
            }
        }

        trackDriverMap.invalidateSize();
    }, 300);

    // Initialize socket connection for real-time updates
    if (!trackDriverSocket) {
        trackDriverSocket = io();
    }

    // Join order room for location updates
    trackDriverSocket.emit('join_order_room', orderNumber);
    trackDriverSocket.emit('join_pilot_room', order.deliveryPilot._id);

    // Listen for location updates
    trackDriverSocket.off('delivery_location_update');
    trackDriverSocket.off('pilot_location');

    trackDriverSocket.on('delivery_location_update', (data) => {
        if (data.lat && data.lng) {
            updateDriverLocation(data.lat, data.lng);
        }
    });

    trackDriverSocket.on('pilot_location', (data) => {
        if (data.lat && data.lng) {
            updateDriverLocation(data.lat, data.lng);
        }
    });

    // Try to get current location from order
    try {
        // Use the global API_BASE_URL that's already defined at the top of the file
        const response = await fetch(`${API_BASE_URL}/delivery/track/${orderNumber}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('arteva_token')}`
            }
        });
        const result = await response.json();
        if (result.success && result.data?.deliveryLocation) {
            const loc = result.data.deliveryLocation;
            updateDriverLocation(loc.lat, loc.lng);
        }
    } catch (err) {
        console.error('Error fetching driver location:', err);
    }
};

function updateDriverLocation(lat, lng) {
    if (!trackDriverMap) return;

    // Remove existing driver marker
    if (trackDriverMarker) {
        trackDriverMap.removeLayer(trackDriverMarker);
    }

    // Add new driver marker
    trackDriverMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background: #10b981; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 18px;">🚗</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        })
    }).addTo(trackDriverMap);
    trackDriverMarker.bindPopup('Driver Location').openPopup();

    // Update coordinates display
    document.getElementById('trackDriverCoords').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    document.getElementById('trackDriverLastUpdate').textContent = new Date().toLocaleTimeString();

    // Fit map to show both markers if destination exists
    trackDriverMap.eachLayer(layer => {
        if (layer instanceof L.Marker && layer.options.icon?.options?.html?.includes('🏠')) {
            const group = new L.featureGroup([trackDriverMarker, layer]);
            trackDriverMap.fitBounds(group.getBounds().pad(0.1));
            return;
        }
    });
}

window.closeTrackDriverModal = () => {
    const modal = document.getElementById('trackDriverModal');
    modal.classList.add('hidden');

    // Leave socket rooms
    if (trackDriverSocket && currentTrackedOrderNumber) {
        trackDriverSocket.emit('leave_order_room', currentTrackedOrderNumber);
        if (currentTrackedPilotId) {
            trackDriverSocket.emit('leave_pilot_room', currentTrackedPilotId);
        }
    }

    currentTrackedOrderNumber = null;
    currentTrackedPilotId = null;
};

async function populateDriverSelects() {
    try {
        const response = await AdminAPI.getUsers();
        if (response.success) {
            const drivers = response.data.filter(u => u.role === 'driver');
            document.querySelectorAll('.admin-select[id^="driver-"]').forEach(select => {
                // Extract orderId from select id (format: "driver-<orderId>")
                const orderId = select.id.replace('driver-', '');
                // Find the order to get the currently assigned driver from DB data
                const order = allOrders.find(o => o._id === orderId);
                const assignedDriverId = order?.deliveryPilot?._id || '';

                const options = drivers.map(d =>
                    `<option value="${d._id}" ${d._id === assignedDriverId ? 'selected' : ''}>${d.name}</option>`
                ).join('');
                select.innerHTML = `<option value="">Select Driver</option>` + options;
            });
        }
    } catch (err) { /* quiet fail */ }
}

window.updateOrderStatus = async (id, status) => {
    try {
        await AdminAPI.updateOrderStatus(id, status);
        showToast('Updated', `Order status → ${status.replace(/_/g, ' ')}`, 'success');
    } catch (err) {
        showToast('Error', 'Failed to update status', 'error');
        loadOrders();
    }
};

window.assignDriver = async (orderId, driverId) => {
    if (!driverId) return;
    try {
        await AdminAPI.assignDriver(orderId, driverId);
        showToast('Assigned', 'Driver assigned to order', 'success');
    } catch (err) {
        showToast('Error', 'Failed to assign driver', 'error');
    }
};

/**
 * Update a specific order row in the table when status changes
 */
function updateOrderRow(orderIdentifier, newStatus) {
    // Find the order in allOrders array by orderId or orderNumber
    const order = allOrders.find(o => {
        if (orderIdentifier && typeof orderIdentifier === 'string') {
            return o._id === orderIdentifier || o.orderNumber === orderIdentifier;
        }
        return false;
    });

    if (!order) {
        // If order not found in current list, reload orders
        console.log('Order not found in current list, reloading...');
        loadOrders();
        return;
    }

    // Update the order status in the array
    order.orderStatus = newStatus;

    // Find the row in the table
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) {
        console.log('Table body not found');
        return;
    }

    const rows = tbody.querySelectorAll('tr');
    let targetRow = null;

    // Find the row containing this order by order number
    rows.forEach(row => {
        const orderNumCell = row.querySelector('td:first-child strong');
        if (orderNumCell && orderNumCell.textContent.trim() === order.orderNumber) {
            targetRow = row;
        }
    });

    if (targetRow) {
        // Update the status select dropdown
        const statusSelect = targetRow.querySelector(`select[id^="status-"]`);
        if (statusSelect) {
            const oldStatus = statusSelect.value;
            statusSelect.value = newStatus;

            // If status is 'delivered', disable the select and add unlock button
            if (newStatus === 'delivered') {
                statusSelect.disabled = true;

                // Check if unlock button exists, if not add it
                const actionsCell = targetRow.querySelector('td:last-child');
                if (actionsCell) {
                    const existingUnlockBtn = actionsCell.querySelector('button[onclick*="enableOrderEdit"]');
                    if (!existingUnlockBtn) {
                        const unlockBtn = document.createElement('button');
                        unlockBtn.className = 'admin-btn-icon';
                        unlockBtn.setAttribute('onclick', `window.enableOrderEdit('${order._id}', this)`);
                        unlockBtn.title = 'Unlock';
                        unlockBtn.textContent = '🔓';

                        // Insert before the view button
                        const viewBtn = actionsCell.querySelector('button[onclick*="viewOrder"]');
                        if (viewBtn) {
                            actionsCell.insertBefore(unlockBtn, viewBtn);
                        } else {
                            actionsCell.appendChild(unlockBtn);
                        }
                    }

                    // Remove track driver button if it exists
                    const trackBtn = actionsCell.querySelector('button[onclick*="trackDriver"]');
                    if (trackBtn) {
                        trackBtn.remove();
                    }
                }
            } else if (oldStatus === 'delivered' && newStatus !== 'delivered') {
                // If status changed from delivered to something else, enable the select
                statusSelect.disabled = false;
            }
        }

        // Add visual feedback with a brief highlight animation
        targetRow.style.transition = 'background-color 0.3s ease';
        targetRow.style.backgroundColor = '#e8f5e9';
        setTimeout(() => {
            targetRow.style.backgroundColor = '';
        }, 2000);

        // Show toast notification only if status actually changed
        if (order.orderStatus !== newStatus) {
            showToast('Status Updated', `Order ${order.orderNumber} is now ${newStatus.replace(/_/g, ' ')}`, 'success');
        }
    } else {
        // Row not found, reload the table
        console.log('Row not found in table, reloading...');
        loadOrders();
    }
}

// ==========================================
// Users
// ==========================================
async function loadUsers() {
    try {
        const response = await AdminAPI.getUsers();
        if (response.success) {
            allUsers = response.data;
            renderUsersTable(allUsers);
            const search = document.getElementById('userSearch');
            if (search) search.value = '';
        }
    } catch (err) {
        console.error('Failed to load users:', err);
    }
}

function renderUsersTable(users, isFiltered = false) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (users.length === 0) {
        const noUsersText = window.getTranslation ? window.getTranslation('admin_no_users') : 'No users found';
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 32px; color: var(--admin-text-muted);">${noUsersText}</td></tr>`;
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td><strong>${user.name}</strong></td>
            <td>${user.email}</td>
            <td>
                <select onchange="updateUserRole('${user._id}', this.value)" class="admin-select">
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    <option value="driver" ${user.role === 'driver' ? 'selected' : ''}>Driver</option>
                </select>
            </td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="admin-btn-icon delete" onclick="deleteUser('${user._id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

window.updateUserRole = async (id, role) => {
    try {
        await AdminAPI.updateUserRole(id, role);
        showToast('Updated', `User role → ${role}`, 'success');
    } catch (err) {
        showToast('Error', 'Failed to update role', 'error');
        loadUsers();
    }
};

window.deleteUser = async (id) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
        await AdminAPI.deleteUser(id);
        showToast('Deleted', 'User removed', 'success');
        loadUsers();
    } catch (err) {
        showToast('Error', 'Failed to delete user', 'error');
    }
};

// ==========================================
// Drivers
// ==========================================
async function loadDrivers() {
    try {
        const response = await AdminAPI.getUsers();
        if (response.success) {
            allDrivers = response.data.filter(u => u.role === 'driver');
            renderDriversTable(allDrivers);
            const search = document.getElementById('driverSearch');
            if (search) search.value = '';
        }
    } catch (err) {
        console.error('Failed to load drivers:', err);
    }
}

function renderDriversTable(drivers, isFiltered = false) {
    const tbody = document.getElementById('driversTableBody');
    if (!tbody) return;

    if (drivers.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6" style="text-align: center; padding: 48px;">
                <div style="color: var(--admin-text-muted);">
                    <div style="font-size: 36px; margin-bottom: 12px; opacity: 0.4;">🚗</div>
                    <p>${window.getTranslation ? window.getTranslation('admin_no_drivers') : 'No drivers found'}</p>
                    <p style="font-size: 12px; margin-top: 4px;">Assign the "driver" role to a user from the Users tab</p>
                </div>
            </td></tr>`;
        return;
    }

    tbody.innerHTML = drivers.map(driver => `
        <tr>
            <td><strong>${driver.name}</strong></td>
            <td>${driver.email}</td>
            <td>${driver.phone || '-'}</td>
            <td><span class="status-badge confirmed">Active</span></td>
            <td>-</td>
            <td>${new Date(driver.createdAt).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

// ==========================================
// Settings (Email Marketing)
// ==========================================
let settingsInitialized = false;
function loadSettings() {
    if (settingsInitialized) return;
    settingsInitialized = true;

    const form = document.getElementById('emailMarketingForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Sending...';
            btn.disabled = true;

            try {
                const data = {
                    subject: form.subject.value,
                    message: form.message.value,
                    recipientType: form.recipientType.value
                };
                await AdminAPI.sendEmail(data);
                showToast('Sent', 'Campaign emails sent!', 'success');
                form.reset();
            } catch (err) {
                showToast('Error', 'Failed to send emails', 'error');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    }
}
