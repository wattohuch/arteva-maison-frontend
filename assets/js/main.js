/**
 * ARTEVA Maison - Main JavaScript
 * Core functionality for navigation, modals, and interactions
 */

// ============================================
// DOM Ready Handler
// ============================================
document.addEventListener('DOMContentLoaded', function () {
  initHeader();
  initHeroSlideshow();
  initMobileMenu();
  initSearch();
  initCartDrawer();
  initDropdowns();
  initCookieBanner();
  initNewsletterForm();
  initWishlist();
  initAnimations();
  initImageErrorHandling();
});

// ============================================
// Global Image Error Handler
// ============================================
function initImageErrorHandling() {
  // Global image error handler - tries .png if .jpeg fails, then placeholder
  window.handleImageError = function(img) {
    if (!img || img.dataset.fallbackAttempted) return;
    
    const src = img.src || img.getAttribute('src');
    if (!src) return;
    
    // Try .png if it's .jpeg
    if (src.includes('.jpeg') || src.includes('.jpg')) {
      img.dataset.fallbackAttempted = 'true';
      const pngSrc = src.replace(/\.jpe?g$/i, '.png');
      img.src = pngSrc;
      return;
    }
    
    // If already tried or not a jpeg, use placeholder
    img.dataset.fallbackAttempted = 'true';
    img.src = 'assets/images/products/placeholder.png';
  };
  
  // Add error handlers to all existing images
  document.querySelectorAll('img').forEach(img => {
    if (!img.onerror) {
      img.onerror = function() {
        window.handleImageError(this);
      };
    }
  });
  
  // Use MutationObserver to handle dynamically added images
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) { // Element node
          if (node.tagName === 'IMG') {
            if (!node.onerror) {
              node.onerror = function() {
                window.handleImageError(this);
              };
            }
          }
          // Also check for images within added nodes
          const images = node.querySelectorAll && node.querySelectorAll('img');
          if (images) {
            images.forEach(function(img) {
              if (!img.onerror) {
                img.onerror = function() {
                  window.handleImageError(this);
                };
              }
            });
          }
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// ============================================
// Hero Slideshow
// ============================================
function initHeroSlideshow() {
  const hero = document.querySelector('.hero');
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  const heroContent = document.querySelector('.hero-content');

  if (!hero || slides.length === 0) return;

  let currentSlide = 0;
  let slideInterval;
  const slideDelay = 5000; // 5 seconds between slides
  const animationResetDelay = 100; // Brief delay before re-animating text

  // Animate hero text function
  function animateHeroText() {
    if (!heroContent) return;

    // Remove animate class to reset
    heroContent.classList.remove('animate');

    // Force reflow to restart animation
    void heroContent.offsetWidth;

    // Re-add animate class after brief delay
    setTimeout(() => {
      heroContent.classList.add('animate');
    }, animationResetDelay);
  }

  // Go to specific slide
  function goToSlide(index) {
    // Wrap around
    if (index >= slides.length) index = 0;
    if (index < 0) index = slides.length - 1;

    // Update slides
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });

    // Update dots
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    currentSlide = index;

    // Animate text on slide change
    animateHeroText();
  }

  // Auto-advance slides
  function startAutoPlay() {
    slideInterval = setInterval(() => {
      goToSlide(currentSlide + 1);
    }, slideDelay);
  }

  function stopAutoPlay() {
    clearInterval(slideInterval);
  }

  // Dot click handlers
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      stopAutoPlay();
      goToSlide(index);
      startAutoPlay();
    });
  });

  // Optional: Pause on hover
  hero.addEventListener('mouseenter', stopAutoPlay);
  hero.addEventListener('mouseleave', startAutoPlay);

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      stopAutoPlay();
      goToSlide(currentSlide - 1);
      startAutoPlay();
    } else if (e.key === 'ArrowRight') {
      stopAutoPlay();
      goToSlide(currentSlide + 1);
      startAutoPlay();
    }
  });

  // Initialize: Ensure first slide is active and start animation
  goToSlide(0);
  startAutoPlay();
}

// ============================================
// Header Scroll Effect
// ============================================
function initHeader() {
  const header = document.getElementById('header');
  const hero = document.querySelector('.hero');
  if (!header) return;

  const scrollThreshold = 50;

  // Check if we're on a page with a hero section
  const hasHero = !!hero;

  function updateHeader() {
    const currentScroll = window.pageYOffset;

    if (hasHero) {
      // On hero pages: transparent until scroll
      if (currentScroll > scrollThreshold) {
        header.classList.add('scrolled');
        header.classList.remove('on-hero');
      } else {
        header.classList.remove('scrolled');
        header.classList.add('on-hero');
      }
    } else {
      // On non-hero pages: always solid background
      header.classList.add('scrolled');
      header.classList.remove('on-hero');
    }
  }

  // Init on page load
  updateHeader();

  // Update on scroll with passive listener for performance
  window.addEventListener('scroll', updateHeader, { passive: true });
}

// ============================================
// Mobile Menu
// ============================================
function initMobileMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileMenuClose = document.getElementById('mobileMenuClose');
  const overlay = document.getElementById('overlay');

  if (!menuToggle || !mobileMenu) return;

  // Toggle menu
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    overlay.classList.toggle('active');
    document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
  });

  // Close menu
  if (mobileMenuClose) {
    mobileMenuClose.addEventListener('click', closeMobileMenu);
  }

  if (overlay) {
    overlay.addEventListener('click', closeMobileMenu);
  }

  // Handle submenu toggles
  const submenuItems = document.querySelectorAll('.mobile-nav-item.has-submenu');
  submenuItems.forEach(item => {
    const link = item.querySelector('.mobile-nav-link');
    if (link) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        item.classList.toggle('active');
      });
    }
  });

  function closeMobileMenu() {
    menuToggle.classList.remove('active');
    mobileMenu.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ============================================
// Search Modal
// ============================================
function initSearch() {
  const searchToggle = document.getElementById('searchToggle');
  const searchModal = document.getElementById('searchModal');
  const searchClose = document.getElementById('searchClose');
  const searchInput = document.getElementById('searchInput');

  if (!searchToggle || !searchModal) return;

  searchToggle.addEventListener('click', () => {
    searchModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      if (searchInput) searchInput.focus();
    }, 300);
  });

  if (searchClose) {
    searchClose.addEventListener('click', closeSearch);
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchModal.classList.contains('active')) {
      closeSearch();
    }
  });

  // Handle search submission
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          window.location.href = `collection.html?q=${encodeURIComponent(query)}`;
        }
      }
    });
  }

  function closeSearch() {
    searchModal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ============================================
// Cart Drawer
// ============================================
function initCartDrawer() {
  const cartToggle = document.getElementById('cartToggle');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartClose = document.getElementById('cartClose');
  const overlay = document.getElementById('overlay');

  if (!cartToggle || !cartDrawer) return;

  cartToggle.addEventListener('click', () => {
    openCartDrawer();
  });

  if (cartClose) {
    cartClose.addEventListener('click', closeCartDrawer);
  }

  // Close when clicking overlay (if cart is open)
  if (overlay) {
    overlay.addEventListener('click', () => {
      if (cartDrawer.classList.contains('active')) {
        closeCartDrawer();
      }
    });
  }

  function openCartDrawer() {
    cartDrawer.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    updateCartDisplay();
  }

  function closeCartDrawer() {
    cartDrawer.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Make functions globally accessible
  window.openCartDrawer = openCartDrawer;
  window.closeCartDrawer = closeCartDrawer;
}

// ============================================
// Dropdown Menus
// ============================================
function initDropdowns() {
  const dropdownItems = document.querySelectorAll('.nav-item');

  dropdownItems.forEach(item => {
    const dropdown = item.querySelector('.dropdown-menu');
    if (dropdown) {
      // Show on hover for desktop
      item.addEventListener('mouseenter', () => {
        dropdown.style.opacity = '1';
        dropdown.style.visibility = 'visible';
        dropdown.style.transform = 'translateY(0)';
      });

      item.addEventListener('mouseleave', () => {
        dropdown.style.opacity = '0';
        dropdown.style.visibility = 'hidden';
        dropdown.style.transform = 'translateY(10px)';
      });
    }
  });
}

// ============================================
// Cookie Banner
// ============================================
function initCookieBanner() {
  const cookieBanner = document.getElementById('cookieBanner');
  const acceptBtn = document.getElementById('acceptCookies');

  if (!cookieBanner) return;

  // Check if cookies were already accepted
  if (!localStorage.getItem('cookiesAccepted')) {
    setTimeout(() => {
      cookieBanner.classList.add('active');
    }, 2000);
  }

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      localStorage.setItem('cookiesAccepted', 'true');
      cookieBanner.classList.remove('active');
    });
  }
}

// ============================================
// Newsletter Form
// ============================================
function initNewsletterForm() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value;

    // Simulate subscription
    showNotification('Thank you for subscribing!', 'success');
    form.reset();
  });
}

// ============================================
// Wishlist Toggle
// ============================================
function initWishlist() {
  const wishlistBtns = document.querySelectorAll('.product-wishlist');

  wishlistBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.toggle('active');

      const isActive = btn.classList.contains('active');
      showNotification(
        isActive ? 'Added to wishlist' : 'Removed from wishlist',
        isActive ? 'success' : 'info'
      );
    });
  });
}

// ============================================
// Scroll Animations
// ============================================
function initAnimations() {
  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -80px 0px'
  };

  // Staggered reveal for grids
  function revealWithStagger(entries, observer) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Get all siblings in the same grid
        const parent = entry.target.parentElement;
        const siblings = parent.querySelectorAll('.product-card, .collection-card, .category-card');

        siblings.forEach((el, index) => {
          if (el.classList.contains('reveal') && !el.classList.contains('revealed')) {
            setTimeout(() => {
              el.classList.add('revealed');
            }, index * 80); // 80ms stagger
          }
        });

        observer.unobserve(entry.target);
      }
    });
  }

  const gridObserver = new IntersectionObserver(revealWithStagger, observerOptions);

  // Single element reveal
  const singleObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Apply to grid items
  const gridElements = document.querySelectorAll('.product-card, .collection-card, .category-card');
  gridElements.forEach(el => {
    el.classList.add('reveal');
  });

  // Observe first element of each grid to trigger stagger
  const grids = document.querySelectorAll('.products-grid, .categories-grid, .collections-scroll');
  grids.forEach(grid => {
    const firstItem = grid.querySelector('.product-card, .collection-card, .category-card');
    if (firstItem) {
      gridObserver.observe(firstItem);
    }
  });

  // Apply to section headers and other elements
  const revealElements = document.querySelectorAll('.section-header, .newsletter-section, .footer-brand');
  revealElements.forEach(el => {
    el.classList.add('reveal');
    singleObserver.observe(el);
  });
}

// ============================================
// Notification System
// ============================================
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button class="notification-close">&times;</button>
  `;

  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    padding: 16px 24px;
    background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideInRight 0.3s ease;
  `;

  document.body.appendChild(notification);

  // Close button
  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.remove();
  });

  // Auto remove
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => notification.remove(), 300);
    }
  }, 3000);
}

// ============================================
// Utility Functions
// ============================================

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Format price
function formatPrice(price) {
  const lang = localStorage.getItem('site_lang') || 'en';
  const currency = lang === 'ar' ? 'د.ك' : 'KWD';
  const formattedPrice = parseFloat(price).toFixed(3);
  return lang === 'ar' ? `${formattedPrice} ${currency}` : `${formattedPrice} ${currency}`;
}

// Get URL parameter
function getUrlParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Smooth scroll to element
function scrollToElement(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Make utility functions global
window.showNotification = showNotification;
window.formatPrice = formatPrice;
window.getUrlParam = getUrlParam;
