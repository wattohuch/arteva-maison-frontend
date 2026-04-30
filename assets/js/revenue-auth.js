/**
 * Revenue Authentication & History Module
 * Handles secure revenue visibility with PIN re-authentication
 * and displays full revenue history dashboard
 */

let revenueUnlocked = false;
let revenueUnlockTimeout = null;
const REVENUE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Initialize revenue protection
 */
function initRevenueProtection() {
    const user = AuthAPI.getUser();
    
    // Only apply to owner
    if (!user || user.role !== 'owner') {
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
        <div class="admin-modal-content" style="max-width: 900px;">
            <div class="admin-modal-header">
                <h2>💰 Revenue Dashboard</h2>
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

    // Fetch revenue data
    try {
        const response = await fetch(`${API_BASE_URL}/admin/revenue-history`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('arteva_token')}`
            }
        });

        const result = await response.json();

        if (result.success) {
            renderRevenueHistory(result.data);
        } else {
            document.getElementById('revenueHistoryBody').innerHTML = `
                <div style="text-align: center; padding: 40px; color: #f87171;">
                    <p>Failed to load revenue data</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Revenue history error:', error);
        document.getElementById('revenueHistoryBody').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #f87171;">
                <p>Failed to load revenue data</p>
            </div>
        `;
    }
}

/**
 * Render the revenue history data into the modal
 */
function renderRevenueHistory(data) {
    const body = document.getElementById('revenueHistoryBody');
    if (!body) return;

    const { summary, dailyBreakdown, monthlyBreakdown } = data;

    // Find best day
    const bestDay = dailyBreakdown.length > 0 
        ? dailyBreakdown.reduce((max, d) => d.revenue > max.revenue ? d : max, dailyBreakdown[0])
        : null;

    body.innerHTML = `
        <!-- Summary Cards -->
        <div class="revenue-summary-grid">
            <div class="revenue-summary-card revenue-today">
                <div class="revenue-summary-icon">📅</div>
                <div class="revenue-summary-info">
                    <span class="revenue-summary-label">Today</span>
                    <span class="revenue-summary-value">${summary.today.revenue.toFixed(3)} <small>KWD</small></span>
                    <span class="revenue-summary-orders">${summary.today.orders} order${summary.today.orders !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <div class="revenue-summary-card revenue-week">
                <div class="revenue-summary-icon">📊</div>
                <div class="revenue-summary-info">
                    <span class="revenue-summary-label">This Week</span>
                    <span class="revenue-summary-value">${summary.thisWeek.revenue.toFixed(3)} <small>KWD</small></span>
                    <span class="revenue-summary-orders">${summary.thisWeek.orders} order${summary.thisWeek.orders !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <div class="revenue-summary-card revenue-month">
                <div class="revenue-summary-icon">📈</div>
                <div class="revenue-summary-info">
                    <span class="revenue-summary-label">This Month</span>
                    <span class="revenue-summary-value">${summary.thisMonth.revenue.toFixed(3)} <small>KWD</small></span>
                    <span class="revenue-summary-orders">${summary.thisMonth.orders} order${summary.thisMonth.orders !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <div class="revenue-summary-card revenue-alltime">
                <div class="revenue-summary-icon">💎</div>
                <div class="revenue-summary-info">
                    <span class="revenue-summary-label">All Time</span>
                    <span class="revenue-summary-value">${summary.allTime.revenue.toFixed(3)} <small>KWD</small></span>
                    <span class="revenue-summary-orders">${summary.allTime.orders} order${summary.allTime.orders !== 1 ? 's' : ''}</span>
                </div>
            </div>
        </div>

        <!-- Tab Navigation -->
        <div class="revenue-tabs">
            <button class="revenue-tab active" onclick="switchRevenueTab('daily', this)">Daily (30 days)</button>
            <button class="revenue-tab" onclick="switchRevenueTab('monthly', this)">Monthly (12 months)</button>
        </div>

        <!-- Daily Breakdown Table -->
        <div id="revenueTabDaily" class="revenue-tab-content">
            ${dailyBreakdown.length === 0 
                ? '<p style="text-align: center; padding: 32px; color: var(--admin-text-muted);">No revenue data yet</p>'
                : `<div class="admin-table-wrap">
                    <div class="admin-table-scroll">
                        <table class="admin-table revenue-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th style="text-align: center;">Orders</th>
                                    <th style="text-align: right;">Revenue (KWD)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${dailyBreakdown.map(d => {
                                    const dateObj = new Date(d.date + 'T00:00:00');
                                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                                    const formatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                    const isBest = bestDay && d.date === bestDay.date;
                                    return `
                                        <tr class="${isBest ? 'revenue-best-day' : ''}">
                                            <td>
                                                <span style="color: var(--admin-text-muted); font-size: 11px; margin-right: 6px;">${dayName}</span>
                                                ${formatted}
                                                ${isBest ? '<span class="revenue-best-badge">🏆 Best</span>' : ''}
                                            </td>
                                            <td style="text-align: center;">${d.orders}</td>
                                            <td style="text-align: right; font-weight: 600; font-family: 'Playfair Display', serif;">${d.revenue.toFixed(3)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`
            }
        </div>

        <!-- Monthly Breakdown Table -->
        <div id="revenueTabMonthly" class="revenue-tab-content" style="display: none;">
            ${monthlyBreakdown.length === 0 
                ? '<p style="text-align: center; padding: 32px; color: var(--admin-text-muted);">No revenue data yet</p>'
                : `<div class="admin-table-wrap">
                    <div class="admin-table-scroll">
                        <table class="admin-table revenue-table">
                            <thead>
                                <tr>
                                    <th>Month</th>
                                    <th style="text-align: center;">Orders</th>
                                    <th style="text-align: right;">Revenue (KWD)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${monthlyBreakdown.map(m => `
                                    <tr>
                                        <td style="font-weight: 500;">${MONTH_NAMES[m.month - 1]} ${m.year}</td>
                                        <td style="text-align: center;">${m.orders}</td>
                                        <td style="text-align: right; font-weight: 600; font-family: 'Playfair Display', serif;">${m.revenue.toFixed(3)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`
            }
        </div>

        <div style="text-align: center; margin-top: 16px;">
            <p style="color: var(--admin-text-muted); font-size: 11px;">
                🔒 Auto-locks in 5 minutes • Revenue data from paid orders only
            </p>
        </div>
    `;
}

/**
 * Switch between daily and monthly tabs
 */
window.switchRevenueTab = function(tab, btn) {
    // Update tab buttons
    document.querySelectorAll('.revenue-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    // Show/hide content
    document.getElementById('revenueTabDaily').style.display = tab === 'daily' ? 'block' : 'none';
    document.getElementById('revenueTabMonthly').style.display = tab === 'monthly' ? 'block' : 'none';
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

// Export functions
window.initRevenueProtection = initRevenueProtection;
window.isRevenueUnlocked = isRevenueUnlocked;
window.showRevenueHistoryModal = showRevenueHistoryModal;
