/**
 * Product Display Helper - Arabic Support
 * Automatically displays Arabic product names and descriptions when language is Arabic
 */

// Get current language
function getCurrentLanguage() {
    return localStorage.getItem('site_lang') || 'en';
}

// Get product name in current language
function getProductName(product) {
    const lang = getCurrentLanguage();
    if (lang === 'ar' && product.nameAr) {
        return product.nameAr;
    }
    return product.name;
}

// Get product description in current language
function getProductDescription(product) {
    const lang = getCurrentLanguage();
    if (lang === 'ar' && product.descriptionAr) {
        return product.descriptionAr;
    }
    return product.description || '';
}

// Format product card HTML with proper language support
function createProductCard(product) {
    const lang = getCurrentLanguage();
    const name = getProductName(product);
    const price = product.price;
    const image = product.images && product.images.length > 0 ? product.images[0].url : '/assets/images/products/placeholder.png';
    const productId = product._id;
    
    return `
        <div class="product-card" data-product-id="${productId}">
            <a href="product.html?id=${productId}" class="product-link">
                <div class="product-image">
                    <img src="${image}" alt="${name}" loading="lazy">
                    ${product.isNewArrival ? `<span class="product-badge" data-i18n="badge_new">New</span>` : ''}
                    ${product.isComingSoon ? `<span class="product-badge coming-soon">Coming Soon</span>` : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${name}</h3>
                    <div class="product-price">
                        <span class="current-price price-display" data-base-price="${price}">
                            ${price.toFixed(3)} <span class="price-currency">${lang === 'ar' ? 'د.ك' : 'KWD'}</span>
                        </span>
                    </div>
                </div>
            </a>
            <button class="btn-add-cart" data-product-id="${productId}" ${product.isComingSoon ? 'disabled' : ''}>
                <span data-i18n="add_to_cart">${product.isComingSoon ? 'Coming Soon' : 'Add to Cart'}</span>
            </button>
        </div>
    `;
}

// Update all product cards on the page when language changes
function updateProductDisplayLanguage() {
    const lang = getCurrentLanguage();
    
    // Update product names
    document.querySelectorAll('.product-card').forEach(card => {
        const productId = card.dataset.productId;
        // This would need to fetch product data again or store it
        // For now, we'll rely on page reload when language changes
    });
    
    // Update currency display
    if (window.CurrencyAPI) {
        window.CurrencyAPI.updatePagePrices();
    }
}

// Listen for language changes
document.addEventListener('DOMContentLoaded', () => {
    // Apply correct language on page load
    updateProductDisplayLanguage();
    
    // Listen for language change events
    document.addEventListener('languageChanged', updateProductDisplayLanguage);
});

// Export functions for use in other scripts
window.ProductDisplayHelper = {
    getCurrentLanguage,
    getProductName,
    getProductDescription,
    createProductCard,
    updateProductDisplayLanguage
};
