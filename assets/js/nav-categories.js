/**
 * ARTEVA Maison - Dynamic Navigation Categories
 * Fetches categories from API and populates desktop dropdown + mobile submenu
 * Include this script on every customer-facing page AFTER api.js
 */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function () {
        try {
            // Wait for CategoriesAPI to be available
            if (typeof CategoriesAPI === 'undefined') {
                console.warn('CategoriesAPI not available, skipping dynamic nav');
                return;
            }

            const response = await CategoriesAPI.getAll();
            if (!response || !response.success || !response.data) return;

            // Filter active categories only
            const categories = response.data.filter(cat => cat.isActive !== false);

            // --- Desktop Dropdown ---
            const desktopDropdown = document.getElementById('categoryDropdown');
            if (desktopDropdown) {
                desktopDropdown.innerHTML = '';
                categories.forEach(cat => {
                    const link = document.createElement('a');
                    link.href = `collection.html?cat=${cat.slug}`;
                    link.className = 'dropdown-item';
                    link.textContent = cat.name;
                    desktopDropdown.appendChild(link);
                });
                // Add "View All" at the end
                const viewAll = document.createElement('a');
                viewAll.href = 'collections.html';
                viewAll.className = 'dropdown-item';
                viewAll.setAttribute('data-i18n', 'view_all');
                viewAll.textContent = 'View All';
                desktopDropdown.appendChild(viewAll);
            }

            // --- Mobile Submenu ---
            const mobileSubmenu = document.getElementById('mobileCategorySubmenu');
            if (mobileSubmenu) {
                mobileSubmenu.innerHTML = '';
                categories.forEach(cat => {
                    const link = document.createElement('a');
                    link.href = `collection.html?cat=${cat.slug}`;
                    link.textContent = cat.name;
                    mobileSubmenu.appendChild(link);
                });
                // Add "View All" at the end
                const viewAll = document.createElement('a');
                viewAll.href = 'collections.html';
                viewAll.setAttribute('data-i18n', 'view_all');
                viewAll.textContent = 'View All';
                mobileSubmenu.appendChild(viewAll);
            }

            // Re-apply translations if i18n is available
            if (window.updatePageTranslations) {
                window.updatePageTranslations();
            }

        } catch (err) {
            console.error('Failed to load navigation categories:', err);
        }
    });
})();
