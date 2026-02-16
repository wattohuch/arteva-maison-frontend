/**
 * ARTEVA Maison - Addresses Page Script
 * Manages user addresses (View, Add, Delete)
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (!AuthAPI.isLoggedIn()) {
        window.location.href = 'account.html?redirect=addresses.html';
        return;
    }

    // Initialize currency
    if (window.CurrencyAPI) {
        window.CurrencyAPI.init();
    }

    // Map Variables
    let map = null;
    let marker = null;

    // Modal Handlers
    const modal = document.getElementById('addressModal');
    const closeBtn = document.querySelector('.close-modal');

    // Delegate event for "Add Address" card - Use document level to be safe
    document.addEventListener('click', (e) => {
        const addCard = e.target.closest('.add-address-card');
        if (addCard) {
            console.log('Add Address clicked');
            if (modal) {
                modal.style.display = 'block';
                // Initialize map after modal is visible
                setTimeout(initMap, 200);
            } else {
                console.error('Modal not found');
            }
        }
    });

    if (closeBtn && modal) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        }
    }

    if (modal) {
        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }
    }

    // Map Initialization
    function initMap() {
        if (map) {
            map.invalidateSize();
            return;
        }

        // Fix for Leaflet marker icons not loading due to browser restrictions
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        // Default to Kuwait City
        const defaultLat = 29.3759;
        const defaultLng = 47.9774;

        map = L.map('addressMap').setView([defaultLat, defaultLng], 11);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        map.on('click', onMapClick);

        // Locate Button
        document.getElementById('locateBtn').addEventListener('click', (e) => {
            e.preventDefault();
            const btn = e.currentTarget;
            btn.textContent = 'Locating...';

            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(position => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    updateMarker(lat, lng);
                    map.setView([lat, lng], 15);
                    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg> Use My Current Location';
                }, error => {
                    console.error("Error getting location:", error);
                    alert("Could not get your location. Please check browser permissions.");
                    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg> Use My Current Location';
                });
            } else {
                alert("Geolocation is not supported by your browser");
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg> Use My Current Location';
            }
        });
    }

    function onMapClick(e) {
        updateMarker(e.latlng.lat, e.latlng.lng);
    }

    function updateMarker(lat, lng) {
        if (marker) {
            marker.setLatLng([lat, lng]);
        } else {
            marker = L.marker([lat, lng]).addTo(map);
        }

        document.getElementById('lat').value = lat;
        document.getElementById('lng').value = lng;
    }

    // Load Addresses (don't await this to block UI interaction initialization)
    loadAddresses();

    // Add Address Form
    const addAddressForm = document.getElementById('addAddressForm');
    if (addAddressForm) {
        addAddressForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            const formData = new FormData(e.target);
            const address = {
                label: formData.get('label'),
                street: formData.get('street'),
                city: formData.get('city'),
                zipCode: formData.get('zipCode'),
                phone: formData.get('phone'),
                country: 'Kuwait', // Default for now
                isDefault: formData.get('isDefault') === 'on',
                coordinates: {
                    lat: parseFloat(formData.get('lat')),
                    lng: parseFloat(formData.get('lng'))
                }
            };

            try {
                await AuthAPI.addAddress(address);
                if (modal) modal.style.display = 'none';
                e.target.reset();
                loadAddresses();
                showNotification('Address added successfully', 'success');
            } catch (error) {
                console.error('Failed to add address:', error);
                showNotification(error.message || 'Failed to add address', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Save Address';
            }
        });
    }

    // Logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            AuthAPI.logout();
            window.location.href = 'index.html';
        });
    }
});

async function loadAddresses() {
    const list = document.getElementById('addressesList');

    try {
        const response = await AuthAPI.getMe();
        if (!response.success || !response.data) {
            throw new Error('Failed to fetch user data');
        }

        renderAddresses(response.data.addresses || []);

    } catch (error) {
        console.error('Error loading addresses:', error);
        list.innerHTML = `<p class="error-text">Failed to load addresses. Please refresh.</p>`;
    }
}

function renderAddresses(addresses) {
    const list = document.getElementById('addressesList');

    const addressCards = addresses.map(addr => `
        <div class="address-card ${addr.isDefault ? 'default' : ''}">
            <div class="address-label">
                ${addr.label}
                ${addr.isDefault ? '<span class="default-badge">Default</span>' : ''}
            </div>
            <div class="address-details">
                ${addr.street}<br>
                ${addr.city} ${addr.zipCode || ''}<br>
                ${addr.phone ? `Phone: ${addr.phone}<br>` : ''}
                ${addr.country || 'Kuwait'}
            </div>
            <div class="address-actions">
                <span class="btn-text-sm" onclick="editAddress('${addr._id}')" style="display:none">Edit</span>
                <span class="btn-text-sm text-danger" onclick="deleteAddress('${addr._id}')">Delete</span>
            </div>
        </div>
    `).join('');

    // Append the "Add New" card at the end
    const addCard = `
        <div class="add-address-card">
            <div class="add-icon">+</div>
            <div>Add New Address</div>
        </div>
    `;

    list.innerHTML = addressCards + addCard;
}

async function deleteAddress(id) {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
        await AuthAPI.deleteAddress(id);
        loadAddresses();
        showNotification('Address deleted', 'success');
    } catch (error) {
        console.error('Failed to delete address:', error);
        showNotification('Failed to delete address', 'error');
    }
}

// Notification logic is handled by main.js
// If missing, we can add a simple fallback here, but not one that overwrites window.showNotification
if (!window.showNotification) {
    window.showNotification = (message, type = 'info') => alert(message);
}
