/**
 * ARTÉVA Maison — Premium Animation Engine v2
 * Extensive motion system · Every element animated
 * Zero dependencies · GPU-accelerated · ~5KB
 */
(function () {
  'use strict';

  // ── Detect reduced motion preference ──────────
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion) {
    document.querySelectorAll('[data-animate]').forEach(el => {
      el.classList.add('is-visible');
    });
    return;
  }

  // ── Scroll Reveal Engine ──────────────────────
  function initScrollReveal() {
    const elements = document.querySelectorAll('[data-animate]');
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    elements.forEach(el => observer.observe(el));
  }

  // ── Grid Stagger Reveal ───────────────────────
  function initGridStagger() {
    const grids = document.querySelectorAll(
      '.products-grid, .categories-grid, .collections-scroll, .footer-grid'
    );

    grids.forEach(grid => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const children = Array.from(entry.target.children);
              children.forEach((child, i) => {
                // Add data-animate if not present
                if (!child.hasAttribute('data-animate')) {
                  child.setAttribute('data-animate', 'fade-up');
                }
                // Stagger with natural timing
                const delay = i * 100;
                child.style.transitionDelay = `${delay}ms`;
                setTimeout(() => {
                  child.classList.add('is-visible');
                }, delay);
              });
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.05, rootMargin: '0px 0px -30px 0px' }
      );

      observer.observe(grid);
    });
  }

  // ── Parallax Effect ───────────────────────────
  function initParallax() {
    const elements = document.querySelectorAll('[data-parallax]');
    if (!elements.length) return;

    const intensityMap = {
      subtle: 0.02,
      medium: 0.05,
      strong: 0.09
    };

    let ticking = false;

    function updateParallax() {
      const viewportHeight = window.innerHeight;

      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const intensity = intensityMap[el.dataset.parallax] || 0.02;

        if (rect.bottom > 0 && rect.top < viewportHeight) {
          const center = rect.top + rect.height / 2;
          const offset = (center - viewportHeight / 2) * intensity;
          el.style.transform = `translate3d(0, ${offset}px, 0)`;
        }
      });

      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });
  }

  // ── Scroll Progress Bar ───────────────────────
  function initScrollProgress() {
    // Don't add on admin or utility pages
    if (document.querySelector('.admin-body') || 
        document.querySelector('.btn-print')) return;

    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.prepend(bar);

    let ticking = false;

    function updateProgress() {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollTop / docHeight : 0;
      bar.style.transform = `scaleX(${progress})`;
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateProgress);
        ticking = true;
      }
    }, { passive: true });
  }

  // ── Auto-Animate Sections ─────────────────────
  // Automatically add data-animate to key elements that don't have it
  function autoAnimateSections() {
    // Section headers
    document.querySelectorAll('.section-header:not([data-animate])').forEach(el => {
      el.setAttribute('data-animate', 'fade-up');
    });

    // Footer sections
    document.querySelectorAll('.footer-brand:not([data-animate])').forEach(el => {
      el.setAttribute('data-animate', 'fade-up');
    });

    document.querySelectorAll('.footer-contact:not([data-animate])').forEach(el => {
      el.setAttribute('data-animate', 'fade-up');
      el.setAttribute('data-delay', '200');
    });

    // Newsletter
    document.querySelectorAll('.newsletter-section:not([data-animate])').forEach(el => {
      el.setAttribute('data-animate', 'fade-up');
    });

    // Page titles / breadcrumbs
    document.querySelectorAll('.page-title:not([data-animate]), .breadcrumb:not([data-animate])').forEach(el => {
      el.setAttribute('data-animate', 'fade-in');
    });

    // Contact form
    document.querySelectorAll('.contact-form:not([data-animate])').forEach(el => {
      el.setAttribute('data-animate', 'fade-up');
      el.setAttribute('data-delay', '200');
    });

    // Product detail sections
    document.querySelectorAll('.product-gallery:not([data-animate])').forEach(el => {
      el.setAttribute('data-animate', 'fade-right');
    });

    document.querySelectorAll('.product-details:not([data-animate])').forEach(el => {
      el.setAttribute('data-animate', 'fade-left');
      el.setAttribute('data-delay', '150');
    });
  }

  // ── Legacy .reveal Compatibility ──────────────
  function initLegacyReveal() {
    document.querySelectorAll('.reveal:not(.revealed):not([data-animate])').forEach(el => {
      el.setAttribute('data-animate', 'fade-up');
    });
  }

  // ── Dynamic Content Observer ──────────────────
  // Watch for dynamically added content and animate it
  function initDynamicObserver() {
    const mutationObserver = new MutationObserver(mutations => {
      let hasNewContent = false;

      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          
          // Check if the added node or its children have data-animate
          if (node.hasAttribute && node.hasAttribute('data-animate')) {
            hasNewContent = true;
          }
          
          // Auto-animate product cards added dynamically
          if (node.classList && node.classList.contains('product-card')) {
            if (!node.hasAttribute('data-animate')) {
              node.setAttribute('data-animate', 'fade-up');
            }
            hasNewContent = true;
          }

          // Check children
          if (node.querySelectorAll) {
            const animatable = node.querySelectorAll('[data-animate], .product-card');
            if (animatable.length) hasNewContent = true;
            
            animatable.forEach(el => {
              if (el.classList.contains('product-card') && !el.hasAttribute('data-animate')) {
                el.setAttribute('data-animate', 'fade-up');
              }
            });
          }
        });
      });

      if (hasNewContent) {
        // Re-run scroll reveal for new elements
        initScrollReveal();
        initGridStagger();
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // ── Initialize Everything ─────────────────────
  function init() {
    autoAnimateSections();
    initLegacyReveal();
    initScrollReveal();
    initGridStagger();
    initParallax();
    initScrollProgress();
    initDynamicObserver();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for dynamic content refresh
  window.ArtevaAnimations = {
    refresh() {
      autoAnimateSections();
      initScrollReveal();
      initGridStagger();
    }
  };
})();
