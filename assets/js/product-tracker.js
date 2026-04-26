/**
 * ARTÉVA Maison - Product View Tracker
 * Fires a view count increment when a product detail page is loaded.
 * Uses sessionStorage to avoid counting the same product multiple times per session.
 */
(function () {
  'use strict';

  function trackProductView() {
    // Extract product ID from URL query string (e.g., ?id=abc123)
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) return;

    // Check if this product was already viewed this session
    const viewedKey = 'arteva_viewed_' + productId;
    if (sessionStorage.getItem(viewedKey)) return;

    // Mark as viewed for this session
    sessionStorage.setItem(viewedKey, '1');

    // Get API base URL
    const apiBase = window.API_BASE_URL || window.Config?.API_BASE_URL || 'http://localhost:5000/api';

    // Fire and forget — no need to wait for response
    fetch(apiBase + '/products/' + productId + '/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(function () {
      // Silently fail — view tracking should never break the page
    });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackProductView);
  } else {
    trackProductView();
  }
})();
