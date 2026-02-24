/**
 * Revenue Authentication Module
 * Handles secure revenue visibility with password re-authentication
 */

let revenueUnlocked = false;
let revenueUnlockTimeout = null;
const REVENUE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize revenue protection
 */
function initRevenueProtection() {
    const user = AuthAPI.getUser();
    
    // Only apply to owner
    if (!user || user.role !== 'owner') {
        return;
    }

    const revenueCard = document.querySelector('.stat-card:has(#statRevenue)');
    if (!revenueCard) return;

    // Add blur class and click handler
    revenueCard.classList.add('revenue-blurred');
    revenueCard.style.cursor = 'pointer';
    revenueCard.title = 'Click to unlock revenue (password required)';

    revenueCard.addEventListener('click', () => {
        if (!revenueUnlocked) {
            showRevenueAuthModal();
        }
    });

    // Blur the revenue value
    const revenueValue = document.getElementById('statRevenue');
    if (revenueValue && !revenueUnlocked) {
        revenueValue.textContent = '•••••';
        revenueValue.style.filter = 'blur(8px)';
    }
}

/**
 * Show password authentication modal
 */
function showRevenueAuthModal() {
    const modal = document.createElement('div');
    modal.className = 'admin-modal';
    modal.innerHTML = `
        <div class="admin-modal-content" style="max-width: 400px;">
            <div class="admin-modal-header">
                <h2>🔐 Unlock Revenue</h2>
                <button class="admin-modal-close" onclick="closeRevenueAuthModal()">&times;</button>
            </div>
            <div class="admin-modal-body">
                <p style="margin-bottom: 20px; color: var(--admin-text-muted);">
                    Enter your password to view revenue statistics
                </p>
                <form id="revenueAuthForm">
                    <div class="form-group">
                        <label for="revenuePassword">Password</label>
                        <input 
                            type="password" 
                            id="revenuePassword" 
                            class="admin-input" 
                            placeholder="Enter your password"
                            required
                            autocomplete="current-password"
                        >
                    </div>
                    <div id="revenueAuthError" class="error-message" style="display: none; color: #ef4444; margin-top: 10px;"></div>
                </form>
            </div>
            <div class="admin-modal-footer">
                <button class="admin-btn secondary" onclick="closeRevenueAuthModal()">Cancel</button>
                <button class="admin-btn" onclick="authenticateRevenue()">Unlock</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.classList.remove('hidden');

    // Focus password input
    setTimeout(() => {
        document.getElementById('revenuePassword').focus();
    }, 100);

    // Handle Enter key
    document.getElementById('revenueAuthForm').addEventListener('submit', (e) => {
        e.preventDefault();
        authenticateRevenue();
    });
}

/**
 * Close authentication modal
 */
window.closeRevenueAuthModal = function() {
    const modal = document.querySelector('.admin-modal');
    if (modal) {
        modal.remove();
    }
};

/**
 * Authenticate and unlock revenue
 */
window.authenticateRevenue = async function() {
    const passwordInput = document.getElementById('revenuePassword');
    const errorDiv = document.getElementById('revenueAuthError');
    const unlockBtn = document.querySelector('.admin-modal-footer .admin-btn:not(.secondary)');
    
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
        // Call backend re-auth endpoint
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
            // Password correct - unlock revenue
            revenueUnlocked = true;
            unlockRevenue();
            closeRevenueAuthModal();
            
            // Set timeout to re-blur after 5 minutes
            if (revenueUnlockTimeout) {
                clearTimeout(revenueUnlockTimeout);
            }
            revenueUnlockTimeout = setTimeout(() => {
                lockRevenue();
            }, REVENUE_TIMEOUT);

            // Show success toast
            if (typeof showToast === 'function') {
                showToast('Success', 'Revenue unlocked for 5 minutes', 'success');
            }
        } else {
            // Password incorrect
            errorDiv.textContent = data.message || 'Incorrect password';
            errorDiv.style.display = 'block';
            unlockBtn.disabled = false;
            unlockBtn.textContent = 'Unlock';
            passwordInput.value = '';
            passwordInput.focus();
        }
    } catch (error) {
        console.error('Revenue auth error:', error);
        errorDiv.textContent = 'Authentication failed. Please try again.';
        errorDiv.style.display = 'block';
        unlockBtn.disabled = false;
        unlockBtn.textContent = 'Unlock';
    }
};

/**
 * Unlock revenue display
 */
function unlockRevenue() {
    const revenueCard = document.querySelector('.stat-card:has(#statRevenue)');
    const revenueValue = document.getElementById('statRevenue');
    
    if (revenueCard) {
        revenueCard.classList.remove('revenue-blurred');
        revenueCard.style.cursor = 'default';
        revenueCard.title = 'Revenue (unlocked for 5 minutes)';
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
    
    const revenueCard = document.querySelector('.stat-card:has(#statRevenue)');
    const revenueValue = document.getElementById('statRevenue');
    
    if (revenueCard) {
        revenueCard.classList.add('revenue-blurred');
        revenueCard.style.cursor = 'pointer';
        revenueCard.title = 'Click to unlock revenue (password required)';
    }

    if (revenueValue) {
        revenueValue.textContent = '•••••';
        revenueValue.style.filter = 'blur(8px)';
    }

    // Show toast
    if (typeof showToast === 'function') {
        showToast('Info', 'Revenue locked. Click to unlock again.', 'info');
    }
}

/**
 * Check if revenue is unlocked
 */
function isRevenueUnlocked() {
    return revenueUnlocked;
}

// Export functions
window.initRevenueProtection = initRevenueProtection;
window.isRevenueUnlocked = isRevenueUnlocked;
