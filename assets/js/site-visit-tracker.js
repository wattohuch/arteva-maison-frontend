/**
 * ARTÉVA Maison - Site Visit Tracker
 * Fires a visit count on every page load across the entire site.
 * Uses sessionStorage to avoid duplicate API calls within the same session.
 * This tracks actual website visits (page loads), separate from product view tracking.
 */
(function () {
    'use strict';

    function trackSiteVisit() {
        // Only track once per session
        const visitedKey = 'arteva_site_visited';
        if (sessionStorage.getItem(visitedKey)) return;

        // Mark as visited for this session
        sessionStorage.setItem(visitedKey, '1');

        // Get API base URL
        const apiBase = window.API_BASE_URL || window.Config?.API_BASE_URL || 'https://arteva-maison-backend-gy1x.onrender.com/api';

        // Fire and forget — no need to wait for response
        fetch(apiBase + '/site-visit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page: window.location.pathname })
        }).catch(function () {
            // Silently fail — visit tracking should never break the page
        });
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', trackSiteVisit);
    } else {
        trackSiteVisit();
    }
})();
