/**
 * ARTEVA Maison - Dynamic Navigation Categories
 * Fetches categories from API and populates desktop dropdown + mobile submenu
 * Also injects a "New Arrivals" top-level nav link
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

            // Find the "New Arrivals" category
            const newArrivals = categories.find(cat =>
                cat.slug === 'new-arrivals' || cat.name.toLowerCase().includes('new arrival')
            );

            // --- Inject "New Arrivals" top-level nav link (Desktop) ---
            const mainNav = document.getElementById('mainNav');
            if (mainNav && newArrivals) {
                // Find the Categories nav item (the one with dropdown)
                const navItems = mainNav.querySelectorAll('.nav-item');
                let categoriesNavItem = null;
                navItems.forEach(item => {
                    if (item.querySelector('.dropdown-menu')) {
                        categoriesNavItem = item;
                    }
                });
                if (categoriesNavItem) {
                    const newArrDiv = document.createElement('div');
                    newArrDiv.className = 'nav-item';
                    const newArrLink = document.createElement('a');
                    newArrLink.href = 'collection.html?cat=' + newArrivals.slug;
                    newArrLink.className = 'nav-link';
                    newArrLink.setAttribute('data-i18n', 'new_arrivals');
                    newArrLink.textContent = 'New Arrivals';
                    newArrDiv.appendChild(newArrLink);
                    categoriesNavItem.parentNode.insertBefore(newArrDiv, categoriesNavItem);
                }
            }

            // --- Inject "New Arrivals" mobile nav link ---
            const mobileNav = document.querySelector('.mobile-nav');
            if (mobileNav && newArrivals) {
                const submenuItem = mobileNav.querySelector('.mobile-nav-item.has-submenu');
                const insertBefore = submenuItem || mobileNav.querySelectorAll('.mobile-nav-item')[1];
                if (insertBefore) {
                    const newArrDiv = document.createElement('div');
                    newArrDiv.className = 'mobile-nav-item';
                    const newArrLink = document.createElement('a');
                    newArrLink.href = 'collection.html?cat=' + newArrivals.slug;
                    newArrLink.className = 'mobile-nav-link';
                    newArrLink.setAttribute('data-i18n', 'new_arrivals');
                    newArrLink.textContent = 'New Arrivals';
                    newArrDiv.appendChild(newArrLink);
                    insertBefore.parentNode.insertBefore(newArrDiv, insertBefore);
                }
            }

            // --- Desktop Dropdown ---
            const desktopDropdown = document.getElementById('categoryDropdown');
            if (desktopDropdown) {
                desktopDropdown.innerHTML = '';
                categories.forEach(cat => {
                    const link = document.createElement('a');
                    link.href = 'collection.html?cat=' + cat.slug;
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
                    link.href = 'collection.html?cat=' + cat.slug;
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
