/**
 * ARTÉVA Maison — All Products Page
 * Fetches, filters, sorts, and renders all products with premium animations
 */

(function () {
    'use strict';

    let allProducts = [];
    let allCategories = [];
    let currentFilter = 'all';
    let currentSort = 'newest';
    let searchQuery = '';
    let productsPerPage = 12;
    let currentPage = 1;

    // ============================================
    // Initialize
    // ============================================
    document.addEventListener('DOMContentLoaded', async () => {
        await Promise.all([loadProducts(), loadCategories()]);
        initFilterPills();
        initSortSelect();
        initSearch();
        renderProducts();
    });

    // ============================================
    // Data Loading
    // ============================================
    async function loadProducts() {
        const grid = document.getElementById('allProductsGrid');
        if (!grid) return;

        // Show shimmer loading
        grid.innerHTML = Array(8).fill(0).map(() => `
            <div class="product-card-skeleton">
                <div class="skeleton-image shimmer"></div>
                <div class="skeleton-text shimmer" style="width: 75%; height: 14px;"></div>
                <div class="skeleton-text shimmer" style="width: 50%; height: 12px;"></div>
            </div>
        `).join('');

        try {
            const response = await ProductsAPI.getAll({ limit: 200 });
            if (response.success) {
                allProducts = response.data;
                // Update product count
                const countEl = document.getElementById('productCount');
                if (countEl) countEl.textContent = allProducts.length;
            }
        } catch (err) {
            grid.innerHTML = '<p class="text-center" style="grid-column: 1/-1; padding: 60px 20px; color: var(--text-muted);">Unable to load products. Please try again later.</p>';
        }
    }

    async function loadCategories() {
        try {
            const response = await CategoriesAPI.getAll();
            if (response.success) {
                allCategories = response.data;
            }
        } catch (err) {
            // Silently fail — filter pills just won't show
        }
    }

    // ============================================
    // Filter Pills
    // ============================================
    function initFilterPills() {
        const container = document.getElementById('filterPills');
        if (!container || !allCategories.length) return;

        const lang = localStorage.getItem('site_lang') || 'en';

        let html = `<button class="filter-pill active" data-filter="all">${lang === 'ar' ? 'الكل' : 'All'}</button>`;

        allCategories.forEach(cat => {
            const name = lang === 'ar' && cat.nameAr ? cat.nameAr : cat.name;
            html += `<button class="filter-pill" data-filter="${cat.slug || cat._id}">${name}</button>`;
        });

        container.innerHTML = html;

        // Bind clicks
        container.querySelectorAll('.filter-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                container.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                currentFilter = pill.dataset.filter;
                currentPage = 1;
                renderProducts();
            });
        });
    }

    // ============================================
    // Sort
    // ============================================
    function initSortSelect() {
        const sortSelect = document.getElementById('productSort');
        if (!sortSelect) return;

        sortSelect.addEventListener('change', () => {
            currentSort = sortSelect.value;
            currentPage = 1;
            renderProducts();
        });
    }

    // ============================================
    // Search
    // ============================================
    function initSearch() {
        const searchInput = document.getElementById('productSearch');
        if (!searchInput) return;

        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchQuery = searchInput.value.toLowerCase().trim();
                currentPage = 1;
                renderProducts();
            }, 300);
        });
    }

    // ============================================
    // Filter + Sort + Render
    // ============================================
    function getFilteredProducts() {
        let filtered = [...allProducts];

        // Filter by category
        if (currentFilter !== 'all') {
            filtered = filtered.filter(p => {
                // Special case: "new-arrivals" also matches isNewArrival flag
                if (currentFilter === 'new-arrivals' && (p.isNewArrival || p.isNew)) {
                    return true;
                }
                // Check primary category
                const cat = typeof p.category === 'object' ? p.category : null;
                if (cat && (cat.slug === currentFilter || cat._id === currentFilter)) {
                    return true;
                }
                if (!cat && p.category === currentFilter) {
                    return true;
                }
                // Check additionalCategories
                if (p.additionalCategories && Array.isArray(p.additionalCategories)) {
                    return p.additionalCategories.some(ac => {
                        if (typeof ac === 'object') {
                            return ac.slug === currentFilter || ac._id === currentFilter;
                        }
                        return ac === currentFilter;
                    });
                }
                return false;
            });
        }

        // Filter by search
        if (searchQuery) {
            filtered = filtered.filter(p => {
                const name = (p.name || '').toLowerCase();
                const nameAr = (p.nameAr || '').toLowerCase();
                const desc = (p.description || '').toLowerCase();
                return name.includes(searchQuery) || nameAr.includes(searchQuery) || desc.includes(searchQuery);
            });
        }

        // Sort
        switch (currentSort) {
            case 'newest':
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'price-low':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'name-az':
                filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'name-za':
                filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
                break;
        }

        return filtered;
    }

    function renderProducts() {
        const grid = document.getElementById('allProductsGrid');
        const countEl = document.getElementById('productCount');
        if (!grid) return;

        const filtered = getFilteredProducts();
        const totalPages = Math.ceil(filtered.length / productsPerPage);
        const start = (currentPage - 1) * productsPerPage;
        const pageProducts = filtered.slice(start, start + productsPerPage);

        // Update count
        if (countEl) countEl.textContent = filtered.length;

        if (pageProducts.length === 0) {
            const lang = localStorage.getItem('site_lang') || 'en';
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">🔍</div>
                    <p style="color: var(--text-muted); font-size: 16px;">${lang === 'ar' ? 'لا توجد منتجات' : 'No products found'}</p>
                    <p style="color: var(--text-muted); font-size: 13px; margin-top: 8px;">${lang === 'ar' ? 'جرب تغيير الفلتر' : 'Try changing your filters'}</p>
                </div>`;
            renderPagination(0, 0);
            return;
        }

        // Cache products for addToCart
        pageProducts.forEach(product => {
            if (window.cacheProduct) window.cacheProduct(product);
        });

        const lang = localStorage.getItem('site_lang') || 'en';
        grid.innerHTML = pageProducts.map((product, i) => {
            const name = lang === 'ar' && product.nameAr ? product.nameAr : product.name;
            const currency = lang === 'ar' ? 'د.ك' : 'KWD';
            const image = product.images?.[0]?.url || 'assets/images/products/placeholder.png';
            const isComingSoon = product.isComingSoon;

            let badges = '';
            if (product.stock === 0 && !isComingSoon) {
                badges += `<span class="product-badge badge-out-stock" style="background: #ef4444; color: white;">${lang === 'ar' ? 'غير متوفر' : 'Out of Stock'}</span>`;
            } else if (isComingSoon) {
                badges += `<span class="product-badge badge-coming-soon" style="background: #3b82f6; color: white;">${lang === 'ar' ? 'قريباً' : 'Coming Soon'}</span>`;
            } else if (product.isNew || product.isNewArrival) {
                badges += `<span class="product-badge badge-new">${lang === 'ar' ? 'جديد' : 'New'}</span>`;
            }

            const btnText = isComingSoon ? (lang === 'ar' ? 'قريباً' : 'Coming Soon') : (product.stock === 0 ? (lang === 'ar' ? 'غير متوفر' : 'Out of Stock') : (lang === 'ar' ? 'أضف للسلة' : 'Add to Cart'));
            const btnDisabled = isComingSoon || product.stock === 0 ? 'disabled style="opacity:0.7; cursor:default;"' : '';

            return `
            <div class="product-card" data-animate="fade-up" style="--stagger: ${i}; animation-delay: ${i * 0.06}s;">
                <div class="product-image">
                    <a href="product.html?id=${product._id}">
                        <img src="${image}" alt="${name}" loading="lazy" onerror="if(typeof handleImageError==='function') handleImageError(this); else this.src='assets/images/products/placeholder.png';">
                    </a>
                    <div class="product-badges">${badges}</div>
                    <button class="product-wishlist" aria-label="Add to Wishlist">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                    <div class="product-actions">
                        <button class="add-to-cart-btn" data-product-id="${product._id}" ${btnDisabled}>
                            ${btnText}
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <h4 class="product-name"><a href="product.html?id=${product._id}">${name}</a></h4>
                    <div class="product-price">
                        <span class="current-price" data-base-price="${product.price.toFixed(3)}">${product.price.toFixed(3)} ${currency}</span>
                    </div>
                </div>
            </div>`;
        }).join('');

        // Update currency
        if (window.CurrencyAPI) window.CurrencyAPI.updatePagePrices();

        // Bind add-to-cart listeners
        grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.addToCart) window.addToCart(btn.dataset.productId);
            });
        });

        // Render pagination
        renderPagination(totalPages, filtered.length);
    }

    // ============================================
    // Pagination
    // ============================================
    function renderPagination(totalPages, totalItems) {
        const container = document.getElementById('productsPagination');
        if (!container) return;

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        // Previous
        html += `<button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>`;

        // Page numbers
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            html += `<button class="page-btn" data-page="1">1</button>`;
            if (startPage > 2) html += `<span class="page-dots">…</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span class="page-dots">…</span>`;
            html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next
        html += `<button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>`;

        container.innerHTML = html;

        // Bind page clicks
        container.querySelectorAll('.page-btn:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page >= 1 && page <= totalPages) {
                    currentPage = page;
                    renderProducts();
                    // Scroll to top of grid
                    document.getElementById('allProductsGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

})();
