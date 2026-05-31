/**
 * ARTÉVA Maison — Promo Codes Admin Panel
 * Full CRUD + product assignment + details modal + analytics
 */

(function () {
    'use strict';

    // ── Load promo codes when section becomes visible ──
    window.addEventListener('hashchange', function () {
        if (location.hash === '#promo-codes') loadPromoCodes();
    });
    document.addEventListener('DOMContentLoaded', function () {
        if (location.hash === '#promo-codes') loadPromoCodes();
    });

    const API = () => window.API_BASE_URL || (window.location.hostname === 'localhost'
        ? 'http://localhost:5000/api'
        : 'https://arteva-maison-backend-gy1x.onrender.com/api');
    const TOKEN = () => localStorage.getItem('arteva_token');
    const headers = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN()}`
    });

    let allPromoCodes = [];
    let allProducts = [];
    let currentPromoId = null;
    let currentFilter = 'all'; // 'all' | 'active' | 'expired'

    // ═══════════════════════════════════════════════════
    // LOAD & RENDER PROMO CODES LIST
    // ═══════════════════════════════════════════════════

    window.loadPromoCodes = async function () {
        try {
            const res = await fetch(`${API()}/promo-codes`, { headers: headers() });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            allPromoCodes = data.data || [];
            renderPromoTable();
            renderPromoStats();
            initFilterButtons();
        } catch (err) {
            console.error('[PROMO] Load error:', err);
            document.getElementById('promoCodesTableBody').innerHTML =
                `<tr><td colspan="8" style="text-align:center;padding:40px;color:#ef4444;">Failed to load promo codes</td></tr>`;
        }
    };

    function renderPromoStats() {
        const total = allPromoCodes.length;
        const active = allPromoCodes.filter(p => p.isActive && !p.isExpired).length;
        const expired = allPromoCodes.filter(p => p.isExpired || (!p.isActive)).length;
        const totalProducts = allPromoCodes.reduce((sum, p) => sum + (p.products?.length || 0), 0);

        document.getElementById('statTotalPromos').textContent = total;
        document.getElementById('statActivePromos').textContent = active;
        document.getElementById('statExpiredPromos').textContent = expired;
        document.getElementById('statTotalPromoProducts').textContent = totalProducts;
    }

    // ── Filter Buttons ──
    function initFilterButtons() {
        const container = document.getElementById('promoFilterBtns');
        if (!container || container.dataset.initialized) return;
        container.dataset.initialized = 'true';

        container.innerHTML = `
            <button class="admin-btn promo-filter-btn active" data-filter="all" style="padding:4px 14px;font-size:12px;border-radius:8px;">All</button>
            <button class="admin-btn promo-filter-btn" data-filter="active" style="padding:4px 14px;font-size:12px;border-radius:8px;">Active</button>
            <button class="admin-btn promo-filter-btn" data-filter="expired" style="padding:4px 14px;font-size:12px;border-radius:8px;">Expired</button>
        `;

        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.promo-filter-btn');
            if (!btn) return;
            container.querySelectorAll('.promo-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderPromoTable();
        });
    }

    function getFilteredPromos() {
        if (currentFilter === 'active') {
            return allPromoCodes.filter(p => p.isActive && !(p.isExpired || new Date(p.expiresAt) < new Date()));
        } else if (currentFilter === 'expired') {
            return allPromoCodes.filter(p => p.isExpired || new Date(p.expiresAt) < new Date() || !p.isActive);
        }
        return allPromoCodes;
    }

    function renderPromoTable() {
        const tbody = document.getElementById('promoCodesTableBody');
        const filtered = getFilteredPromos();

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--admin-text-muted);">${currentFilter === 'all' ? 'No promo codes yet. Create your first one!' : 'No ' + currentFilter + ' promo codes.'}</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(promo => {
            const isExpired = promo.isExpired || new Date(promo.expiresAt) < new Date();
            const isValid = promo.isActive && !isExpired;
            const statusBg = isValid ? '#d1fae5' : isExpired ? '#fee2e2' : '#fef3c7';
            const statusColor = isValid ? '#065f46' : isExpired ? '#991b1b' : '#92400e';
            const statusText = isValid ? 'Active' : isExpired ? 'Expired' : 'Disabled';

            const expiresDate = new Date(promo.expiresAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            });
            const expiresTime = new Date(promo.expiresAt).toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit'
            });

            const usageText = promo.maxUsage
                ? `${promo.usageCount || 0}/${promo.maxUsage}`
                : `${promo.usageCount || 0}`;

            // Discount summary
            const discountSummary = getDiscountSummary(promo);

            return `<tr>
                <td><code style="background:var(--admin-surface-2);padding:4px 10px;border-radius:6px;font-weight:700;letter-spacing:1px;font-size:13px;cursor:pointer;transition:background 0.15s;" onclick="openPromoDetailsModal('${promo._id}')" onmouseover="this.style.background='var(--admin-gold)';this.style.color='#000'" onmouseout="this.style.background='var(--admin-surface-2)';this.style.color=''">${promo.code}</code></td>
                <td>${promo.name}</td>
                <td><span style="display:inline-block;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:600;background:${statusBg};color:${statusColor};">${statusText}</span></td>
                <td><span style="font-size:12px;">${expiresDate}<br><span style="color:var(--admin-text-muted);">${expiresTime}</span></span></td>
                <td style="text-align:center;"><span style="font-weight:600;">${promo.products?.length || 0}</span></td>
                <td style="text-align:center;font-size:12px;color:var(--admin-text-muted);">${discountSummary}</td>
                <td style="text-align:center;">${usageText}${promo.perUserLimit ? '<br><span style="font-size:10px;color:var(--admin-text-muted);">' + promo.perUserLimit + '/user</span>' : ''}</td>
                <td>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <button class="admin-btn" style="padding:4px 10px;font-size:12px;" onclick="openPromoProductsModal('${promo._id}')">📦 Products</button>
                        <button class="admin-btn" style="padding:4px 10px;font-size:12px;" onclick="openEditPromoModal('${promo._id}')">✏️</button>
                        <button class="admin-btn" style="padding:4px 10px;font-size:12px;" onclick="togglePromoActive('${promo._id}', ${!promo.isActive})">${promo.isActive ? '⏸️' : '▶️'}</button>
                        <button class="admin-btn" style="padding:4px 10px;font-size:12px;color:#ef4444;" onclick="deletePromo('${promo._id}')">🗑️</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    function getDiscountSummary(promo) {
        if (!promo.products || promo.products.length === 0) return '<span style="color:var(--admin-text-muted);">—</span>';

        const types = new Set();
        let minVal = Infinity, maxVal = -Infinity;
        promo.products.forEach(pp => {
            types.add(pp.discountType);
            minVal = Math.min(minVal, pp.discountValue);
            maxVal = Math.max(maxVal, pp.discountValue);
        });

        if (types.size === 1) {
            const type = types.values().next().value;
            const suffix = type === 'percentage' ? '%' : ' KWD';
            if (minVal === maxVal) return `${minVal}${suffix} off`;
            return `${minVal}–${maxVal}${suffix} off`;
        }

        return 'Mixed';
    }

    // ═══════════════════════════════════════════════════
    // CREATE / EDIT PROMO CODE MODAL
    // ═══════════════════════════════════════════════════

    window.openCreatePromoModal = function () {
        document.getElementById('promoId').value = '';
        document.getElementById('promoCode').value = '';
        document.getElementById('promoName').value = '';
        document.getElementById('promoDescription').value = '';
        document.getElementById('promoMaxUsage').value = '0';
        document.getElementById('promoPerUserLimit').value = '0';
        document.getElementById('promoMaxQuantityPerOrder').value = '0';
        document.getElementById('promoModalTitle').textContent = 'Create Promo Code';
        document.getElementById('promoSubmitBtn').textContent = 'Create Promo Code';

        // Default expiry: 30 days from now
        const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        document.getElementById('promoExpiresAt').value = future.toISOString().slice(0, 16);

        document.getElementById('promoModal').classList.remove('hidden');
    };

    window.openEditPromoModal = function (promoId) {
        const promo = allPromoCodes.find(p => p._id === promoId);
        if (!promo) return;

        document.getElementById('promoId').value = promo._id;
        document.getElementById('promoCode').value = promo.code;
        document.getElementById('promoName').value = promo.name;
        document.getElementById('promoDescription').value = promo.description || '';
        document.getElementById('promoMaxUsage').value = promo.maxUsage || 0;
        document.getElementById('promoPerUserLimit').value = promo.perUserLimit || 0;
        document.getElementById('promoMaxQuantityPerOrder').value = promo.maxQuantityPerOrder || 0;
        document.getElementById('promoExpiresAt').value = new Date(promo.expiresAt).toISOString().slice(0, 16);
        document.getElementById('promoModalTitle').textContent = 'Edit Promo Code';
        document.getElementById('promoSubmitBtn').textContent = 'Save Changes';

        document.getElementById('promoModal').classList.remove('hidden');
    };

    window.closePromoModal = function () {
        document.getElementById('promoModal').classList.add('hidden');
    };

    // Form submit handler
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('promoForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('promoId').value;
                const payload = {
                    code: document.getElementById('promoCode').value,
                    name: document.getElementById('promoName').value,
                    description: document.getElementById('promoDescription').value,
                    expiresAt: document.getElementById('promoExpiresAt').value,
                    maxUsage: parseInt(document.getElementById('promoMaxUsage').value) || 0,
                    perUserLimit: parseInt(document.getElementById('promoPerUserLimit').value) || 0,
                    maxQuantityPerOrder: parseInt(document.getElementById('promoMaxQuantityPerOrder').value) || 0
                };

                try {
                    const url = id ? `${API()}/promo-codes/${id}` : `${API()}/promo-codes`;
                    const method = id ? 'PUT' : 'POST';
                    const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(payload) });
                    const data = await res.json();
                    if (!data.success) throw new Error(data.message);

                    closePromoModal();
                    await loadPromoCodes();
                    showToast(id ? 'Promo code updated!' : 'Promo code created!', 'success');
                } catch (err) {
                    showToast(err.message || 'Failed to save promo code', 'error');
                }
            });
        }
    });

    // ═══════════════════════════════════════════════════
    // PROMO CODE DETAILS MODAL
    // ═══════════════════════════════════════════════════

    window.openPromoDetailsModal = async function (promoId) {
        const detailsModal = document.getElementById('promoDetailsModal');
        if (!detailsModal) return;

        detailsModal.classList.remove('hidden');
        const content = document.getElementById('promoDetailsContent');
        content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--admin-text-muted);">Loading...</div>';

        try {
            const res = await fetch(`${API()}/promo-codes/${promoId}/stats`, { headers: headers() });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            const { promoCode: promo, stats, recentOrders } = data.data;

            const isExpired = promo.isExpired || new Date(promo.expiresAt) < new Date();
            const isValid = promo.isActive && !isExpired;
            const statusBg = isValid ? '#d1fae5' : isExpired ? '#fee2e2' : '#fef3c7';
            const statusColor = isValid ? '#065f46' : isExpired ? '#991b1b' : '#92400e';
            const statusText = isValid ? 'Active' : isExpired ? 'Expired' : 'Disabled';

            const expiresDate = new Date(promo.expiresAt).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            // Products table
            const productsHtml = (promo.products && promo.products.length > 0) ? promo.products.map(pp => {
                const product = pp.product;
                if (!product) return '';
                const originalPrice = product.price || 0;
                let finalPrice = originalPrice;
                if (pp.discountType === 'percentage') {
                    finalPrice = originalPrice * (1 - pp.discountValue / 100);
                } else {
                    finalPrice = Math.max(0, originalPrice - pp.discountValue);
                }
                const discountLabel = pp.discountType === 'percentage' ? `${pp.discountValue}% OFF` : `${pp.discountValue.toFixed(3)} KWD OFF`;
                return `<tr>
                    <td style="font-size:13px;">${product.name}</td>
                    <td style="font-size:13px;">${originalPrice.toFixed(3)} KWD</td>
                    <td style="font-size:13px;"><span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:6px;font-weight:600;font-size:11px;">${discountLabel}</span></td>
                    <td style="font-size:13px;font-weight:600;color:#059669;">${finalPrice.toFixed(3)} KWD</td>
                </tr>`;
            }).join('') : '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--admin-text-muted);">No products assigned</td></tr>';

            // Recent orders table
            const ordersHtml = (recentOrders && recentOrders.length > 0) ? recentOrders.map(order => {
                const discount = order.promoCode?.totalDiscount || 0;
                const paidBg = order.paymentStatus === 'paid' ? '#d1fae5' : '#fee2e2';
                const paidColor = order.paymentStatus === 'paid' ? '#065f46' : '#991b1b';
                const date = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return `<tr>
                    <td style="font-size:12px;">${order.orderNumber || '—'}</td>
                    <td style="font-size:12px;">${order.user?.name || '—'}</td>
                    <td style="font-size:12px;">${order.total?.toFixed(3) || '0.000'} KWD</td>
                    <td style="font-size:12px;color:#059669;font-weight:600;">-${discount.toFixed(3)} KWD</td>
                    <td style="font-size:12px;"><span style="background:${paidBg};color:${paidColor};padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;">${order.paymentStatus}</span></td>
                    <td style="font-size:12px;color:var(--admin-text-muted);">${date}</td>
                </tr>`;
            }).join('') : '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--admin-text-muted);">No orders have used this promo code yet</td></tr>';

            content.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
                    <div>
                        <code style="background:var(--admin-surface-2);padding:6px 16px;border-radius:8px;font-weight:700;letter-spacing:1.5px;font-size:18px;">${promo.code}</code>
                        <span style="display:inline-block;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:600;background:${statusBg};color:${statusColor};margin-left:10px;">${statusText}</span>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px;">
                    <div style="background:var(--admin-surface-2);padding:12px 16px;border-radius:10px;">
                        <div style="font-size:11px;color:var(--admin-text-muted);margin-bottom:4px;">Display Name</div>
                        <div style="font-weight:600;font-size:14px;">${promo.name}</div>
                    </div>
                    <div style="background:var(--admin-surface-2);padding:12px 16px;border-radius:10px;">
                        <div style="font-size:11px;color:var(--admin-text-muted);margin-bottom:4px;">Expires</div>
                        <div style="font-weight:500;font-size:13px;">${expiresDate}</div>
                    </div>
                    <div style="background:var(--admin-surface-2);padding:12px 16px;border-radius:10px;">
                        <div style="font-size:11px;color:var(--admin-text-muted);margin-bottom:4px;">Usage</div>
                        <div style="font-weight:600;font-size:14px;">${promo.usageCount || 0}${promo.maxUsage ? ' / ' + promo.maxUsage : ' (unlimited)'}</div>
                    </div>
                    <div style="background:var(--admin-surface-2);padding:12px 16px;border-radius:10px;">
                        <div style="font-size:11px;color:var(--admin-text-muted);margin-bottom:4px;">Per User Limit</div>
                        <div style="font-weight:600;font-size:14px;">${promo.perUserLimit || 'Unlimited'}</div>
                    </div>
                </div>

                ${promo.description ? `<div style="background:var(--admin-surface-2);padding:12px 16px;border-radius:10px;margin-bottom:20px;font-size:13px;color:var(--admin-text-muted);">${promo.description}</div>` : ''}

                <!-- Stats Cards -->
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px;">
                    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:14px;border-radius:10px;text-align:center;color:white;">
                        <div style="font-size:20px;font-weight:700;">${stats.totalOrders}</div>
                        <div style="font-size:10px;opacity:0.8;">Total Orders</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#065f46,#059669);padding:14px;border-radius:10px;text-align:center;color:white;">
                        <div style="font-size:20px;font-weight:700;">${stats.totalRevenue.toFixed(3)}</div>
                        <div style="font-size:10px;opacity:0.8;">Revenue (KWD)</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#92400e,#d97706);padding:14px;border-radius:10px;text-align:center;color:white;">
                        <div style="font-size:20px;font-weight:700;">${stats.totalDiscountGiven.toFixed(3)}</div>
                        <div style="font-size:10px;opacity:0.8;">Discount Given</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#581c87,#9333ea);padding:14px;border-radius:10px;text-align:center;color:white;">
                        <div style="font-size:20px;font-weight:700;">${stats.uniqueUsers}</div>
                        <div style="font-size:10px;opacity:0.8;">Unique Users</div>
                    </div>
                </div>

                <!-- Products -->
                <h4 style="margin-bottom:10px;font-size:14px;font-weight:600;">Products & Discounts</h4>
                <div style="overflow-x:auto;margin-bottom:24px;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:var(--admin-surface-2);">
                            <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;">Product</th>
                            <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;">Original Price</th>
                            <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;">Discount</th>
                            <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;">Final Price</th>
                        </tr></thead>
                        <tbody>${productsHtml}</tbody>
                    </table>
                </div>

                <!-- Recent Orders -->
                <h4 style="margin-bottom:10px;font-size:14px;font-weight:600;">Recent Orders Using This Code</h4>
                <div style="overflow-x:auto;max-height:300px;overflow-y:auto;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:var(--admin-surface-2);position:sticky;top:0;">
                            <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;">Order #</th>
                            <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;">Customer</th>
                            <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;">Total</th>
                            <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;">Discount</th>
                            <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;">Status</th>
                            <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;">Date</th>
                        </tr></thead>
                        <tbody>${ordersHtml}</tbody>
                    </table>
                </div>
            `;
        } catch (err) {
            content.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">Failed to load promo details: ${err.message}</div>`;
        }
    };

    window.closePromoDetailsModal = function () {
        const modal = document.getElementById('promoDetailsModal');
        if (modal) modal.classList.add('hidden');
    };

    // ═══════════════════════════════════════════════════
    // TOGGLE ACTIVE / DELETE
    // ═══════════════════════════════════════════════════

    window.togglePromoActive = async function (promoId, newActive) {
        try {
            const res = await fetch(`${API()}/promo-codes/${promoId}`, {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify({ isActive: newActive })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            await loadPromoCodes();
            showToast(newActive ? 'Promo code activated' : 'Promo code disabled', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to update', 'error');
        }
    };

    window.deletePromo = async function (promoId) {
        const promo = allPromoCodes.find(p => p._id === promoId);
        if (!confirm(`Delete promo code "${promo?.code || promoId}"? This cannot be undone.`)) return;

        try {
            const res = await fetch(`${API()}/promo-codes/${promoId}`, {
                method: 'DELETE', headers: headers()
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            await loadPromoCodes();
            showToast('Promo code deleted', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to delete', 'error');
        }
    };

    // ═══════════════════════════════════════════════════
    // PRODUCT ASSIGNMENT MODAL
    // ═══════════════════════════════════════════════════

    let allCategoriesForPromo = [];

    window.openPromoProductsModal = async function (promoId) {
        currentPromoId = promoId;
        const promo = allPromoCodes.find(p => p._id === promoId);
        if (!promo) return;

        document.getElementById('promoProductsTitle').textContent = `Products for "${promo.code}"`;
        document.getElementById('promoProductsModal').classList.remove('hidden');

        // Load all products for the search
        if (allProducts.length === 0) {
            try {
                const res = await fetch(`${API()}/products`, { headers: headers() });
                const data = await res.json();
                allProducts = data.data || data.products || [];
            } catch (err) {
                console.error('[PROMO] Products load error:', err);
            }
        }

        // Load categories for the browse-by-category tabs
        if (allCategoriesForPromo.length === 0) {
            try {
                const res = await fetch(`${API()}/categories`, { headers: headers() });
                const data = await res.json();
                allCategoriesForPromo = data.data || data.categories || [];
            } catch (err) {
                console.error('[PROMO] Categories load error:', err);
            }
        }

        renderPromoProducts(promo);
        setupProductSearch(promo);
        setupCategoryTabs(promo);
    };

    window.closePromoProductsModal = function () {
        document.getElementById('promoProductsModal').classList.remove('hidden');
        document.getElementById('promoProductsModal').classList.add('hidden');
        document.getElementById('promoProductSearchResults').style.display = 'none';
        document.getElementById('promoProductSearch').value = '';
        currentPromoId = null;
    };

    function renderPromoProducts(promo) {
        const tbody = document.getElementById('promoProductsTableBody');

        if (!promo.products || promo.products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--admin-text-muted);">No products assigned. Use the search above to add products.</td></tr>`;
            return;
        }

        tbody.innerHTML = promo.products.map(pp => {
            const product = pp.product;
            if (!product) return '';
            const originalPrice = product.price || 0;
            let finalPrice = originalPrice;
            if (pp.discountType === 'percentage') {
                finalPrice = originalPrice * (1 - pp.discountValue / 100);
            } else {
                finalPrice = Math.max(0, originalPrice - pp.discountValue);
            }

            const img = product.images?.[0]?.url || '';
            const imgHtml = img ? `<img src="${img}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;margin-right:8px;" alt="">` : '';

            return `<tr>
                <td><div style="display:flex;align-items:center;">${imgHtml}<span>${product.name}</span></div></td>
                <td>${originalPrice.toFixed(3)} KWD</td>
                <td>
                    <select onchange="updatePromoProductDiscount('${promo._id}', '${product._id}', this.value, null)" style="padding:4px 8px;border-radius:6px;border:1px solid var(--admin-border);background:var(--admin-surface-2);color:var(--admin-text);font-size:12px;">
                        <option value="percentage" ${pp.discountType === 'percentage' ? 'selected' : ''}>Percentage %</option>
                        <option value="fixed" ${pp.discountType === 'fixed' ? 'selected' : ''}>Fixed KWD</option>
                    </select>
                </td>
                <td>
                    <input type="number" value="${pp.discountValue}" step="0.1" min="0" style="width:80px;padding:4px 8px;border-radius:6px;border:1px solid var(--admin-border);background:var(--admin-surface-2);color:var(--admin-text);font-size:13px;font-weight:600;"
                        onchange="updatePromoProductDiscount('${promo._id}', '${product._id}', null, this.value, null)">
                </td>
                <td>
                    <input type="number" value="${pp.maxDiscountedQuantity || 0}" min="0" style="width:70px;padding:4px 8px;border-radius:6px;border:1px solid var(--admin-border);background:var(--admin-surface-2);color:var(--admin-text);font-size:13px;"
                        onchange="updatePromoProductDiscount('${promo._id}', '${product._id}', null, null, this.value)" placeholder="0=∞">
                </td>
                <td><strong style="color:${finalPrice < originalPrice ? '#059669' : 'var(--admin-text)'};">${finalPrice.toFixed(3)} KWD</strong></td>
                <td style="text-align:center;">
                    <button class="admin-btn" style="padding:4px 10px;font-size:12px;color:#ef4444;" onclick="removePromoProduct('${promo._id}', '${product._id}')">✕ Remove</button>
                </td>
            </tr>`;
        }).join('');
    }

    function setupProductSearch(promo) {
        const input = document.getElementById('promoProductSearch');
        const resultsDiv = document.getElementById('promoProductSearchResults');

        // Remove old listener by replacing input
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        function renderDropdown(query) {
            const q = (query || '').toLowerCase().trim();
            if (q.length === 0) {
                resultsDiv.style.display = 'none';
                return;
            }

            const existingMap = {};
            (promo.products || []).forEach(pp => {
                const pid = pp.product?._id || pp.product;
                existingMap[pid] = pp;
            });

            // Search ALL products (assigned + unassigned)
            let matches = allProducts.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.nameAr && p.nameAr.includes(q)) ||
                (p.sku && p.sku.toLowerCase().includes(q))
            );

            if (matches.length === 0) {
                resultsDiv.innerHTML = `<div style="padding:16px;color:var(--admin-text-muted);text-align:center;font-size:13px;">No matching products</div>`;
                resultsDiv.style.display = 'block';
                return;
            }

            // Show up to 25 products
            const shown = matches.slice(0, 25);
            const remaining = matches.length - shown.length;

            resultsDiv.innerHTML = shown.map(p => {
                const img = p.images?.[0]?.url || '';
                const imgHtml = img ? `<img src="${img}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;flex-shrink:0;" alt="" onerror="this.style.display='none'">` : '<div style="width:36px;height:36px;border-radius:6px;background:var(--admin-surface-3);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;">📦</div>';
                const isAssigned = !!existingMap[p._id];
                const pp = existingMap[p._id];

                if (isAssigned) {
                    // Already assigned — show current discount info + hint to edit in table
                    const discLabel = pp.discountType === 'percentage' ? `${pp.discountValue}%` : `${pp.discountValue} KWD`;
                    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--admin-border);transition:background 0.15s;background:rgba(5,150,105,0.05);" 
                        onmouseover="this.style.background='rgba(5,150,105,0.1)'" onmouseout="this.style.background='rgba(5,150,105,0.05)'"
                        onclick="document.getElementById('promoProductsTableBody').scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('promoProductSearchResults').style.display='none';">
                        ${imgHtml}
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:500;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
                            <div style="font-size:11px;color:#059669;font-weight:600;">✅ Assigned · ${discLabel} off · Max Qty: ${pp.maxDiscountedQuantity || '∞'}</div>
                        </div>
                        <span style="color:#059669;font-weight:600;font-size:11px;white-space:nowrap;background:rgba(5,150,105,0.1);padding:4px 10px;border-radius:6px;">✏️ Edit below</span>
                    </div>`;
                } else {
                    // Not assigned — show + Add button
                    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--admin-border);transition:background 0.15s;" 
                        onmouseover="this.style.background='var(--admin-surface-2)'" onmouseout="this.style.background='transparent'"
                        onclick="addProductToPromo('${promo._id}', '${p._id}', '${p.name.replace(/'/g, "\\'")}', ${p.price})">
                        ${imgHtml}
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:500;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
                            <div style="font-size:11px;color:var(--admin-text-muted);">${p.price.toFixed(3)} KWD${p.sku ? ' · ' + p.sku : ''}</div>
                        </div>
                        <span style="color:var(--admin-gold,#D4AF37);font-weight:600;font-size:12px;white-space:nowrap;background:var(--admin-gold-glow);padding:4px 10px;border-radius:6px;">+ Add</span>
                    </div>`;
                }
            }).join('') + (remaining > 0 ? `<div style="padding:10px;text-align:center;font-size:11px;color:var(--admin-text-muted);">+${remaining} more products — type to filter</div>` : '');
            resultsDiv.style.display = 'block';
        }

        // Only show dropdown when typing (not on empty focus)
        newInput.addEventListener('focus', () => { if (newInput.value.trim()) renderDropdown(newInput.value); });

        // Filter on input
        let debounce;
        newInput.addEventListener('input', () => {
            clearTimeout(debounce);
            debounce = setTimeout(() => renderDropdown(newInput.value), 150);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const wrap = document.getElementById('promoProductDropdownWrap');
            if (wrap && !wrap.contains(e.target)) {
                resultsDiv.style.display = 'none';
            }
        });
    }

    // ═══════════════════════════════════════════════════
    // CATEGORY TABS FOR BROWSING PRODUCTS
    // ═══════════════════════════════════════════════════

    function setupCategoryTabs(promo) {
        const tabsContainer = document.getElementById('promoCategoryTabs');
        const productsContainer = document.getElementById('promoCategoryProducts');
        if (!tabsContainer || !productsContainer) return;

        // Build category tabs
        const activeCategories = allCategoriesForPromo.filter(c => c.isActive !== false);

        tabsContainer.innerHTML = activeCategories.map(cat => {
            const count = allProducts.filter(p => {
                const catId = p.category?._id || p.category;
                return catId === cat._id;
            }).length;
            return `<button class="admin-btn promo-cat-tab" data-cat-id="${cat._id}" 
                style="padding:5px 14px;font-size:12px;border-radius:8px;border:1px solid var(--admin-border);background:var(--admin-surface);color:var(--admin-text);cursor:pointer;transition:all 0.15s;white-space:nowrap;"
                onclick="selectPromoCategoryTab('${cat._id}', '${promo._id}')">
                ${cat.name} <span style="font-size:10px;opacity:0.6;">(${count})</span>
            </button>`;
        }).join('');

        productsContainer.style.display = 'none';
    }

    window.selectPromoCategoryTab = function (categoryId, promoId) {
        const promo = allPromoCodes.find(p => p._id === promoId);
        if (!promo) return;

        // Highlight active tab
        document.querySelectorAll('.promo-cat-tab').forEach(btn => {
            if (btn.dataset.catId === categoryId) {
                btn.style.background = 'var(--admin-gold, #D4AF37)';
                btn.style.color = '#1a1a2e';
                btn.style.borderColor = 'var(--admin-gold, #D4AF37)';
                btn.style.fontWeight = '700';
            } else {
                btn.style.background = 'var(--admin-surface)';
                btn.style.color = 'var(--admin-text)';
                btn.style.borderColor = 'var(--admin-border)';
                btn.style.fontWeight = '400';
            }
        });

        // Filter products by category
        const categoryProducts = allProducts.filter(p => {
            const catId = p.category?._id || p.category;
            return catId === categoryId;
        });

        const existingMap = {};
        (promo.products || []).forEach(pp => {
            const pid = pp.product?._id || pp.product;
            existingMap[pid] = pp;
        });

        const productsContainer = document.getElementById('promoCategoryProducts');

        if (categoryProducts.length === 0) {
            productsContainer.innerHTML = `<div style="padding:24px;text-align:center;color:var(--admin-text-muted);font-size:13px;">No products in this category</div>`;
            productsContainer.style.display = 'block';
            return;
        }

        productsContainer.innerHTML = categoryProducts.map(p => {
            const img = p.images?.[0]?.url || '';
            const imgHtml = img ? `<img src="${img}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;flex-shrink:0;" alt="" onerror="this.style.display='none'">` : '<div style="width:40px;height:40px;border-radius:6px;background:var(--admin-surface-3);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;">📦</div>';
            const isAssigned = !!existingMap[p._id];
            const pp = existingMap[p._id];

            if (isAssigned) {
                const discLabel = pp.discountType === 'percentage' ? `${pp.discountValue}%` : `${pp.discountValue} KWD`;
                return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--admin-border);background:rgba(5,150,105,0.04);">
                    ${imgHtml}
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:500;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
                        <div style="font-size:11px;color:#059669;font-weight:600;">✅ Assigned · ${discLabel} off · Max Qty: ${pp.maxDiscountedQuantity || '∞'}</div>
                    </div>
                    <button class="admin-btn" style="padding:4px 10px;font-size:11px;color:#ef4444;white-space:nowrap;" onclick="removePromoProduct('${promo._id}', '${p._id}')">✕ Remove</button>
                </div>`;
            } else {
                return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--admin-border);cursor:pointer;transition:background 0.15s;"
                    onmouseover="this.style.background='var(--admin-surface-2)'" onmouseout="this.style.background='transparent'"
                    onclick="addProductToPromo('${promo._id}', '${p._id}', '${p.name.replace(/'/g, "\\'")}', ${p.price})">
                    ${imgHtml}
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:500;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
                        <div style="font-size:11px;color:var(--admin-text-muted);">${p.price.toFixed(3)} KWD${p.sku ? ' · ' + p.sku : ''}</div>
                    </div>
                    <span style="color:var(--admin-gold,#D4AF37);font-weight:600;font-size:12px;white-space:nowrap;background:var(--admin-gold-glow);padding:4px 10px;border-radius:6px;">+ Add</span>
                </div>`;
            }
        }).join('');
        productsContainer.style.display = 'block';
    };

    window.addProductToPromo = async function (promoId, productId, productName, price) {
        // Read global discount settings from the UI
        const discountType = document.getElementById('promoGlobalDiscountType')?.value || 'percentage';
        const discountValue = parseFloat(document.getElementById('promoGlobalDiscountValue')?.value) || 10;
        const maxDiscountedQuantity = parseInt(document.getElementById('promoGlobalMaxQuantity')?.value) || null;

        try {
            const res = await fetch(`${API()}/promo-codes/${promoId}/products`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({
                    products: [{ product: productId, discountType, discountValue, maxDiscountedQuantity }]
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            // Refresh promo codes and re-render
            await loadPromoCodes();
            const updatedPromo = allPromoCodes.find(p => p._id === promoId);
            if (updatedPromo) {
                renderPromoProducts(updatedPromo);
                setupProductSearch(updatedPromo);
                setupCategoryTabs(updatedPromo);
                // Re-select active category tab if one was selected
                const activeTab = document.querySelector('.promo-cat-tab[style*="font-weight: 700"], .promo-cat-tab[style*="font-weight:700"]');
                if (activeTab) selectPromoCategoryTab(activeTab.dataset.catId, promoId);
            }
            document.getElementById('promoProductSearch').value = '';
            document.getElementById('promoProductSearchResults').style.display = 'none';

            const discountLabel = discountType === 'percentage' ? `${discountValue}%` : `${discountValue} KWD`;
            showToast(`Added "${productName}" with ${discountLabel} discount`, 'success');
        } catch (err) {
            showToast(err.message || 'Failed to add product', 'error');
        }
    };

    window.updatePromoProductDiscount = async function (promoId, productId, newType, newValue, newMaxQty) {
        const promo = allPromoCodes.find(p => p._id === promoId);
        if (!promo) return;
        const pp = promo.products.find(p => (p.product?._id || p.product) === productId);
        if (!pp) return;

        const discountType = newType || pp.discountType;
        const discountValue = newValue !== null && newValue !== '' ? parseFloat(newValue) : pp.discountValue;
        const maxDiscountedQuantity = newMaxQty !== null && newMaxQty !== '' ? (parseInt(newMaxQty) || null) : pp.maxDiscountedQuantity;

        try {
            const res = await fetch(`${API()}/promo-codes/${promoId}/products`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({
                    products: [{ product: productId, discountType, discountValue, maxDiscountedQuantity }]
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            await loadPromoCodes();
            const updatedPromo = allPromoCodes.find(p => p._id === promoId);
            if (updatedPromo) renderPromoProducts(updatedPromo);
        } catch (err) {
            showToast(err.message || 'Failed to update discount', 'error');
        }
    };

    window.removePromoProduct = async function (promoId, productId) {
        try {
            const res = await fetch(`${API()}/promo-codes/${promoId}/products/${productId}`, {
                method: 'DELETE', headers: headers()
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            await loadPromoCodes();
            const updatedPromo = allPromoCodes.find(p => p._id === promoId);
            if (updatedPromo) {
                renderPromoProducts(updatedPromo);
                setupProductSearch(updatedPromo);
                setupCategoryTabs(updatedPromo);
                // Re-select active category tab if one was selected
                const activeTab = document.querySelector('.promo-cat-tab[style*="font-weight: 700"], .promo-cat-tab[style*="font-weight:700"]');
                if (activeTab) selectPromoCategoryTab(activeTab.dataset.catId, promoId);
            }
            showToast('Product removed from promo', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to remove product', 'error');
        }
    };

    // ═══════════════════════════════════════════════════
    // ENABLE FOR ALL PRODUCTS
    // ═══════════════════════════════════════════════════

    window.openEnableAllProductsPanel = function () {
        const panel = document.getElementById('enableAllProductsPanel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    };

    window.enablePromoForAllProducts = async function () {
        if (!currentPromoId) {
            showToast('No promo code selected', 'error');
            return;
        }

        const discountType = document.getElementById('enableAllDiscountType').value;
        const discountValue = parseFloat(document.getElementById('enableAllDiscountValue').value);
        const maxDiscountedQuantity = parseInt(document.getElementById('enableAllMaxQuantity').value) || null;

        if (!discountValue || discountValue <= 0) {
            showToast('Please enter a valid discount value', 'error');
            return;
        }

        if (discountType === 'percentage' && discountValue > 100) {
            showToast('Percentage discount cannot exceed 100%', 'error');
            return;
        }

        const promo = allPromoCodes.find(p => p._id === currentPromoId);
        if (!promo) return;

        const confirmMsg = `Apply ${discountValue}${discountType === 'percentage' ? '%' : ' KWD'} discount to ALL products for promo "${promo.code}"?\n\nThis will add/update all products in your store.`;
        if (!confirm(confirmMsg)) return;

        try {
            // Load all products if not already loaded
            if (allProducts.length === 0) {
                const res = await fetch(`${API()}/products`, { headers: headers() });
                const data = await res.json();
                allProducts = data.data || data.products || [];
            }

            if (allProducts.length === 0) {
                showToast('No products found in your store', 'error');
                return;
            }

            // Build the products payload
            const productsPayload = allProducts.map(p => ({
                product: p._id,
                discountType: discountType,
                discountValue: discountValue,
                maxDiscountedQuantity: maxDiscountedQuantity
            }));

            // Send in batches of 50 to avoid payload size issues
            const BATCH_SIZE = 50;
            let totalAdded = 0;

            for (let i = 0; i < productsPayload.length; i += BATCH_SIZE) {
                const batch = productsPayload.slice(i, i + BATCH_SIZE);
                const res = await fetch(`${API()}/promo-codes/${currentPromoId}/products`, {
                    method: 'POST',
                    headers: headers(),
                    body: JSON.stringify({ products: batch })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message);
                totalAdded += batch.length;
            }

            // Hide the panel
            document.getElementById('enableAllProductsPanel').style.display = 'none';

            // Refresh and re-render
            await loadPromoCodes();
            const updatedPromo = allPromoCodes.find(p => p._id === currentPromoId);
            if (updatedPromo) {
                renderPromoProducts(updatedPromo);
                setupProductSearch(updatedPromo);
            }

            showToast(`✅ Applied ${discountValue}${discountType === 'percentage' ? '%' : ' KWD'} discount to ${totalAdded} products!`, 'success');
        } catch (err) {
            showToast(err.message || 'Failed to enable for all products', 'error');
        }
    };

    // ═══════════════════════════════════════════════════
    // TOAST HELPER (uses existing admin toast if available)
    // ═══════════════════════════════════════════════════

    function showToast(message, type) {
        if (window.showAdminToast) {
            window.showAdminToast(message, type);
            return;
        }
        // Fallback toast
        const existing = document.querySelector('.promo-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'promo-toast';
        toast.style.cssText = `position:fixed;bottom:24px;right:24px;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:500;z-index:99999;
            color:white;background:${type === 'error' ? '#ef4444' : '#10b981'};box-shadow:0 8px 32px rgba(0,0,0,0.2);
            animation:slideInUp 0.3s ease;transition:opacity 0.3s ease;`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
    }

    // ==========================================
    // Update All Assigned Products Bulk
    // ==========================================
    window.updateAssignedPromoProducts = async function () {
        const discountType = document.getElementById('promoGlobalDiscountType').value;
        const discountValue = parseFloat(document.getElementById('promoGlobalDiscountValue').value);
        const maxDiscountedQuantity = parseInt(document.getElementById('promoGlobalMaxQuantity').value) || null;

        if (!discountValue || discountValue <= 0) {
            showToast('Please enter a valid discount value', 'error');
            return;
        }

        const promo = allPromoCodes.find(p => p._id === currentPromoId);
        if (!promo) return;
        if (!promo.products || promo.products.length === 0) {
            showToast('No products are currently assigned to this promo code.', 'error');
            return;
        }

        const confirmMsg = `Update all ${promo.products.length} assigned products to use a ${discountValue}${discountType === 'percentage' ? '%' : ' KWD'} discount?`;
        if (!confirm(confirmMsg)) return;

        try {
            showToast(`Updating ${promo.products.length} products...`, 'info');

            const productsPayload = promo.products.map(p => ({
                product: p.product?._id || p.product,
                discountType: discountType,
                discountValue: discountValue,
                maxDiscountedQuantity: maxDiscountedQuantity
            }));

            const BATCH_SIZE = 50;
            let successCount = 0;

            for (let i = 0; i < productsPayload.length; i += BATCH_SIZE) {
                const batch = productsPayload.slice(i, i + BATCH_SIZE);
                const res = await fetch(`${API()}/promo-codes/${currentPromoId}/products`, {
                    method: 'POST',
                    headers: headers(),
                    body: JSON.stringify({ products: batch })
                });

                const data = await res.json();
                if (!data.success) throw new Error(data.message || 'Failed to update batch');
                successCount += batch.length;
            }

            await loadPromoCodes();
            const updatedPromo = allPromoCodes.find(p => p._id === currentPromoId);
            if (updatedPromo) {
                renderPromoProducts(updatedPromo);
            }

            showToast(`✅ Successfully updated ${successCount} products!`, 'success');
        } catch (err) {
            console.error('Update Assigned Error:', err);
            showToast(err.message || 'Failed to update assigned products', 'error');
        }
    };

})();
