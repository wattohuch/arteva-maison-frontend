/**
 * ARTEVA Maison - Cart Functionality
 * Shopping cart state management and interactions
 * Uses API-backed product data with MongoDB ObjectIds
 */

// ============================================
// Product Cache (populated from API on demand)
// ============================================
let productCache = {};

// ============================================
// Cart State
// ============================================
let cart = [];

// ============================================
// Initialize Cart
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    loadCart();
    initAddToCartButtons();
    updateCartCount();
    updateCartDisplay();
    
    // Check if user is logged in and sync cart if needed
    if (window.AuthAPI && window.AuthAPI.isLoggedIn()) {
        syncCartWithServer();
    }
});

// ============================================
// Load Cart from LocalStorage
// ============================================
function loadCart() {
    const savedCart = localStorage.getItem('arteva_cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch (e) {
            cart = [];
        }
    }
}

// ============================================
// Save Cart to LocalStorage
// ============================================
function saveCart() {
    localStorage.setItem('arteva_cart', JSON.stringify(cart));
}

// ============================================
// Get Product by ID (from cache)
// ============================================
function getProductById(id) {
    return productCache[id] || cart.find(item => item.id === id) || null;
}

// ============================================
// Cache a product from API data
// ============================================
function cacheProduct(productData) {
    if (!productData) return;
    const id = productData._id || productData.id;
    // Extract primary image
    let image = '';
    if (productData.images && productData.images.length > 0) {
        const primary = productData.images.find(img => img.isPrimary) || productData.images[0];
        image = primary.url;
    } else if (productData.image) {
        image = productData.image;
    }

    productCache[id] = {
        id: id,
        name: productData.name,
        nameAr: productData.nameAr || '',
        price: productData.price,
        image: image,
        stock: productData.stock || 999
    };
}

// ============================================
// Add to Cart
// ============================================
function addToCart(productId, quantity = 1, productData = null) {
    // If product data is provided, cache it
    if (productData) {
        cacheProduct(productData);
    }

    const product = getProductById(productId);
    if (!product) {
        console.error('Product not found for ID:', productId);
        return false;
    }

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: productId,
            name: product.name,
            nameAr: product.nameAr || '',
            price: product.price,
            image: product.image,
            quantity: quantity
        });
    }

    saveCart();
    updateCartCount();
    updateCartDisplay();

    // Show notification
    if (window.showNotification) {
        const lang = localStorage.getItem('site_lang') || 'en';
        const productName = (lang === 'ar' && product.nameAr) ? product.nameAr : product.name;
        const actionMsg = lang === 'ar' ? 'تمت الإضافة للسلة' : 'added to cart';
        window.showNotification(lang === 'ar' ? `${actionMsg}: ${productName}` : `${productName} ${actionMsg}`, 'success');
    }

    // Open cart drawer
    if (window.openCartDrawer) {
        window.openCartDrawer();
    }

    return true;
}

// ============================================
// Remove from Cart
// ============================================
function removeFromCart(productId) {
    const index = cart.findIndex(item => item.id === productId);
    if (index > -1) {
        const item = cart[index];
        cart.splice(index, 1);
        saveCart();
        updateCartCount();
        updateCartDisplay();

        if (window.showNotification) {
            const lang = localStorage.getItem('site_lang') || 'en';
            const itemName = (lang === 'ar' && item.nameAr) ? item.nameAr : item.name;
            const actionMsg = lang === 'ar' ? 'تم الحذف من السلة' : 'removed from cart';
            window.showNotification(lang === 'ar' ? `${actionMsg}: ${itemName}` : `${itemName} ${actionMsg}`, 'info');
        }
    }
}

// ============================================
// Update Quantity
// ============================================
function updateQuantity(productId, quantity) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        if (quantity <= 0) {
            removeFromCart(productId);
        } else {
            item.quantity = quantity;
            saveCart();
            updateCartCount();
            updateCartDisplay();
        }
    }
}

// ============================================
// Clear Cart
// ============================================
function clearCart() {
    cart = [];
    saveCart();
    updateCartCount();
    updateCartDisplay();
}

// ============================================
// Get Cart Total
// ============================================
function getCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// ============================================
// Get Cart Count
// ============================================
function getCartCount() {
    return cart.reduce((count, item) => count + item.quantity, 0);
}

// ============================================
// Update Cart Count Display
// ============================================
function updateCartCount() {
    const countElements = document.querySelectorAll('#cartCount, .cart-count');
    const count = getCartCount();

    countElements.forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
    });
}

// ============================================
// Update Cart Display
// ============================================
function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    const cartFooter = document.getElementById('cartFooter');
    const cartSubtotal = document.getElementById('cartSubtotal');

    if (!cartItems) return;

    if (cart.length === 0) {
        if (cartEmpty) cartEmpty.style.display = 'flex';
        if (cartFooter) cartFooter.style.display = 'none';
        const items = cartItems.querySelectorAll('.cart-item');
        items.forEach(item => item.remove());
    } else {
        if (cartEmpty) cartEmpty.style.display = 'none';
        if (cartFooter) cartFooter.style.display = 'block';

        const existingItems = cartItems.querySelectorAll('.cart-item');
        existingItems.forEach(item => item.remove());

        cart.forEach(item => {
            const itemElement = createCartItemElement(item);
            cartItems.appendChild(itemElement);
        });

        if (cartSubtotal) {
            cartSubtotal.innerHTML = formatPrice(getCartTotal());
        }
    }

    updateCartPage();

    // Update currency if API is available
    if (window.CurrencyAPI) {
        window.CurrencyAPI.updatePagePrices();
    }
}

// ============================================
// Create Cart Item Element
// ============================================
function createCartItemElement(item) {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.dataset.productId = item.id;

    const lang = localStorage.getItem('site_lang') || 'en';
    const displayName = (lang === 'ar' && item.nameAr) ? item.nameAr : item.name;
    const removeText = lang === 'ar' ? 'حذف' : 'Remove';

    div.innerHTML = `
    <div class="cart-item-image">
      <img src="${item.image}" alt="${displayName}">
    </div>
    <div class="cart-item-details">
      <h4 class="cart-item-name">${displayName}</h4>
      <p class="cart-item-price">${formatPrice(item.price)}</p>
      <div class="cart-item-quantity">
        <button class="qty-btn qty-decrease" data-product-id="${item.id}">−</button>
        <span class="qty-value">${item.quantity}</span>
        <button class="qty-btn qty-increase" data-product-id="${item.id}">+</button>
      </div>
      <button class="cart-item-remove" data-product-id="${item.id}">${removeText}</button>
    </div>
  `;

    div.querySelector('.qty-decrease').addEventListener('click', () => {
        updateQuantity(item.id, item.quantity - 1);
    });

    div.querySelector('.qty-increase').addEventListener('click', () => {
        updateQuantity(item.id, item.quantity + 1);
    });

    div.querySelector('.cart-item-remove').addEventListener('click', () => {
        removeFromCart(item.id);
    });

    return div;
}

// ============================================
// Format Price
// ============================================
function formatPrice(price) {
    const lang = localStorage.getItem('site_lang') || 'en';
    const currency = lang === 'ar' ? 'د.ك' : 'KWD';
    const val = parseFloat(price);
    return `<span class="price-display" data-base-price="${val.toFixed(3)}">${val.toFixed(3)} <span class="price-currency">${currency}</span></span>`;
}

// ============================================
// Initialize Add to Cart Buttons
// ============================================
function initAddToCartButtons() {
    const addButtons = document.querySelectorAll('.add-to-cart-btn');

    addButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const productId = btn.dataset.productId;
            if (productId) {
                addToCart(productId);
            }
        });
    });
}

// ============================================
// Update Cart Page (if on cart.html)
// ============================================
function updateCartPage() {
    const cartTable = document.querySelector('.cart-table tbody');
    const cartSummary = document.querySelector('.cart-summary');

    if (!cartTable) return;

    cartTable.innerHTML = '';

    if (cart.length === 0) {
        const lang = localStorage.getItem('site_lang') || 'en';
        const emptyMsg = lang === 'ar' ? 'سلة التسوق فارغة.' : 'Your cart is empty.';
        const continueMsg = lang === 'ar' ? 'تابع التسوق' : 'Continue shopping';
        cartTable.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px;">
          ${emptyMsg} <a href="collections.html" style="color: var(--color-gold);">${continueMsg}</a>
        </td>
      </tr>
    `;
        return;
    }

    cart.forEach(item => {
        const row = document.createElement('tr');
        const lang = localStorage.getItem('site_lang') || 'en';
        const displayName = (lang === 'ar' && item.nameAr) ? item.nameAr : item.name;
        const removeText = lang === 'ar' ? 'حذف' : 'Remove';

        row.innerHTML = `
      <td>
        <div class="cart-product">
          <div class="cart-product-image">
            <img src="${item.image}" alt="${displayName}">
          </div>
          <div>
            <h4 class="cart-product-name">${displayName}</h4>
          </div>
        </div>
      </td>
      <td>${formatPrice(item.price)}</td>
      <td>
        <div class="cart-item-quantity">
          <button class="qty-btn qty-decrease" data-product-id="${item.id}">−</button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn qty-increase" data-product-id="${item.id}">+</button>
        </div>
      </td>
      <td>${formatPrice(item.price * item.quantity)}</td>
      <td>
        <button class="cart-item-remove" data-product-id="${item.id}" style="color: #dc3545;">${removeText}</button>
      </td>
    `;

        row.querySelector('.qty-decrease').addEventListener('click', () => {
            updateQuantity(item.id, item.quantity - 1);
        });

        row.querySelector('.qty-increase').addEventListener('click', () => {
            updateQuantity(item.id, item.quantity + 1);
        });

        row.querySelector('.cart-item-remove').addEventListener('click', () => {
            removeFromCart(item.id);
        });

        cartTable.appendChild(row);
    });

    const subtotalEl = document.getElementById('cartPageSubtotal');
    const totalEl = document.getElementById('cartPageTotal');

    if (subtotalEl) subtotalEl.innerHTML = formatPrice(getCartTotal());
    if (totalEl) totalEl.innerHTML = formatPrice(getCartTotal());
}

// ============================================
// Export Functions
// ============================================
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.clearCart = clearCart;
window.getCartTotal = getCartTotal;
window.getCartCount = getCartCount;
window.cacheProduct = cacheProduct;
window.getProductById = getProductById;
// ============================================
// Sync Cart with Server (when logged in)
// ============================================
async function syncCartWithServer() {
    if (!window.CartAPI || !window.AuthAPI || !window.AuthAPI.isLoggedIn()) {
        return;
    }

    try {
        // Get server cart
        const response = await window.CartAPI.get();
        if (response.success && response.data && response.data.items) {
            const serverCart = response.data.items;
            
            // Merge local cart with server cart
            // For simplicity, we'll use server cart if it exists
            // In a real app, you'd want more sophisticated merging logic
            if (serverCart.length > 0) {
                cart = serverCart.map(item => ({
                    id: item.product._id || item.product.id,
                    name: item.product.name,
                    nameAr: item.product.nameAr || '',
                    price: item.product.price,
                    image: item.product.images && item.product.images.length > 0 ? 
                           item.product.images[0].url : item.product.image || '',
                    quantity: item.quantity
                }));
                saveCart();
                updateCartCount();
                updateCartDisplay();
            }
        }
    } catch (error) {
        console.error('Failed to sync cart with server:', error);
        // Continue with local cart if sync fails
    }
}

// ============================================
// Check Authentication for Cart Operations
// ============================================
function checkCartAuth() {
    // If user is logged in, ensure they can access cart
    // If not logged in, they can still use local cart
    return true; // Always allow cart operations for now
}