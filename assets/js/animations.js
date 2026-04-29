/**
 * ARTÉVA Maison — Premium Animation Engine
 * Lightweight scroll-reveal, parallax & micro-interactions
 * Zero dependencies · GPU-accelerated · ~3KB
 */
(function () {
  'use strict';

  // ── Detect reduced motion preference ──────────
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion) {
    // Make everything visible immediately
    document.querySelectorAll('[data-animate]').forEach(el => {
      el.classList.add('is-visible');
    });
    return; // Skip all animation setup
  }

  // ── Scroll Reveal ─────────────────────────────
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
        threshold: 0.12,
        rootMargin: '0px 0px -60px 0px'
      }
    );

    elements.forEach(el => observer.observe(el));
  }

  // ── Staggered Grid Reveal ─────────────────────
  function initGridStagger() {
    const grids = document.querySelectorAll(
      '.products-grid, .categories-grid, .collections-scroll'
    );

    grids.forEach(grid => {
      const children = grid.children;
      if (!children.length) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              // Stagger all children of the grid
              Array.from(children).forEach((child, i) => {
                if (!child.hasAttribute('data-animate')) {
                  child.setAttribute('data-animate', 'fade-up');
                }
                // Dynamic stagger delay
                child.style.transitionDelay = `${i * 100}ms`;
                // Trigger with small offset for natural feel
                setTimeout(() => {
                  child.classList.add('is-visible');
                }, i * 80);
              });
              observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.08,
          rootMargin: '0px 0px -40px 0px'
        }
      );

      observer.observe(grid);
    });
  }

  // ── Parallax Effect ───────────────────────────
  function initParallax() {
    const elements = document.querySelectorAll('[data-parallax]');
    if (!elements.length) return;

    const intensityMap = {
      subtle: 0.03,
      medium: 0.06,
      strong: 0.1
    };

    let ticking = false;

    function updateParallax() {
      const scrollY = window.pageYOffset;
      const viewportHeight = window.innerHeight;

      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const intensity = intensityMap[el.dataset.parallax] || 0.03;

        // Only animate when in viewport
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

  // ── Image Load Transitions ────────────────────
  function initImageTransitions() {
    // Handle already-loaded images
    document.querySelectorAll('img').forEach(img => {
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add('loaded');
      }
    });

    // Handle future image loads
    document.addEventListener('load', (e) => {
      if (e.target.tagName === 'IMG') {
        e.target.classList.add('loaded');
      }
    }, true);

    // MutationObserver for dynamically added images
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          const imgs = node.tagName === 'IMG' ? [node] :
            (node.querySelectorAll ? Array.from(node.querySelectorAll('img')) : []);
          imgs.forEach(img => {
            if (img.complete && img.naturalWidth > 0) {
              img.classList.add('loaded');
            } else {
              img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
            }
          });
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── Backward Compatibility ────────────────────
  // Support existing .reveal elements from main.js
  function initLegacyReveal() {
    document.querySelectorAll('.reveal:not(.revealed)').forEach(el => {
      if (!el.hasAttribute('data-animate')) {
        el.setAttribute('data-animate', 'fade-up');
      }
    });
  }

  // ── Initialize Everything ─────────────────────
  function init() {
    initLegacyReveal();
    initScrollReveal();
    initGridStagger();
    initParallax();
    initImageTransitions();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-run for dynamically loaded content
  window.ArtevaAnimations = {
    refresh: init,
    reveal: initScrollReveal
  };
})();
