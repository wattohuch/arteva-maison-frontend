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
  window.handleImageError = function (img) {
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
      img.onerror = function () {
        window.handleImageError(this);
      };
    }
  });

  // Use MutationObserver to handle dynamically added images
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) { // Element node
          if (node.tagName === 'IMG') {
            if (!node.onerror) {
              node.onerror = function () {
                window.handleImageError(this);
              };
            }
          }
          // Also check for images within added nodes
          const images = node.querySelectorAll && node.querySelectorAll('img');
          if (images) {
            images.forEach(function (img) {
              if (!img.onerror) {
                img.onerror = function () {
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
let _heroSlideInterval = null;

function initHeroSlideshow() {
  // Clean up any previous interval (re-init safe)
  if (_heroSlideInterval) {
    clearInterval(_heroSlideInterval);
    _heroSlideInterval = null;
  }

  const hero = document.querySelector('.hero');
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  const heroContent = document.querySelector('.hero-content');

  if (!hero || slides.length === 0) return;

  let currentSlide = 0;
  let slideInterval = null;
  const slideDelay = 6000; // 6 seconds between slides for a relaxed luxury feel

  // Text animation
  function animateHeroText() {
    if (!heroContent) return;
    heroContent.classList.remove('animate');
    heroContent.style.opacity = '0';
    heroContent.style.transition = 'opacity 0.5s ease';

    setTimeout(() => {
      // Update text per slide if dynamic data exists
      if (window._heroSlidesData && window._heroSlidesData[currentSlide]) {
        const lang = localStorage.getItem('site_lang') || 'en';
        if (typeof updateHeroText === 'function') {
          updateHeroText(window._heroSlidesData[currentSlide], lang);
        }
      }

      heroContent.classList.add('animate');
      heroContent.style.opacity = '1';
    }, 500);
  }

  // Go to specific slide — true crossfade: image dissolves into next
  function goToSlide(index) {
    if (index >= slides.length) index = 0;
    if (index < 0) index = slides.length - 1;
    if (index === currentSlide && slides[currentSlide].classList.contains('active')) return;

    const prevSlide = currentSlide;

    // Clean up any previous 'prev' classes
    slides.forEach(s => s.classList.remove('prev'));

    // Move the current slide to 'prev' — stays fully visible at z-index 1
    if (slides[prevSlide]) {
      slides[prevSlide].classList.remove('active');
      slides[prevSlide].classList.add('prev');
    }

    // New slide fades in on top at z-index 2
    slides[index].classList.add('active');

    // After the crossfade completes, demote the prev slide
    setTimeout(() => {
      slides.forEach(s => {
        if (!s.classList.contains('active')) {
          s.classList.remove('prev');
        }
      });
    }, 2000); // matches the 1.8s CSS transition + buffer

    // Update dots
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    currentSlide = index;

    // Smooth text re-entrance
    if (prevSlide !== index) {
      animateHeroText();
    }
  }

  // Auto-advance slides
  function startAutoPlay() {
    slideInterval = setInterval(() => {
      goToSlide(currentSlide + 1);
    }, slideDelay);
    _heroSlideInterval = slideInterval;
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

  // Pause on hover
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

  // Initialize: first slide active, text animated
  slides[0].classList.add('active');
  if (heroContent) heroContent.classList.add('animate');
  startAutoPlay();
}

// Expose globally for dynamic initialization from home.js
window.initHeroSlideshow = initHeroSlideshow;

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
  // The new animations.js engine handles all scroll reveals via [data-animate].
  // This function now only handles backward compatibility for elements
  // that use the old .reveal class but don't have data-animate attributes.
  
  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -80px 0px'
  };

  const singleObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Only observe elements that use .reveal but NOT [data-animate]
  const revealElements = document.querySelectorAll('.reveal:not([data-animate])');
  revealElements.forEach(el => {
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

// Format price using CurrencyAPI if available
function formatPrice(price) {
  if (window.CurrencyAPI) {
    const code = window.CurrencyAPI.getCurrent();
    return window.CurrencyAPI.format(parseFloat(price), code);
  }
  const formattedPrice = parseFloat(price).toFixed(3);
  return `${formattedPrice} KWD`;
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
