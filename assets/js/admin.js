/**
 * ARTEVA Maison - Admin Dashboard Logic v3
 * Full rewrite: search, real-time notifications, drivers tab, mobile support
 */

// ==========================================
// Image URL Resolution Helper
// ==========================================
function resolveImageUrl(url, fallback) {
    if (!url) return fallback || 'assets/images/products/placeholder.png';
    if (url.startsWith('http')) return url;
    const backendOrigin = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '').replace('/api', '');
    return backendOrigin + url;
}

// ==========================================
// Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const user = AuthAPI.getUser();
    if (!AuthAPI.isLoggedIn() || !user || (user.role !== 'admin' && user.role !== 'owner')) {
        window.location.href = 'account.html';
        return;
    }

    // Owner has full access to all sections (highest privilege)
    // No restrictions on sidebar for owner

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

        // console.log('Admin Dashboard v4 Initialized');
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

    // console.log('🔌 Initializing Socket.io connection to:', backendUrl);

    socket = io(backendUrl, {
        transports: ['websocket', 'polling'],
        withCredentials: true
    });

    socket.on('connect', () => {
        // console.log('🔌 Connected to real-time updates');
        socket.emit('join_admin_room');
    });

    socket.on('order_status_update', (data) => {
        // console.log('Order update:', data);
        refreshActiveSection();
    });

    // Listen for admin-specific order status updates
    socket.on('admin_order_status_update', (data) => {
        // console.log('📦 Admin order status update:', data);

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
        // console.log('🆕 New order received:', data);

        // Use new notification system if available
        if (typeof handleNewOrderNotification === 'function') {
            handleNewOrderNotification(data);
        } else {
            // Fallback to old method
            playNotificationSound();
        }
        showToast('New Order!', `Order #${data.orderNumber || 'Unknown'} received`, 'order');

        // Update badge
        const badge = document.getElementById('newOrderBadge');
        if (badge) {
            const count = parseInt(badge.textContent || '0') + 1;
            badge.textContent = count;
            badge.classList.remove('hidden');
        }

        // Sync bottom nav badge
        const bottomBadge = document.getElementById('bottomNavOrderBadge');
        if (bottomBadge) {
            const count = parseInt(bottomBadge.textContent || '0') + 1;
            bottomBadge.textContent = count;
            bottomBadge.classList.remove('hidden');
        }

        refreshActiveSection();
    });

    // Listen for email campaign completion (background emails finished)
    socket.on('email_campaign_complete', (data) => {
        const sentText = window.getTranslation ? window.getTranslation('campaign_sent') : 'sent';
        const failedText = window.getTranslation ? window.getTranslation('campaign_failed') : 'failed';
        const completeText = window.getTranslation ? window.getTranslation('campaign_complete') : 'Campaign complete';
        showToast(completeText, `${data.sent} ${sentText}, ${data.failed} ${failedText}`, data.failed > 0 ? 'error' : 'success');
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
            switchToSection(targetId);

            closeMobileSidebar();
            window.location.hash = targetId;

            // Sync bottom nav
            syncBottomNav(targetId);
        });
    });

    // Bottom navigation handlers
    initBottomNav();
}

function switchToSection(targetId) {
    switch (targetId) {
        case 'dashboard': loadDashboard(); break;
        case 'products': loadProducts(); break;
        case 'categories':
            if (typeof initCategoriesManagement === 'function') {
                initCategoriesManagement();
            }
            break;
        case 'orders':
            loadOrders();
            // Clear badges
            const badge = document.getElementById('newOrderBadge');
            if (badge) { badge.textContent = '0'; badge.classList.add('hidden'); }
            const bottomBadge = document.getElementById('bottomNavOrderBadge');
            if (bottomBadge) { bottomBadge.textContent = '0'; bottomBadge.classList.add('hidden'); }
            break;
        case 'users': loadUsers(); break;
        case 'drivers': loadDrivers(); break;
        case 'settings': loadSettings(); break;
        case 'analytics': loadAnalytics(); break;
    }
}

function initBottomNav() {
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    const sections = document.querySelectorAll('.admin-section');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');

    bottomNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.getAttribute('data-section');
            if (!sectionId) return;

            // Update bottom nav active state
            bottomNavItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Show section
            sections.forEach(s => s.classList.add('hidden'));
            const target = document.getElementById(sectionId);
            if (target) target.classList.remove('hidden');

            // Sync sidebar links
            sidebarLinks.forEach(l => {
                l.classList.remove('active');
                if (l.getAttribute('href') === `#${sectionId}`) {
                    l.classList.add('active');
                }
            });

            // Load data
            switchToSection(sectionId);
            window.location.hash = sectionId;
        });
    });
}

function syncBottomNav(sectionId) {
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        }
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
            const user = AuthAPI.getUser();

            document.getElementById('statMembers').textContent = totalUsers;
            document.getElementById('statProducts').textContent = totalProducts;
            document.getElementById('statOrders').textContent = totalOrders;

            // Revenue handling
            const revenueCard = document.querySelector('.admin-stat-card:has(#statRevenue)');
            const revenueValue = document.getElementById('statRevenue');

            if (user.role === 'owner') {
                // Show revenue card for owner
                if (revenueCard) revenueCard.style.display = '';

                // Check if revenue is unlocked
                if (typeof isRevenueUnlocked === 'function' && isRevenueUnlocked()) {
                    // Show actual revenue
                    if (revenueValue) {
                        revenueValue.textContent = totalRevenue.toFixed(3) + ' KWD';
                        revenueValue.style.filter = 'none';
                    }
                } else {
                    // Keep blurred
                    if (revenueValue) {
                        revenueValue.textContent = '•••••';
                        revenueValue.style.filter = 'blur(8px)';
                    }
                }
            } else {
                // Hide revenue for non-owners
                if (revenueCard) revenueCard.style.display = 'none';
            }

            window.dashboardOrders = recentOrders;
            renderRecentOrders(recentOrders);

            // Initialize revenue protection after dashboard loads
            if (user.role === 'owner' && typeof initRevenueProtection === 'function') {
                setTimeout(() => initRevenueProtection(), 100);
            }
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
            <td><img src="${resolveImageUrl(p.images[0]?.url)}" class="product-thumb" alt="${p.name}" onerror="this.src='assets/images/products/placeholder.png';"></td>
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

            // Collect additional categories
            const additionalCats = [];
            document.querySelectorAll('#additionalCategoriesContainer input[type="checkbox"]:checked').forEach(cb => {
                additionalCats.push(cb.value);
            });
            formData.set('additionalCategories', JSON.stringify(additionalCats));

            // Add images to delete
            if (productImagesToDelete.length > 0) {
                formData.append('imagesToDelete', JSON.stringify(productImagesToDelete));
            }

            // Get primary image URL
            const primaryImageItem = document.querySelector('.existing-image-item.primary');
            if (primaryImageItem) {
                const primaryImageUrl = primaryImageItem.getAttribute('data-image-url');
                formData.append('primaryImageUrl', primaryImageUrl);
            }

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
                productImagesToDelete = []; // Reset
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

            // Populate additional categories checkboxes
            const addCatContainer = document.getElementById('additionalCategoriesContainer');
            if (addCatContainer) {
                addCatContainer.innerHTML = response.data.map(cat => `
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 14px; padding: 4px 8px; border-radius: 6px; background: var(--admin-surface-3); border: 1px solid var(--admin-border); color: var(--admin-text);">
                        <input type="checkbox" value="${cat._id}" style="accent-color: #c9a962;">
                        ${cat.name}
                    </label>
                `).join('');
            }
        }
    } catch (err) {
        console.error('Failed to load categories', err);
    }
}

// ==========================================
// Product Image Management
// ==========================================
let productImagesToDelete = []; // Track images to delete

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

            // Check additional categories
            const addCatIds = (p.additionalCategories || []).map(ac => typeof ac === 'object' ? ac._id : ac);
            document.querySelectorAll('#additionalCategoriesContainer input[type="checkbox"]').forEach(cb => {
                cb.checked = addCatIds.includes(cb.value);
            });

            // Display existing images with delete buttons
            displayExistingProductImages(p.images || []);

            // Reset images to delete array
            productImagesToDelete = [];

            productModal.classList.remove('hidden');
        }
    } catch (err) {
        showToast('Error', 'Could not load product', 'error');
    }
};

function displayExistingProductImages(images) {
    const container = document.getElementById('existingProductImages');
    if (!container) return;

    if (!images || images.length === 0) {
        container.innerHTML = '<p style="color: #999; font-size: 14px;">No images uploaded yet</p>';
        return;
    }

    container.innerHTML = images.map((img, index) => `
        <div class="existing-image-item ${img.isPrimary ? 'primary' : ''}" data-image-url="${img.url}">
            <img src="${resolveImageUrl(img.url)}" alt="Product image ${index + 1}" onerror="this.src='assets/images/products/placeholder.png'">
            ${img.isPrimary ? '<span class="primary-badge">Primary</span>' : ''}
            <button type="button" class="delete-image-btn" onclick="deleteProductImage('${img.url}')" title="Delete image">
                ✕
            </button>
            ${!img.isPrimary ? `<button type="button" class="set-primary-btn" onclick="setPrimaryProductImage('${img.url}')">Set Primary</button>` : ''}
        </div>
    `).join('');
}

window.deleteProductImage = (imageUrl) => {
    if (!confirm('Delete this image?')) return;

    // Add to delete list
    if (!productImagesToDelete.includes(imageUrl)) {
        productImagesToDelete.push(imageUrl);
    }

    // Remove from display
    const imageItem = document.querySelector(`.existing-image-item[data-image-url="${imageUrl}"]`);
    if (imageItem) {
        imageItem.remove();
    }

    // Check if container is empty
    const container = document.getElementById('existingProductImages');
    if (container && container.children.length === 0) {
        container.innerHTML = '<p style="color: #999; font-size: 14px;">No images remaining</p>';
    }

    showToast('Info', 'Image will be deleted when you save', 'info');
};

window.setPrimaryProductImage = (imageUrl) => {
    // Update UI to show new primary
    document.querySelectorAll('.existing-image-item').forEach(item => {
        item.classList.remove('primary');
        const badge = item.querySelector('.primary-badge');
        if (badge) badge.remove();

        const setPrimaryBtn = item.querySelector('.set-primary-btn');
        if (setPrimaryBtn) setPrimaryBtn.style.display = 'block';
    });

    const selectedItem = document.querySelector(`.existing-image-item[data-image-url="${imageUrl}"]`);
    if (selectedItem) {
        selectedItem.classList.add('primary');
        selectedItem.insertAdjacentHTML('afterbegin', '<span class="primary-badge">Primary</span>');
        const setPrimaryBtn = selectedItem.querySelector('.set-primary-btn');
        if (setPrimaryBtn) setPrimaryBtn.style.display = 'none';
    }

    showToast('Info', 'Primary image updated', 'info');
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
    const mainImg = resolveImageUrl(product.images[0]?.url);
    const viewProductImage = document.getElementById('viewProductImage');
    viewProductImage.src = mainImg;
    viewProductImage.onerror = function () {
        this.src = 'assets/images/products/placeholder.png';
    };

    document.getElementById('viewProductGallery').innerHTML = product.images.map(img => `
        <img src="${resolveImageUrl(img.url)}" onclick="document.getElementById('viewProductImage').src='${resolveImageUrl(img.url)}'" alt="Gallery" onerror="this.src='assets/images/products/placeholder.png';">
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
                <img src="${resolveImageUrl(item.image)}" class="product-thumb" style="width: 36px; height: 36px;" onerror="this.src='assets/images/products/placeholder.png';">
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
        trackDriverSocket = io(Config.SOCKET_URL());
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
    } catch (err) {
        // Silently fail - driver dropdown will show "Select Driver"
    }
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
        // console.log('Order not found in current list, reloading...');
        loadOrders();
        return;
    }

    // Update the order status in the array
    order.orderStatus = newStatus;

    // Find the row in the table
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) {
        // console.log('Table body not found');
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
        // console.log('Row not found in table, reloading...');
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

    const currentUser = AuthAPI.getUser();
    const isOwner = currentUser && currentUser.role === 'owner';

    tbody.innerHTML = users.map(user => `
        <tr>
            <td><strong>${user.name}</strong></td>
            <td>${user.email}</td>
            <td>
                <select onchange="updateUserRole('${user._id}', this.value)" class="admin-select" ${user.role === 'owner' && !isOwner ? 'disabled' : ''}>
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    <option value="driver" ${user.role === 'driver' ? 'selected' : ''}>Driver</option>
                    ${isOwner ? `<option value="owner" ${user.role === 'owner' ? 'selected' : ''}>Owner</option>` : ''}
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
    const imageInput = document.getElementById('emailImages');
    const imagePreview = document.getElementById('emailImagePreview');

    // Image preview handler
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            imagePreview.innerHTML = '';
            const files = Array.from(e.target.files);

            files.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = document.createElement('img');
                    img.src = event.target.result;
                    img.style.width = '100px';
                    img.style.height = '100px';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '8px';
                    img.style.border = '2px solid #ddd';
                    imagePreview.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Sending...';
            btn.disabled = true;

            try {
                const formData = new FormData();
                formData.append('subject', form.subject.value);
                formData.append('message', form.message.value);
                formData.append('recipientType', form.recipientType.value);

                // Add images if any
                const images = imageInput.files;
                for (let i = 0; i < images.length; i++) {
                    formData.append('images', images[i]);
                }

                await AdminAPI.sendEmailWithImages(formData);
                showToast('Sent', 'Campaign emails sent!', 'success');
                form.reset();
                imagePreview.innerHTML = '';
            } catch (err) {
                showToast('Error', 'Failed to send emails', 'error');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    }
}


// ==========================================
// Category Management
// ==========================================
let allCategories = [];
let categoryImageToDelete = false;

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('arteva_token')}`
            }
        });
        const data = await response.json();

        if (data.success) {
            allCategories = data.data;
            renderCategoriesTable(allCategories);

            // Also update category dropdown in product form
            updateCategoryDropdown();

            // Clear search
            const search = document.getElementById('categorySearch');
            if (search) search.value = '';
        }
    } catch (err) {
        console.error('Failed to load categories:', err);
        showToast('Error', 'Failed to load categories', 'error');
    }
}

function updateCategoryDropdown() {
    const select = document.getElementById('categorySelect');
    if (!select) return;

    const selectedValue = select.value;
    let options = '<option value="">Select Category</option>';
    allCategories.forEach(cat => {
        options += `<option value="${cat._id}">${cat.name}</option>`;
    });
    select.innerHTML = options;
    if (selectedValue) select.value = selectedValue;
}

function renderCategoriesTable(categories) {
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;

    if (categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--admin-text-muted);">No categories found</td></tr>';
        return;
    }

    tbody.innerHTML = categories.map(cat => `
        <tr>
            <td><img src="${cat.image || 'assets/images/products/placeholder.png'}" class="product-thumb" alt="${cat.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" onerror="this.src='assets/images/products/placeholder.png'"></td>
            <td><strong>${cat.name}</strong></td>
            <td>${cat.nameAr || '-'}</td>
            <td><code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 12px;">${cat.slug}</code></td>
            <td><span class="status-badge ${cat.isActive ? 'confirmed' : 'cancelled'}">${cat.isActive ? 'Active' : 'Inactive'}</span></td>
            <td onclick="event.stopPropagation()">
                <button class="admin-btn-icon" onclick="editCategory('${cat._id}')" title="Edit">✏️</button>
                <button class="admin-btn-icon delete" onclick="deleteCategory('${cat._id}')" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join('');
}

window.openAddCategoryModal = () => {
    const modal = document.getElementById('categoryModal');
    const form = document.getElementById('categoryForm');
    if (!form) return;

    form.reset();
    document.getElementById('categoryModalTitle').textContent = 'Add Category';
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryImagePreview').style.display = 'none';

    // Clear existing image display
    const existingContainer = document.getElementById('existingCategoryImage');
    if (existingContainer) {
        existingContainer.innerHTML = '';
        existingContainer.style.display = 'block';
    }

    categoryImageToDelete = false;

    modal.classList.remove('hidden');
};

window.closeCategoryModal = () => {
    const modal = document.getElementById('categoryModal');
    if (modal) modal.classList.add('hidden');
};

window.editCategory = async (id) => {
    try {
        const category = allCategories.find(c => c._id === id);
        if (!category) return;

        document.getElementById('categoryId').value = category._id;
        document.getElementById('categoryModalTitle').textContent = 'Edit Category';

        const form = document.getElementById('categoryForm');
        if (!form) return;

        form.name.value = category.name;
        form.nameAr.value = category.nameAr || '';
        form.description.value = category.description || '';
        form.isActive.checked = category.isActive;

        // Display existing image with delete option
        displayExistingCategoryImage(category.image);

        // Reset delete flag
        categoryImageToDelete = false;

        // Hide preview
        document.getElementById('categoryImagePreview').style.display = 'none';

        document.getElementById('categoryModal').classList.remove('hidden');
    } catch (err) {
        console.error('Edit category error:', err);
        showToast('Error', 'Could not load category', 'error');
    }
};

function displayExistingCategoryImage(imageUrl) {
    const container = document.getElementById('existingCategoryImage');
    if (!container) return;

    if (!imageUrl) {
        container.innerHTML = '<p style="color: #999; font-size: 14px;">No image uploaded yet</p>';
        return;
    }

    container.innerHTML = `
        <div class="existing-image-item category-image">
            <img src="${imageUrl}" alt="Category image" onerror="this.src='assets/images/products/placeholder.png'">
            <button type="button" class="delete-image-btn" onclick="deleteCategoryImage()" title="Delete image">
                ✕
            </button>
        </div>
    `;
}

window.deleteCategoryImage = () => {
    if (!confirm('Delete this image?')) return;

    categoryImageToDelete = true;

    // Remove from display
    const container = document.getElementById('existingCategoryImage');
    if (container) {
        container.innerHTML = '<p style="color: #999; font-size: 14px;">Image will be deleted when you save</p>';
    }

    showToast('Info', 'Image will be deleted when you save', 'info');
};

window.previewCategoryImage = (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('categoryImagePreview');
            preview.src = e.target.result;
            preview.style.display = 'block';

            // Hide existing image when new one is selected
            const existingContainer = document.getElementById('existingCategoryImage');
            if (existingContainer) {
                existingContainer.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    }
};

window.deleteCategory = async (id) => {
    if (!confirm('Delete this category? Products in this category will need to be reassigned.')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('arteva_token')}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showToast('Deleted', 'Category removed successfully', 'success');
            loadCategories();
        } else {
            throw new Error(data.message || 'Failed to delete');
        }
    } catch (err) {
        console.error('Delete category error:', err);
        showToast('Error', err.message || 'Failed to delete category', 'error');
    }
};

// Category form submit handler
document.addEventListener('DOMContentLoaded', () => {
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = document.getElementById('categoryId').value;
            const formData = new FormData(e.target);

            formData.set('isActive', e.target.isActive.checked);

            // Add delete flag if image should be deleted
            if (categoryImageToDelete) {
                formData.append('deleteImage', 'true');
            }

            try {
                const url = id
                    ? `${API_BASE_URL}/categories/${id}`
                    : `${API_BASE_URL}/categories`;

                const response = await fetch(url, {
                    method: id ? 'PUT' : 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('arteva_token')}`
                    },
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    showToast('Success', id ? 'Category updated' : 'Category created', 'success');
                    closeCategoryModal();
                    loadCategories();
                    categoryImageToDelete = false;
                } else {
                    throw new Error(data.message || 'Operation failed');
                }
            } catch (err) {
                console.error('Save category error:', err);
                showToast('Error', err.message || 'Operation failed', 'error');
            }
        });
    }

    // Category search
    const categorySearch = document.getElementById('categorySearch');
    if (categorySearch) {
        categorySearch.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = allCategories.filter(c =>
                c.name.toLowerCase().includes(q) ||
                (c.nameAr && c.nameAr.includes(q)) ||
                (c.slug && c.slug.toLowerCase().includes(q))
            );
            renderCategoriesTable(filtered);
        });
    }
});

// ==========================================
// Product Analytics
// ==========================================
let analyticsLoaded = false;

async function loadAnalytics() {
    const tbody = document.getElementById('analyticsTableBody');
    if (tbody && !analyticsLoaded) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">Loading analytics...</td></tr>';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/analytics/product-views`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('arteva_token')}`
            }
        });
        const result = await response.json();

        if (result.success) {
            renderAnalytics(result.data);
            analyticsLoaded = true;
        } else {
            throw new Error(result.message || 'Failed to load analytics');
        }
    } catch (err) {
        console.error('Failed to load analytics:', err);
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">Failed to load analytics. Please try again.</td></tr>';
        }
    }
}

function renderAnalytics(data) {
    const { products, summary } = data;

    const totalViewsEl = document.getElementById('statTotalViews');
    const topProductEl = document.getElementById('statTopProduct');
    const avgViewsEl = document.getElementById('statAvgViews');
    const trackedProductsEl = document.getElementById('statTrackedProducts');

    if (totalViewsEl) totalViewsEl.textContent = summary.totalViews.toLocaleString();
    if (topProductEl) topProductEl.textContent = summary.topProduct;
    if (avgViewsEl) avgViewsEl.textContent = summary.averageViews.toLocaleString();
    if (trackedProductsEl) trackedProductsEl.textContent = summary.totalProducts.toLocaleString();

    const tbody = document.getElementById('analyticsTableBody');
    if (!tbody) return;

    if (!products || products.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="5">
                <div class="analytics-empty">
                    <div class="analytics-empty-icon">\ud83d\udcca</div>
                    <div class="analytics-empty-text">No product views recorded yet.<br>Views will appear here as customers browse products.</div>
                </div>
            </td></tr>`;
        return;
    }

    const maxViews = products[0]?.viewCount || 1;

    tbody.innerHTML = products.map((product, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? ` top-${rank}` : '';
        const views = product.viewCount || 0;
        const percentage = Math.round((views / maxViews) * 100);
        const categoryName = product.category?.name || 'Uncategorized';

        let imageUrl = 'assets/images/products/placeholder.png';
        if (product.images && product.images.length > 0) {
            const primary = product.images.find(img => img.isPrimary);
            imageUrl = resolveImageUrl((primary || product.images[0]).url, imageUrl);
        }

        return `
            <tr>
                <td><span class="analytics-rank${rankClass}">${rank}</span></td>
                <td>
                    <div class="analytics-product-cell">
                        <img src="${imageUrl}" class="analytics-product-thumb" alt="${product.name}" onerror="this.src='assets/images/products/placeholder.png';">
                        <span class="analytics-product-name">${product.name}</span>
                    </div>
                </td>
                <td>${categoryName}</td>
                <td class="analytics-view-count">${views.toLocaleString()}</td>
                <td>
                    <div class="analytics-bar-wrap">
                        <div class="analytics-bar-track">
                            <div class="analytics-bar-fill" style="width: ${percentage}%;"></div>
                        </div>
                        <span class="analytics-bar-percent">${percentage}%</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
