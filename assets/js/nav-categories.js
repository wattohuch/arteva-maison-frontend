/**
 * ARTEVA Maison - Dynamic Navigation Categories
 * Fetches categories from API and populates desktop dropdown + mobile submenu
 * Include this script on every customer-facing page AFTER api.js
 */
(function () {
    'use strict';

    /**
     * Get the current language from localStorage or HTML lang attribute
     */
    function getCurrentLang() {
        return localStorage.getItem('site_lang') || document.documentElement.lang || 'en';
    }

    /**
     * Get the display name for a category based on current language
     */
    function getCategoryName(cat) {
        const lang = getCurrentLang();
        if (lang === 'ar' && cat.nameAr) {
            return cat.nameAr;
        }
        return cat.name;
    }

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

            // Store categories globally so they can be re-rendered on language switch
            window._navCategories = categories;

            renderNavCategories(categories);

        } catch (err) {
            console.error('Failed to load navigation categories:', err);
        }
    });

    /**
     * Render categories into desktop dropdown and mobile submenu
     */
    function renderNavCategories(categories) {
        // --- Desktop Dropdown ---
        const desktopDropdown = document.getElementById('categoryDropdown');
        if (desktopDropdown) {
            desktopDropdown.innerHTML = '';
            categories.forEach(cat => {
                const link = document.createElement('a');
                link.href = 'collection.html?cat=' + cat.slug;
                link.className = 'dropdown-item';
                link.textContent = getCategoryName(cat);
                desktopDropdown.appendChild(link);
            });
            // Add "View All" at the end
            const viewAll = document.createElement('a');
            viewAll.href = 'collections.html';
            viewAll.className = 'dropdown-item';
            viewAll.setAttribute('data-i18n', 'view_all');
            viewAll.textContent = getCurrentLang() === 'ar' ? 'عرض الكل' : 'View All';
            desktopDropdown.appendChild(viewAll);
        }

        // --- Mobile Submenu ---
        const mobileSubmenu = document.getElementById('mobileCategorySubmenu');
        if (mobileSubmenu) {
            mobileSubmenu.innerHTML = '';
            categories.forEach(cat => {
                const link = document.createElement('a');
                link.href = 'collection.html?cat=' + cat.slug;
                link.textContent = getCategoryName(cat);
                mobileSubmenu.appendChild(link);
            });
            // Add "View All" at the end
            const viewAll = document.createElement('a');
            viewAll.href = 'collections.html';
            viewAll.setAttribute('data-i18n', 'view_all');
            viewAll.textContent = getCurrentLang() === 'ar' ? 'عرض الكل' : 'View All';
            mobileSubmenu.appendChild(viewAll);
        }

        // Re-apply translations if i18n is available
        if (window.updatePageTranslations) {
            window.updatePageTranslations();
        }
    }

    // Re-render categories when language changes
    window.addEventListener('languageChanged', function () {
        if (window._navCategories) {
            renderNavCategories(window._navCategories);
        }
    });

    // Export for external use
    window.renderNavCategories = renderNavCategories;
})();

