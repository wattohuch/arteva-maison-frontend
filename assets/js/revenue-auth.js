/**
 * Revenue Authentication & History Module
 * Handles secure revenue visibility with PIN re-authentication
 * and displays full revenue history dashboard
 */

let revenueUnlocked = false;
let revenueUnlockTimeout = null;
const REVENUE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Cache analytics data for drill-down
let _revenueAnalyticsCache = null;

/**
 * Initialize revenue protection
 */
function initRevenueProtection() {
    const user = AuthAPI.getUser();
    
    // Only apply to superuser
    if (!user || user.role !== 'superuser') {
        return;
    }

    const revenueCard = document.querySelector('.admin-stat-card:has(#statRevenue)');
    if (!revenueCard) return;

    // Add blur class and click handler
    revenueCard.classList.add('revenue-blurred');
    revenueCard.style.cursor = 'pointer';
    revenueCard.title = 'Click to unlock revenue (PIN required)';

    // Remove any existing listeners
    revenueCard.removeEventListener('click', handleRevenueCardClick);
    revenueCard.addEventListener('click', handleRevenueCardClick);

    // Blur the revenue value
    const revenueValue = document.getElementById('statRevenue');
    if (revenueValue && !revenueUnlocked) {
        revenueValue.textContent = '•••••';
        revenueValue.style.filter = 'blur(8px)';
    }
}

function handleRevenueCardClick() {
    if (!revenueUnlocked) {
        showRevenueAuthModal();
    } else {
        showRevenueHistoryModal();
    }
}

/**
 * Show PIN authentication modal
 */
function showRevenueAuthModal() {
    // Remove any existing modal
    const existing = document.getElementById('revenueAuthModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'revenueAuthModal';
    modal.className = 'admin-modal';
    modal.innerHTML = `
        <div class="admin-modal-content" style="max-width: 400px;">
            <div class="admin-modal-header">
                <h2>🔐 Unlock Revenue</h2>
                <button class="admin-btn-icon" onclick="closeRevenueAuthModal()">✕</button>
            </div>
            <div class="admin-modal-body">
                <p style="margin-bottom: 20px; color: var(--admin-text-muted); font-size: 14px;">
                    Enter your password to view revenue dashboard
                </p>
                <form id="revenueAuthForm">
                    <div class="admin-form-group">
                        <label>Password</label>
                        <input 
                            type="password" 
                            id="revenuePassword" 
                            placeholder="Enter your password"
                            required
                            autocomplete="current-password"
                        >
                    </div>
                    <div id="revenueAuthError" style="display: none; color: #f87171; font-size: 13px; margin-top: -8px; margin-bottom: 12px;"></div>
                    <div class="admin-form-actions" style="border: none; padding-top: 0;">
                        <button type="button" class="admin-btn-cancel" onclick="closeRevenueAuthModal()">Cancel</button>
                        <button type="submit" class="admin-btn admin-btn-primary" id="revenueUnlockBtn">🔓 Unlock</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Focus password input
    setTimeout(() => {
        document.getElementById('revenuePassword').focus();
    }, 100);

    // Handle form submit
    document.getElementById('revenueAuthForm').addEventListener('submit', (e) => {
        e.preventDefault();
        authenticateRevenue();
    });
}

/**
 * Close authentication modal
 */
window.closeRevenueAuthModal = function() {
    const modal = document.getElementById('revenueAuthModal');
    if (modal) modal.remove();
};

/**
 * Authenticate and unlock revenue
 */
async function authenticateRevenue() {
    const passwordInput = document.getElementById('revenuePassword');
    const errorDiv = document.getElementById('revenueAuthError');
    const unlockBtn = document.getElementById('revenueUnlockBtn');
    
    const password = passwordInput.value.trim();
    
    if (!password) {
        errorDiv.textContent = 'Please enter your password';
        errorDiv.style.display = 'block';
        return;
    }

    // Disable button and show loading
    unlockBtn.disabled = true;
    unlockBtn.textContent = 'Verifying...';
    errorDiv.style.display = 'none';

    try {
        const user = AuthAPI.getUser();
        const response = await fetch(`${API_BASE_URL}/auth/verify-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('arteva_token')}`
            },
            body: JSON.stringify({
                email: user.email,
                password: password
            })
        });

        const data = await response.json();

        if (data.success) {
            revenueUnlocked = true;
            closeRevenueAuthModal();
            unlockRevenueCard();
            
            // Set timeout to re-lock after 5 minutes
            if (revenueUnlockTimeout) clearTimeout(revenueUnlockTimeout);
            revenueUnlockTimeout = setTimeout(() => {
                lockRevenue();
            }, REVENUE_TIMEOUT);

            if (typeof showToast === 'function') {
                showToast('Success', 'Revenue unlocked for 5 minutes', 'success');
            }

            // Show the history modal
            showRevenueHistoryModal();
        } else {
            errorDiv.textContent = data.message || 'Incorrect password';
            errorDiv.style.display = 'block';
            unlockBtn.disabled = false;
            unlockBtn.textContent = '🔓 Unlock';
            passwordInput.value = '';
            passwordInput.focus();
        }
    } catch (error) {
        console.error('Revenue auth error:', error);
        errorDiv.textContent = 'Authentication failed. Please try again.';
        errorDiv.style.display = 'block';
        unlockBtn.disabled = false;
        unlockBtn.textContent = '🔓 Unlock';
    }
}

/**
 * Unlock revenue card display (show value on dashboard)
 */
function unlockRevenueCard() {
    const revenueCard = document.querySelector('.admin-stat-card:has(#statRevenue)');
    const revenueValue = document.getElementById('statRevenue');
    
    if (revenueCard) {
        revenueCard.classList.remove('revenue-blurred');
        revenueCard.title = 'Click to view revenue history';
    }

    if (revenueValue) {
        revenueValue.style.filter = 'none';
        // Reload dashboard to get actual revenue value
        if (typeof loadDashboard === 'function') {
            loadDashboard();
        }
    }
}

/**
 * Lock revenue display
 */
function lockRevenue() {
    revenueUnlocked = false;
    
    const revenueCard = document.querySelector('.admin-stat-card:has(#statRevenue)');
    const revenueValue = document.getElementById('statRevenue');
    
    if (revenueCard) {
        revenueCard.classList.add('revenue-blurred');
        revenueCard.style.cursor = 'pointer';
        revenueCard.title = 'Click to unlock revenue (PIN required)';
    }

    if (revenueValue) {
        revenueValue.textContent = '•••••';
        revenueValue.style.filter = 'blur(8px)';
    }

    if (typeof showToast === 'function') {
        showToast('Info', 'Revenue locked. Click to unlock again.', 'info');
    }
}

/**
 * Show Revenue History Modal with full dashboard
 */
async function showRevenueHistoryModal() {
    // Remove any existing modal
    const existing = document.getElementById('revenueHistoryModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'revenueHistoryModal';
    modal.className = 'admin-modal';
    modal.innerHTML = `
        <div class="admin-modal-content" style="max-width: 960px;">
            <div class="admin-modal-header">
                <h2>💰 Revenue Analytics</h2>
                <button class="admin-btn-icon" onclick="closeRevenueHistoryModal()">✕</button>
            </div>
            <div class="admin-modal-body" id="revenueHistoryBody">
                <div style="text-align: center; padding: 60px 20px; color: var(--admin-text-muted);">
                    <div class="revenue-loading-spinner"></div>
                    <p style="margin-top: 16px;">Loading revenue data...</p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Fetch both endpoints
    try {
        const token = localStorage.getItem('arteva_token');
        const headers = { 'Authorization': 'Bearer ' + token };

        const [historyRes, analyticsRes] = await Promise.all([
            fetch(API_BASE_URL + '/admin/revenue-history', { headers }),
            fetch(API_BASE_URL + '/admin/revenue-analytics', { headers }).catch(() => null)
        ]);

        const historyResult = await historyRes.json();
        let analyticsResult = null;
        if (analyticsRes && analyticsRes.ok) {
            analyticsResult = await analyticsRes.json();
        }

        if (historyResult.success) {
            _revenueAnalyticsCache = analyticsResult ? analyticsResult.data : null;
            renderRevenueHistory(historyResult.data, _revenueAnalyticsCache);
        } else {
            document.getElementById('revenueHistoryBody').innerHTML = 
                '<div style="text-align: center; padding: 40px; color: #f87171;"><p>Failed to load revenue data</p></div>';
        }
    } catch (error) {
        console.error('Revenue history error:', error);
        document.getElementById('revenueHistoryBody').innerHTML = 
            '<div style="text-align: center; padding: 40px; color: #f87171;"><p>Failed to load revenue data</p></div>';
    }
}

/**
 * Render the revenue history data into the modal
 */
function renderRevenueHistory(data, analytics) {
    const body = document.getElementById('revenueHistoryBody');
    if (!body) return;

    const { summary, dailyBreakdown, monthlyBreakdown } = data;

    // Find best day
    const bestDay = dailyBreakdown.length > 0 
        ? dailyBreakdown.reduce(function(max, d) { return d.revenue > max.revenue ? d : max; }, dailyBreakdown[0])
        : null;

    // Build products tab HTML
    let productsTabHtml = '<p style="text-align: center; padding: 32px; color: var(--admin-text-muted);">No product analytics available</p>';
    
    if (analytics && analytics.products && analytics.products.length > 0) {
        productsTabHtml = '<div class="admin-table-wrap"><div class="admin-table-scroll"><table class="admin-table revenue-table">' +
            '<thead><tr>' +
            '<th>Product</th>' +
            '<th style="text-align:center;">Sold</th>' +
            '<th style="text-align:center;">Orders</th>' +
            '<th style="text-align:right;">Revenue (KWD)</th>' +
            '<th style="text-align:center;">Details</th>' +
            '</tr></thead><tbody>' +
            analytics.products.map(function(p, idx) {
                var rankBadge = idx === 0 ? ' <span class="revenue-best-badge">🏆 #1</span>' : 
                    (idx < 3 ? ' <span style="font-size:10px;background:rgba(201,169,98,0.15);color:var(--admin-gold);padding:2px 6px;border-radius:8px;">#' + (idx+1) + '</span>' : '');

                // Show discount info if product has a discount
                var discountInfo = '';
                var pm = analytics.productPriceMap && analytics.productPriceMap[p.productId];
                if (pm && pm.compareAtPrice && pm.compareAtPrice > pm.currentPrice) {
                    discountInfo = '<div style="font-size:11px;margin-top:2px;">' +
                        '<span style="text-decoration:line-through;color:var(--admin-text-muted);">' + pm.compareAtPrice.toFixed(3) + '</span> ' +
                        '<span style="color:#dc3545;font-weight:600;">' + pm.currentPrice.toFixed(3) + '</span> ' +
                        '<span style="background:rgba(220,53,69,0.12);color:#dc3545;font-weight:700;padding:1px 4px;border-radius:3px;font-size:10px;">-' + pm.discountPercentage + '%</span>' +
                    '</div>';
                }

                return '<tr onclick="window.showProductDrillDown(' + idx + ')" style="cursor:pointer;" title="Click to view details">' +
                    '<td><strong style="color:var(--admin-text);">' + p.name + '</strong>' + rankBadge + discountInfo + '</td>' +
                    '<td style="text-align:center;">' + p.totalQuantitySold + '</td>' +
                    '<td style="text-align:center;">' + p.orderCount + '</td>' +
                    '<td style="text-align:right;font-weight:700;font-family:Playfair Display,serif;color:var(--admin-gold);">' + p.totalRevenue.toFixed(3) + '</td>' +
                    '<td style="text-align:center;"><span style="font-size:18px;">›</span></td>' +
                '</tr>';
            }).join('') +
            '</tbody></table></div></div>';
        
        // Add summary insight
        if (analytics.summary) {
            var s = analytics.summary;
            productsTabHtml = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">' +
                '<div style="background:var(--admin-surface-2);padding:14px;border-radius:12px;border:1px solid var(--admin-border);">' +
                    '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--admin-text-muted);margin-bottom:4px;">Total Products Sold</div>' +
                    '<div style="font-size:20px;font-weight:700;font-family:Playfair Display,serif;color:var(--admin-text);">' + s.totalProducts + '</div>' +
                '</div>' +
                '<div style="background:var(--admin-surface-2);padding:14px;border-radius:12px;border:1px solid var(--admin-border);">' +
                    '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--admin-text-muted);margin-bottom:4px;">Best Product</div>' +
                    '<div style="font-size:13px;font-weight:600;color:var(--admin-gold);">' + (s.bestProduct ? s.bestProduct.name : 'N/A') + '</div>' +
                    '<div style="font-size:11px;color:var(--admin-text-muted);">' + (s.bestProduct ? s.bestProduct.revenue.toFixed(3) + ' KWD' : '') + '</div>' +
                '</div>' +
                '<div style="background:var(--admin-surface-2);padding:14px;border-radius:12px;border:1px solid var(--admin-border);">' +
                    '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--admin-text-muted);margin-bottom:4px;">Avg Order Value</div>' +
                    '<div style="font-size:20px;font-weight:700;font-family:Playfair Display,serif;color:var(--admin-text);">' + s.averageOrderValue.toFixed(3) + '</div>' +
                '</div>' +
            '</div>' + productsTabHtml;
        }
    }

    body.innerHTML = 
        '<!-- Summary Cards -->' +
        '<div class="revenue-summary-grid">' +
            '<div class="revenue-summary-card revenue-today">' +
                '<div class="revenue-summary-icon">📅</div>' +
                '<div class="revenue-summary-info">' +
                    '<span class="revenue-summary-label">Today</span>' +
                    '<span class="revenue-summary-value">' + summary.today.revenue.toFixed(3) + ' <small>KWD</small></span>' +
                    '<span class="revenue-summary-orders">' + summary.today.orders + ' order' + (summary.today.orders !== 1 ? 's' : '') + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="revenue-summary-card revenue-week">' +
                '<div class="revenue-summary-icon">📊</div>' +
                '<div class="revenue-summary-info">' +
                    '<span class="revenue-summary-label">This Week</span>' +
                    '<span class="revenue-summary-value">' + summary.thisWeek.revenue.toFixed(3) + ' <small>KWD</small></span>' +
                    '<span class="revenue-summary-orders">' + summary.thisWeek.orders + ' order' + (summary.thisWeek.orders !== 1 ? 's' : '') + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="revenue-summary-card revenue-month">' +
                '<div class="revenue-summary-icon">📈</div>' +
                '<div class="revenue-summary-info">' +
                    '<span class="revenue-summary-label">This Month</span>' +
                    '<span class="revenue-summary-value">' + summary.thisMonth.revenue.toFixed(3) + ' <small>KWD</small></span>' +
                    '<span class="revenue-summary-orders">' + summary.thisMonth.orders + ' order' + (summary.thisMonth.orders !== 1 ? 's' : '') + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="revenue-summary-card revenue-alltime">' +
                '<div class="revenue-summary-icon">💎</div>' +
                '<div class="revenue-summary-info">' +
                    '<span class="revenue-summary-label">All Time</span>' +
                    '<span class="revenue-summary-value">' + summary.allTime.revenue.toFixed(3) + ' <small>KWD</small></span>' +
                    '<span class="revenue-summary-orders">' + summary.allTime.orders + ' order' + (summary.allTime.orders !== 1 ? 's' : '') + '</span>' +
                '</div>' +
            '</div>' +
        '</div>' +

        '<!-- Tab Navigation -->' +
        '<div class="revenue-tabs">' +
            '<button class="revenue-tab active" onclick="switchRevenueTab(\'daily\', this)">Daily (30 days)</button>' +
            '<button class="revenue-tab" onclick="switchRevenueTab(\'monthly\', this)">Monthly</button>' +
            '<button class="revenue-tab" onclick="switchRevenueTab(\'products\', this)">📦 Products</button>' +
        '</div>' +

        '<!-- Daily Breakdown Table -->' +
        '<div id="revenueTabDaily" class="revenue-tab-content">' +
            (dailyBreakdown.length === 0 
                ? '<p style="text-align: center; padding: 32px; color: var(--admin-text-muted);">No revenue data yet</p>'
                : '<div class="admin-table-wrap"><div class="admin-table-scroll"><table class="admin-table revenue-table">' +
                    '<thead><tr><th>Date</th><th style="text-align: center;">Orders</th><th style="text-align: center;">Visitors (IP)</th><th style="text-align: center;">Views</th><th style="text-align: right;">Revenue (KWD)</th></tr></thead>' +
                    '<tbody>' +
                    dailyBreakdown.map(function(d) {
                        var dateObj = new Date(d.date + 'T00:00:00');
                        var dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                        var formatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        var isBest = bestDay && d.date === bestDay.date;
                        var visitors = d.visitors || 0;
                        var views = d.views || 0;
                        return '<tr class="' + (isBest ? 'revenue-best-day' : '') + '">' +
                            '<td><span style="color: var(--admin-text-muted); font-size: 11px; margin-right: 6px;">' + dayName + '</span> ' + formatted +
                            (isBest ? ' <span class="revenue-best-badge">🏆 Best</span>' : '') + '</td>' +
                            '<td style="text-align: center;">' + d.orders + '</td>' +
                            '<td style="text-align: center; color: #2563eb; font-weight: 600;">' + visitors + '</td>' +
                            '<td style="text-align: center; color: var(--admin-text-muted);">' + views + '</td>' +
                            '<td style="text-align: right; font-weight: 600; font-family: Playfair Display, serif;">' + d.revenue.toFixed(3) + '</td></tr>';
                    }).join('') +
                    '</tbody></table></div></div>'
            ) +
        '</div>' +

        '<!-- Monthly Breakdown Table -->' +
        '<div id="revenueTabMonthly" class="revenue-tab-content" style="display: none;">' +
            (monthlyBreakdown.length === 0 
                ? '<p style="text-align: center; padding: 32px; color: var(--admin-text-muted);">No revenue data yet</p>'
                : '<div class="admin-table-wrap"><div class="admin-table-scroll"><table class="admin-table revenue-table">' +
                    '<thead><tr><th>Month</th><th style="text-align: center;">Orders</th><th style="text-align: right;">Revenue (KWD)</th></tr></thead>' +
                    '<tbody>' +
                    monthlyBreakdown.map(function(m) {
                        return '<tr><td style="font-weight: 500;">' + MONTH_NAMES[m.month - 1] + ' ' + m.year + '</td>' +
                            '<td style="text-align: center;">' + m.orders + '</td>' +
                            '<td style="text-align: right; font-weight: 600; font-family: Playfair Display, serif;">' + m.revenue.toFixed(3) + '</td></tr>';
                    }).join('') +
                    '</tbody></table></div></div>'
            ) +
        '</div>' +

        '<!-- Products Breakdown Tab -->' +
        '<div id="revenueTabProducts" class="revenue-tab-content" style="display: none;">' +
            productsTabHtml +
        '</div>' +

        '<div style="text-align: center; margin-top: 16px;">' +
            '<p style="color: var(--admin-text-muted); font-size: 11px;">🔒 Auto-locks in 5 minutes • Revenue data from paid orders only</p>' +
        '</div>';
}

/**
 * Switch between daily and monthly tabs
 */
window.switchRevenueTab = function(tab, btn) {
    // Update tab buttons
    document.querySelectorAll('.revenue-tab').forEach(function(t) { t.classList.remove('active'); });
    btn.classList.add('active');

    // Show/hide content
    var daily = document.getElementById('revenueTabDaily');
    var monthly = document.getElementById('revenueTabMonthly');
    var products = document.getElementById('revenueTabProducts');
    
    if (daily) daily.style.display = tab === 'daily' ? 'block' : 'none';
    if (monthly) monthly.style.display = tab === 'monthly' ? 'block' : 'none';
    if (products) products.style.display = tab === 'products' ? 'block' : 'none';
};

/**
 * Close revenue history modal
 */
window.closeRevenueHistoryModal = function() {
    const modal = document.getElementById('revenueHistoryModal');
    if (modal) modal.remove();
};

/**
 * Check if revenue is unlocked
 */
function isRevenueUnlocked() {
    return revenueUnlocked;
}

/**
 * Show product drill-down: price history, orders grouped by price
 */
window.showProductDrillDown = function(productIndex) {
    if (!_revenueAnalyticsCache || !_revenueAnalyticsCache.products) return;
    var product = _revenueAnalyticsCache.products[productIndex];
    if (!product) return;

    var container = document.getElementById('revenueTabProducts');
    if (!container) return;

    // Price points with expandable orders
    var pricePointsHtml = product.pricePoints.map(function(pp, ppIdx) {
        var ordersHtml = '';
        if (pp.orders && pp.orders.length > 0) {
            ordersHtml = '<div id="ppOrders_' + ppIdx + '" style="display:none;margin-top:10px;">' +
                '<table class="admin-table" style="min-width:auto;">' +
                '<thead><tr>' +
                '<th>Order #</th><th>Date</th><th>Qty</th><th>Customer</th><th style="text-align:center;">Info</th>' +
                '</tr></thead><tbody>' +
                pp.orders.map(function(o, oIdx) {
                    var dateStr = new Date(o.date).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'});
                    return '<tr style="cursor:pointer;" onclick="window.showOrderCustomerInfo(' + productIndex + ',' + ppIdx + ',' + oIdx + ')">' +
                        '<td style="color:var(--admin-gold);font-weight:600;">' + o.orderNumber + '</td>' +
                        '<td>' + dateStr + '</td>' +
                        '<td style="text-align:center;">' + o.quantity + '</td>' +
                        '<td>' + (o.customer ? o.customer.name : 'Guest') + '</td>' +
                        '<td style="text-align:center;"><span style="font-size:16px;">👤</span></td>' +
                    '</tr>';
                }).join('') +
                '</tbody></table></div>';
        }

        // Determine the original/compare-at price for this price point
        var originalPriceInfo = '';
        var pm = _revenueAnalyticsCache.productPriceMap && _revenueAnalyticsCache.productPriceMap[product.productId];
        if (pm) {
            // If product currently has a compareAtPrice and this price point matches the current discounted price
            if (pm.compareAtPrice && pm.compareAtPrice > pp.price) {
                var pctOff = Math.round(((pm.compareAtPrice - pp.price) / pm.compareAtPrice) * 100);
                originalPriceInfo = '<div style="margin-top:4px;font-size:12px;color:var(--admin-text-muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
                    '<span style="text-decoration:line-through;">' + pm.compareAtPrice.toFixed(3) + ' KWD</span>' +
                    '<span style="background:rgba(220,53,69,0.12);color:#dc3545;font-weight:700;padding:1px 6px;border-radius:4px;font-size:11px;">-' + pctOff + '%</span>' +
                    '<span style="font-style:italic;color:var(--admin-text-muted);">was the original price</span>' +
                '</div>';
            } else if (pm.compareAtPrice && pp.price >= pm.compareAtPrice) {
                // This price point IS the original (pre-discount) price
                originalPriceInfo = '<div style="margin-top:4px;font-size:11px;color:var(--admin-text-muted);font-style:italic;">' +
                    '💰 Original price (before discount)' +
                '</div>';
            } else if (pm.priceHistory && pm.priceHistory.length > 0) {
                // Search price history to find the compare-at price that applied when this price was active
                var matchingHistory = pm.priceHistory.filter(function(h) {
                    return Math.abs(h.price - pp.price) < 0.001 && h.compareAtPrice && h.compareAtPrice > pp.price;
                });
                if (matchingHistory.length > 0) {
                    var histEntry = matchingHistory[matchingHistory.length - 1];
                    var histPct = Math.round(((histEntry.compareAtPrice - pp.price) / histEntry.compareAtPrice) * 100);
                    originalPriceInfo = '<div style="margin-top:4px;font-size:12px;color:var(--admin-text-muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
                        '<span style="text-decoration:line-through;">' + histEntry.compareAtPrice.toFixed(3) + ' KWD</span>' +
                        '<span style="background:rgba(220,53,69,0.12);color:#dc3545;font-weight:700;padding:1px 6px;border-radius:4px;font-size:11px;">-' + histPct + '%</span>' +
                        '<span style="font-style:italic;color:var(--admin-text-muted);">was the original price</span>' +
                    '</div>';
                }
            }
        }

        return '<div style="background:var(--admin-surface-2);border:1px solid var(--admin-border);border-radius:12px;padding:14px;margin-bottom:8px;">' +
            '<div onclick="var el=document.getElementById(\'ppOrders_' + ppIdx + '\');if(el)el.style.display=el.style.display===\'none\'?\'block\':\'none\';" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;">' +
                '<div>' +
                    '<span style="font-size:18px;font-weight:700;font-family:Playfair Display,serif;color:var(--admin-text);">' + pp.price.toFixed(3) + '</span>' +
                    ' <span style="font-size:12px;color:var(--admin-text-muted);">KWD</span>' +
                    originalPriceInfo +
                '</div>' +
                '<div style="display:flex;gap:16px;align-items:center;">' +
                    '<div style="text-align:center;"><div style="font-size:14px;font-weight:700;color:var(--admin-text);">' + pp.quantity + '</div><div style="font-size:10px;color:var(--admin-text-muted);">SOLD</div></div>' +
                    '<div style="text-align:center;"><div style="font-size:14px;font-weight:700;color:var(--admin-gold);">' + pp.revenue.toFixed(3) + '</div><div style="font-size:10px;color:var(--admin-text-muted);">REVENUE</div></div>' +
                    '<div style="text-align:center;"><div style="font-size:14px;font-weight:700;color:var(--admin-text-secondary);">' + pp.orderCount + '</div><div style="font-size:10px;color:var(--admin-text-muted);">ORDERS</div></div>' +
                    '<span style="font-size:14px;color:var(--admin-text-muted);">▼</span>' +
                '</div>' +
            '</div>' +
            ordersHtml +
        '</div>';
    }).join('');

    // Price history from productPriceMap
    var priceHistoryHtml = '';
    if (_revenueAnalyticsCache.productPriceMap && _revenueAnalyticsCache.productPriceMap[product.productId]) {
        var pm = _revenueAnalyticsCache.productPriceMap[product.productId];
        if (pm.priceHistory && pm.priceHistory.length > 0) {
            priceHistoryHtml = '<div style="margin-bottom:16px;"><div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--admin-text-muted);margin-bottom:8px;">📊 Price History</div>' +
                '<div class="admin-table-wrap"><div class="admin-table-scroll"><table class="admin-table" style="min-width:auto;"><thead><tr><th>Date</th><th style="text-align:right;">Price</th><th>Reason</th></tr></thead><tbody>' +
                pm.priceHistory.map(function(h) {
                    var d = new Date(h.changedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
                    var reason = h.reason === 'discount' ? '🏷️ Discount' : '💰 Update';
                    return '<tr><td>' + d + '</td><td style="text-align:right;font-weight:600;">' + h.price.toFixed(3) + ' KWD</td><td>' + reason + '</td></tr>';
                }).join('') +
                '</tbody></table></div></div></div>';
        }
        // Show current price info
        priceHistoryHtml = '<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">' +
            '<div style="background:var(--admin-surface-2);padding:12px 16px;border-radius:10px;border:1px solid var(--admin-border);flex:1;min-width:120px;">' +
                '<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:var(--admin-text-muted);margin-bottom:2px;">Current Price</div>' +
                '<div style="font-size:18px;font-weight:700;font-family:Playfair Display,serif;">' + pm.currentPrice.toFixed(3) + ' KWD</div>' +
            '</div>' +
            (pm.compareAtPrice ? '<div style="background:var(--admin-surface-2);padding:12px 16px;border-radius:10px;border:1px solid var(--admin-border);flex:1;min-width:120px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:var(--admin-text-muted);margin-bottom:2px;">Compare At</div><div style="font-size:18px;font-weight:700;font-family:Playfair Display,serif;text-decoration:line-through;color:var(--admin-text-muted);">' + pm.compareAtPrice.toFixed(3) + '</div></div>' : '') +
            (pm.discountPercentage ? '<div style="background:rgba(74,222,128,0.1);padding:12px 16px;border-radius:10px;border:1px solid rgba(74,222,128,0.2);flex:1;min-width:120px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:var(--admin-text-muted);margin-bottom:2px;">Discount</div><div style="font-size:18px;font-weight:700;color:#22c55e;">' + pm.discountPercentage + '%</div></div>' : '') +
        '</div>' + priceHistoryHtml;
    }

    container.innerHTML = '<div style="margin-bottom:16px;">' +
        '<button onclick="window.backToProductsList()" style="background:none;border:none;cursor:pointer;color:var(--admin-gold);font-size:14px;font-weight:600;font-family:inherit;padding:8px 0;display:flex;align-items:center;gap:6px;">‹ Back to Products</button>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">' +
        (product.image ? '<img src="' + resolveImageUrl(product.image) + '" style="width:56px;height:56px;border-radius:12px;object-fit:cover;border:1px solid var(--admin-border);" onerror="this.style.display=\'none\'">' : '') +
        '<div>' +
            '<h3 style="margin:0;font-family:Playfair Display,serif;font-size:20px;color:var(--admin-text);">' + product.name + '</h3>' +
            '<div style="display:flex;gap:16px;margin-top:4px;font-size:12px;color:var(--admin-text-muted);">' +
                '<span>' + product.totalQuantitySold + ' sold</span>' +
                '<span>' + product.orderCount + ' orders</span>' +
                '<span style="color:var(--admin-gold);font-weight:700;">' + product.totalRevenue.toFixed(3) + ' KWD</span>' +
            '</div>' +
        '</div>' +
    '</div>' +
    priceHistoryHtml +
    '<div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--admin-text-muted);margin-bottom:10px;">💵 Orders by Price Point</div>' +
    pricePointsHtml;
};

/**
 * Back to products list
 */
window.backToProductsList = function() {
    if (_revenueAnalyticsCache) {
        var body = document.getElementById('revenueHistoryBody');
        if (body) {
            // Re-render by triggering the modal refresh
            showRevenueHistoryModal();
        }
    }
};

/**
 * Show customer info popup for a specific order
 */
window.showOrderCustomerInfo = function(productIndex, ppIdx, orderIdx) {
    if (!_revenueAnalyticsCache || !_revenueAnalyticsCache.products) return;
    var product = _revenueAnalyticsCache.products[productIndex];
    if (!product) return;
    var pp = product.pricePoints[ppIdx];
    if (!pp || !pp.orders) return;
    var order = pp.orders[orderIdx];
    if (!order || !order.customer) return;

    // Remove existing popup
    var existing = document.getElementById('customerInfoPopup');
    if (existing) existing.remove();

    var popup = document.createElement('div');
    popup.id = 'customerInfoPopup';
    popup.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:3000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);animation:modalBgIn 0.2s ease;';

    var dateStr = new Date(order.date).toLocaleDateString('en-US', {weekday:'short',month:'short',day:'numeric',year:'numeric'});
    var locationStr = order.shippingAddress ? (order.shippingAddress.city + ', ' + order.shippingAddress.country) : 'N/A';

    // Initial popup with loading state for order history
    popup.innerHTML = '<div style="background:var(--admin-surface,#fff);border-radius:20px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:modalSlideUp 0.3s cubic-bezier(0.16,1,0.3,1);">' +
        '<div style="padding:20px;border-bottom:1px solid var(--admin-border,#eee);display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:var(--admin-surface,#fff);border-radius:20px 20px 0 0;z-index:1;">' +
            '<h3 style="margin:0;font-family:Playfair Display,serif;font-size:18px;color:var(--admin-text,#333);">👤 Customer Profile</h3>' +
            '<button onclick="document.getElementById(\'customerInfoPopup\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--admin-text-muted,#999);width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;">✕</button>' +
        '</div>' +
        '<div style="padding:20px;" id="customerPopupBody">' +
            // Customer Info Card
            '<div style="background:var(--admin-surface-2,#f5f5f5);border-radius:14px;padding:16px;margin-bottom:14px;border:1px solid var(--admin-border,#eee);">' +
                '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
                    '<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--admin-gold,#c9a962),var(--admin-gold-dark,#a08848));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;">' + (order.customer.name ? order.customer.name[0].toUpperCase() : '?') + '</div>' +
                    '<div>' +
                        '<div style="font-weight:600;font-size:15px;color:var(--admin-text,#333);">' + order.customer.name + '</div>' +
                        '<div style="font-size:12px;color:var(--admin-text-muted,#999);">' + order.customer.email + '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
                    '<div><span style="font-size:10px;color:var(--admin-text-muted,#999);text-transform:uppercase;">Phone</span><br><span style="font-size:13px;">' + (order.customer.phone || 'N/A') + '</span></div>' +
                    '<div><span style="font-size:10px;color:var(--admin-text-muted,#999);text-transform:uppercase;">Location</span><br><span style="font-size:13px;">' + locationStr + '</span></div>' +
                '</div>' +
            '</div>' +

            // Current order info
            '<div style="background:var(--admin-surface-2,#f5f5f5);border-radius:14px;padding:14px;margin-bottom:14px;border:1px solid var(--admin-border,#eee);">' +
                '<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--admin-text-muted,#999);margin-bottom:6px;">Current Order</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;">' +
                    '<div><span style="font-size:10px;color:var(--admin-text-muted,#999);">Order #</span><br><strong style="color:var(--admin-gold,#c9a962);font-size:12px;">' + order.orderNumber + '</strong></div>' +
                    '<div><span style="font-size:10px;color:var(--admin-text-muted,#999);">Date</span><br><strong style="font-size:12px;">' + dateStr + '</strong></div>' +
                    '<div><span style="font-size:10px;color:var(--admin-text-muted,#999);">Qty</span><br><strong style="font-size:12px;">' + order.quantity + '</strong></div>' +
                    '<div><span style="font-size:10px;color:var(--admin-text-muted,#999);">Revenue</span><br><strong style="color:var(--admin-gold,#c9a962);font-size:12px;">' + order.revenue.toFixed(3) + ' KWD</strong></div>' +
                '</div>' +
            '</div>' +

            // Order History Section — Loading
            '<div id="customerOrderHistory">' +
                '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--admin-text-muted,#999);margin-bottom:8px;display:flex;align-items:center;gap:6px;">📋 Order History <span style="font-size:10px;color:var(--admin-text-muted);">(loading...)</span></div>' +
                '<div style="text-align:center;padding:20px;color:var(--admin-text-muted,#999);"><div class="revenue-loading-spinner" style="width:24px;height:24px;margin:0 auto 8px;"></div>Loading order history...</div>' +
            '</div>' +
        '</div>' +
    '</div>';

    popup.addEventListener('click', function(e) { if (e.target === popup) popup.remove(); });
    document.body.appendChild(popup);

    // Fetch full customer order history
    var customerEmail = order.customer.email;
    if (customerEmail && customerEmail !== 'N/A') {
        var token = localStorage.getItem('arteva_token');
        fetch(API_BASE_URL + '/admin/customer-orders/' + encodeURIComponent(customerEmail), {
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(function(res) { return res.json(); })
        .then(function(result) {
            var historyContainer = document.getElementById('customerOrderHistory');
            if (!historyContainer) return;

            if (!result.success || !result.data) {
                historyContainer.innerHTML = '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--admin-text-muted,#999);margin-bottom:8px;">📋 Order History</div>' +
                    '<p style="text-align:center;padding:16px;color:var(--admin-text-muted,#999);font-size:12px;">Could not load order history</p>';
                return;
            }

            var data = result.data;
            var stats = data.stats;
            var orders = data.orders;

            // Status badge colors
            var statusColors = {
                'pending': '#f59e0b',
                'confirmed': '#3b82f6',
                'packed': '#8b5cf6',
                'processing': '#6366f1',
                'handed_over': '#0ea5e9',
                'out_for_delivery': '#14b8a6',
                'delivered': '#22c55e',
                'cancelled': '#ef4444'
            };

            var ordersHtml = orders.map(function(o) {
                var d = new Date(o.createdAt).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'});
                var statusColor = statusColors[o.orderStatus] || '#888';
                var itemNames = o.items.map(function(i) { return i.name + ' ×' + i.quantity; }).join(', ');
                
                return '<div style="background:var(--admin-surface-2,#f5f5f5);border:1px solid var(--admin-border,#eee);border-radius:10px;padding:10px 12px;margin-bottom:6px;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
                        '<span style="font-weight:600;font-size:12px;color:var(--admin-gold,#c9a962);">' + o.orderNumber + '</span>' +
                        '<span style="font-size:10px;padding:2px 6px;border-radius:8px;background:' + statusColor + '22;color:' + statusColor + ';font-weight:600;">' + o.orderStatus.replace(/_/g,' ') + '</span>' +
                    '</div>' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                        '<span style="font-size:11px;color:var(--admin-text-muted,#999);">' + d + ' • ' + o.itemCount + ' item' + (o.itemCount !== 1 ? 's' : '') + '</span>' +
                        '<span style="font-weight:700;font-size:13px;font-family:Playfair Display,serif;color:var(--admin-text,#333);">' + o.total.toFixed(3) + ' KWD</span>' +
                    '</div>' +
                    '<div style="font-size:10px;color:var(--admin-text-muted,#888);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + itemNames + '</div>' +
                '</div>';
            }).join('');

            var memberSince = data.customer.memberSince ? new Date(data.customer.memberSince).toLocaleDateString('en-US', {month:'short',year:'numeric'}) : 'N/A';

            historyContainer.innerHTML =
                // Stats row
                '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;">' +
                    '<div style="background:var(--admin-surface-2,#f5f5f5);padding:10px;border-radius:10px;border:1px solid var(--admin-border,#eee);text-align:center;">' +
                        '<div style="font-size:16px;font-weight:700;font-family:Playfair Display,serif;color:var(--admin-text,#333);">' + stats.totalOrders + '</div>' +
                        '<div style="font-size:9px;text-transform:uppercase;color:var(--admin-text-muted,#999);">Total Orders</div>' +
                    '</div>' +
                    '<div style="background:var(--admin-surface-2,#f5f5f5);padding:10px;border-radius:10px;border:1px solid var(--admin-border,#eee);text-align:center;">' +
                        '<div style="font-size:16px;font-weight:700;font-family:Playfair Display,serif;color:#22c55e;">' + stats.paidOrders + '</div>' +
                        '<div style="font-size:9px;text-transform:uppercase;color:var(--admin-text-muted,#999);">Paid</div>' +
                    '</div>' +
                    '<div style="background:var(--admin-surface-2,#f5f5f5);padding:10px;border-radius:10px;border:1px solid var(--admin-border,#eee);text-align:center;">' +
                        '<div style="font-size:14px;font-weight:700;font-family:Playfair Display,serif;color:var(--admin-gold,#c9a962);">' + stats.lifetimeValue.toFixed(3) + '</div>' +
                        '<div style="font-size:9px;text-transform:uppercase;color:var(--admin-text-muted,#999);">Lifetime KWD</div>' +
                    '</div>' +
                    '<div style="background:var(--admin-surface-2,#f5f5f5);padding:10px;border-radius:10px;border:1px solid var(--admin-border,#eee);text-align:center;">' +
                        '<div style="font-size:12px;font-weight:600;color:var(--admin-text,#333);">' + memberSince + '</div>' +
                        '<div style="font-size:9px;text-transform:uppercase;color:var(--admin-text-muted,#999);">Member Since</div>' +
                    '</div>' +
                '</div>' +

                // Orders list header
                '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--admin-text-muted,#999);margin-bottom:8px;display:flex;align-items:center;gap:6px;">📋 All Orders <span style="font-size:10px;background:var(--admin-surface-2,#f5f5f5);padding:1px 6px;border-radius:8px;">' + orders.length + '</span></div>' +

                // Orders list (scrollable)
                '<div style="max-height:300px;overflow-y:auto;padding-right:4px;">' +
                    (orders.length > 0 ? ordersHtml : '<p style="text-align:center;padding:20px;color:var(--admin-text-muted,#999);font-size:12px;">No orders found</p>') +
                '</div>';
        })
        .catch(function(err) {
            console.error('Customer order history error:', err);
            var historyContainer = document.getElementById('customerOrderHistory');
            if (historyContainer) {
                historyContainer.innerHTML = '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--admin-text-muted,#999);margin-bottom:8px;">📋 Order History</div>' +
                    '<p style="text-align:center;padding:16px;color:#f87171;font-size:12px;">Failed to load order history</p>';
            }
        });
    }
};

// Export functions
window.initRevenueProtection = initRevenueProtection;
window.isRevenueUnlocked = isRevenueUnlocked;
window.showRevenueHistoryModal = showRevenueHistoryModal;
