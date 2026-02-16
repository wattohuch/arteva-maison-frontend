/**
 * Home Page Script
 * Fetches and renders New Arrivals and Featured products
 */

document.addEventListener('DOMContentLoaded', async () => {
    await loadNewArrivals();
    // await loadFeatured(); // If there is a featured section
});

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
        console.error('Failed to load new arrivals:', err);
    }
}

function renderProducts(container, products) {
    const lang = localStorage.getItem('site_lang') || 'en';

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

    // Re-bind listeners
    if (window.initAddToCartButtons) window.initAddToCartButtons();
    if (window.initWishlistButtons) window.initWishlistButtons(); // assuming this exists or I need to add it

    // Add event listeners locally if not global
    container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (window.addToCart) window.addToCart(btn.dataset.productId);
        });
    });
}
