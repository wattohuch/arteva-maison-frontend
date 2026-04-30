/**
 * Home Page Script
 * Fetches and renders Hero Slides, Browse Collections, New Arrivals, and Categories
 */

document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        loadHeroSlides(),
        loadBrowseCollections(),
        loadNewArrivals(),
        loadCategories()
    ]);
});

// ============================================
// Dynamic Hero Slides
// ============================================
async function loadHeroSlides() {
    const heroSection = document.getElementById('heroSection');
    const heroDots = document.getElementById('heroDots');
    if (!heroSection) return;

    try {
        const response = await HeroAPI.getSlides();
        if (response.success && response.data.length > 0) {
            const slides = response.data;
            const lang = localStorage.getItem('site_lang') || 'en';

            // Inject slide elements BEFORE the hero-content div
            const heroContent = document.getElementById('heroContent');
            
            // Remove any existing slides
            heroSection.querySelectorAll('.hero-slide').forEach(s => s.remove());

            slides.forEach((slide, i) => {
                const slideEl = document.createElement('div');
                slideEl.className = 'hero-slide' + (i === 0 ? ' active' : '');
                slideEl.dataset.slideIndex = i;
                slideEl.innerHTML = `
                    <img src="${slide.image}" alt="${slide.title || 'ARTEVA Maison'}" class="hero-image" loading="${i === 0 ? 'eager' : 'lazy'}">
                    <div class="hero-overlay"></div>
                `;
                heroSection.insertBefore(slideEl, heroContent);
            });

            // Inject dots
            heroDots.innerHTML = slides.map((_, i) => 
                `<button class="hero-dot${i === 0 ? ' active' : ''}" aria-label="Go to slide ${i + 1}"></button>`
            ).join('');

            // Set initial hero text from first slide
            updateHeroText(slides[0], lang);

            // Store slides data for text switching
            window._heroSlidesData = slides;

            // Initialize the slideshow
            if (window.initHeroSlideshow) {
                window.initHeroSlideshow();
            }
        } else {
            // Fallback: create a single default slide
            createFallbackHeroSlide(heroSection);
        }
    } catch (err) {
        console.error('Failed to load hero slides:', err);
        createFallbackHeroSlide(document.getElementById('heroSection'));
    }
}

function updateHeroText(slide, lang) {
    const subtitle = document.getElementById('heroSubtitle');
    const title = document.getElementById('heroTitle');
    const description = document.getElementById('heroDescription');
    const btn = document.getElementById('heroBtn');

    if (subtitle) {
        const text = lang === 'ar' && slide.subtitleAr ? slide.subtitleAr : slide.subtitle;
        if (text) subtitle.textContent = text;
    }
    if (title) {
        const text = lang === 'ar' && slide.titleAr ? slide.titleAr : slide.title;
        if (text) title.innerHTML = text.replace(/\n/g, '<br>');
    }
    if (description) {
        const text = lang === 'ar' && slide.descriptionAr ? slide.descriptionAr : slide.description;
        if (text) description.textContent = text;
    }
    if (btn) {
        const text = lang === 'ar' && slide.buttonTextAr ? slide.buttonTextAr : slide.buttonText;
        if (text) btn.textContent = text;
        if (slide.buttonLink) btn.href = slide.buttonLink;
    }
}

function createFallbackHeroSlide(heroSection) {
    if (!heroSection) return;
    const heroContent = document.getElementById('heroContent');
    const heroDots = document.getElementById('heroDots');
    
    // Original 3 static slides
    const slidesHTML = `
        <div class="hero-slide active">
            <img src="assets/images/hero/hero-bg.png" alt="ARTEVA Maison Collection" class="hero-image" loading="eager">
            <div class="hero-overlay"></div>
        </div>
        <div class="hero-slide">
            <img src="assets/images/products/product-01.png" alt="Crystal Collection" class="hero-image" loading="lazy">
            <div class="hero-overlay"></div>
        </div>
        <div class="hero-slide">
            <img src="assets/images/products/product-02.png" alt="Artisan Glassware" class="hero-image" loading="lazy">
            <div class="hero-overlay"></div>
        </div>
    `;
    
    // Create a temporary container to convert HTML string to nodes
    const temp = document.createElement('div');
    temp.innerHTML = slidesHTML;
    
    // Insert all slide nodes before the hero content
    while (temp.firstChild) {
        heroSection.insertBefore(temp.firstChild, heroContent);
    }
    
    if (heroDots) {
        heroDots.innerHTML = `
            <button class="hero-dot active" aria-label="Go to slide 1"></button>
            <button class="hero-dot" aria-label="Go to slide 2"></button>
            <button class="hero-dot" aria-label="Go to slide 3"></button>
        `;
    }

    if (heroContent) heroContent.classList.add('animate');
    
    // Clear out window._heroSlidesData so text doesn't get messed up during switching
    window._heroSlidesData = null;

    // Initialize the slideshow
    if (window.initHeroSlideshow) {
        window.initHeroSlideshow();
    }
}

// ============================================
// Browse Collections
// ============================================
async function loadBrowseCollections() {
    const section = document.getElementById('browseCollectionsSection');
    const container = document.getElementById('browseCollectionsScroll');
    if (!section || !container) return;

    try {
        const response = await ProductsAPI.getCollectionFeatured(12);
        if (response.success && response.data.length > 0) {
            section.style.display = '';
            renderBrowseCollections(container, response.data);
        }
    } catch (err) {
        // Silently fail — section stays hidden
        console.error('Failed to load browse collections:', err);
    }
}

function renderBrowseCollections(container, products) {
    const lang = localStorage.getItem('site_lang') || 'en';

    container.innerHTML = products.map(product => {
        const name = lang === 'ar' && product.nameAr ? product.nameAr : product.name;
        const currency = lang === 'ar' ? 'د.ك' : 'KWD';
        const image = product.images[0]?.url || 'assets/images/products/placeholder.png';
        const categoryName = product.category?.name || '';

        return `
        <a href="product.html?id=${product._id}" class="browse-collection-card">
            <div class="browse-collection-image">
                <img src="${image}" alt="${name}" loading="lazy"
                    onerror="if(typeof handleImageError==='function') handleImageError(this); else this.src='assets/images/products/placeholder.png';">
            </div>
            <div class="browse-collection-info">
                <span class="browse-collection-category">${categoryName}</span>
                <h4 class="browse-collection-name">${name}</h4>
                <span class="browse-collection-price" data-base-price="${product.price.toFixed(3)}">${product.price.toFixed(3)} ${currency}</span>
            </div>
        </a>`;
    }).join('');

    if (window.CurrencyAPI) window.CurrencyAPI.updatePagePrices();
}

// ============================================
// New Arrivals
// ============================================
async function loadNewArrivals() {
    const container = document.getElementById('newArrivalsGrid');
    if (!container) return;

    try {
        const response = await ProductsAPI.getAll({ isNew: true, limit: 4 });
        if (response.success && response.data.length > 0) {
            renderProducts(container, response.data);
        } else {
            container.innerHTML = '<p class="text-center">No new arrivals yet.</p>';
        }
    } catch (err) {
        container.innerHTML = '<p class="text-center">Unable to load new arrivals.</p>';
    }
}

function renderProducts(container, products) {
    const lang = localStorage.getItem('site_lang') || 'en';

    // Cache all products so addToCart can find them
    products.forEach(product => {
        if (window.cacheProduct) {
            window.cacheProduct(product);
        }
    });

    container.innerHTML = products.map(product => {
        const name = lang === 'ar' && product.nameAr ? product.nameAr : product.name;
        const currency = lang === 'ar' ? 'د.ك' : 'KWD';
        const image = product.images[0]?.url || 'assets/images/products/placeholder.png';
        const isComingSoon = product.isComingSoon;

        let badges = '';
        if (product.stock === 0 && !isComingSoon) {
            badges += `<span class="product-badge badge-out-stock" style="background: #ef4444; color: white;">${lang === 'ar' ? 'غير متوفر' : 'Out of Stock'}</span>`;
        } else if (isComingSoon) {
            badges += `<span class="product-badge badge-coming-soon" style="background: #3b82f6; color: white;">${lang === 'ar' ? 'قريباً' : 'Coming Soon'}</span>`;
        } else if (product.isNew) {
            badges += `<span class="product-badge badge-new">${lang === 'ar' ? 'جديد' : 'New'}</span>`;
        }

        const btnText = isComingSoon ? (lang === 'ar' ? 'قريباً' : 'Coming Soon') : (product.stock === 0 ? (lang === 'ar' ? 'غير متوفر' : 'Out of Stock') : (lang === 'ar' ? 'أضف للسلة' : 'Add to Cart'));
        const btnDisabled = isComingSoon || product.stock === 0 ? 'disabled style="opacity:0.7; cursor:default;"' : '';

        return `
        <div class="product-card" data-product-id="${product._id}">
            <div class="product-image">
                <a href="product.html?id=${product._id}">
                    <img src="${image}" alt="${name}" onerror="if(typeof handleImageError==='function') handleImageError(this); else this.src='assets/images/products/placeholder.png';">
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

    if (window.CurrencyAPI) window.CurrencyAPI.updatePagePrices();

    // Bind add-to-cart listeners
    container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.addToCart) window.addToCart(btn.dataset.productId);
        });
    });
}

// ============================================
// Dynamic Categories Grid
// ============================================
async function loadCategories() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    // Show shimmer placeholders while loading
    grid.innerHTML = Array(6).fill(0).map(() => `
        <div class="category-card" style="pointer-events:none;">
            <div style="width:100%;height:100%;background:var(--bg-secondary);animation:shimmerAnim 1.5s infinite;"></div>
        </div>
    `).join('');

    try {
        const response = await CategoriesAPI.getAll();
        if (response.success && response.data.length > 0) {
            renderCategories(grid, response.data);
        } else {
            grid.innerHTML = '<p class="text-center" style="grid-column:1/-1;">No categories available.</p>';
        }
    } catch (err) {
        console.error('Failed to load categories:', err);
        grid.innerHTML = '<p class="text-center" style="grid-column:1/-1;">Unable to load categories.</p>';
    }
}

function renderCategories(grid, categories) {
    const lang = localStorage.getItem('site_lang') || 'en';

    // Only show active categories
    const active = categories.filter(c => c.isActive !== false);

    grid.innerHTML = active.map((cat, i) => {
        const name = lang === 'ar' && cat.nameAr ? cat.nameAr : cat.name;
        const image = cat.image && !cat.image.includes('undefined')
            ? cat.image
            : 'assets/images/products/placeholder.png';
        const slug = cat.slug || cat._id;

        return `
        <a href="collection.html?cat=${slug}" class="category-card" data-animate="fade-up" style="animation-delay: ${i * 0.08}s;">
            <img src="${image}" alt="${name}" loading="lazy"
                onerror="this.onerror=null; this.src='assets/images/products/placeholder.png';">
            <div class="category-overlay">
                <span class="category-name">${name}</span>
            </div>
        </a>`;
    }).join('');
}
