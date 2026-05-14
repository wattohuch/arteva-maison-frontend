/**
 * ARTÉVA Maison - Dynamic Social Links
 * Fetches WhatsApp & Instagram settings from the backend
 * and updates all hardcoded links across the page in real-time.
 * 
 * Include this script AFTER config.js on every public page.
 */
(function () {
    'use strict';

    // Cache key & TTL (5 minutes)
    const CACHE_KEY = 'arteva_social_settings';
    const CACHE_TTL = 5 * 60 * 1000;

    // Default values (fallback if API is unreachable)
    const DEFAULTS = {
        whatsappNumber: '96550683207',
        whatsappDisplay: '+965 5068 3207',
        instagramHandle: 'arteva.maison'
    };

    /**
     * Apply social link settings to the DOM
     */
    function applySettings(settings) {
        const waNum = settings.whatsappNumber || DEFAULTS.whatsappNumber;
        const waDisplay = settings.whatsappDisplay || DEFAULTS.whatsappDisplay;
        const igHandle = settings.instagramHandle || DEFAULTS.instagramHandle;

        const waApiLink = 'https://api.whatsapp.com/send?phone=' + waNum;
        const waMeLink = 'https://wa.me/' + waNum;
        const igLink = 'https://www.instagram.com/' + igHandle;

        // ── Update all WhatsApp links ──
        document.querySelectorAll('a[href*="whatsapp.com/send"], a[href*="wa.me/"]').forEach(function (el) {
            const oldHref = el.getAttribute('href');
            // Preserve any ?text= parameter
            var textParam = '';
            var textMatch = oldHref.match(/[?&]text=([^&]*)/);
            if (textMatch) {
                textParam = '&text=' + textMatch[1];
            }

            if (oldHref.includes('wa.me/')) {
                el.setAttribute('href', waMeLink + (textParam ? '?text=' + textParam.replace('&text=', '') : ''));
            } else {
                el.setAttribute('href', waApiLink + textParam);
            }
        });

        // ── Update WhatsApp display numbers (footer contact text) ──
        document.querySelectorAll('a[href*="whatsapp.com/send"], a[href*="wa.me/"]').forEach(function (el) {
            // Only update text if it looks like a phone number display
            var text = el.textContent.trim();
            if (/^\+?\d[\d\s\-()]+$/.test(text)) {
                el.textContent = waDisplay;
            }
        });

        // ── Update standalone phone number displays near WhatsApp icons ──
        document.querySelectorAll('.footer-contact-item p a[href*="whatsapp"]').forEach(function (el) {
            el.textContent = waDisplay;
        });

        // ── Update all Instagram links ──
        document.querySelectorAll('a[href*="instagram.com/"]').forEach(function (el) {
            el.setAttribute('href', igLink);
        });

        // ── Update the support widget (it builds its own DOM) ──
        // The widget uses wa.me links, so we need to update after it initializes
        var supportWA = document.getElementById('supportWhatsApp');
        if (supportWA) {
            var oldSupport = supportWA.getAttribute('href');
            var supportText = '';
            var supportMatch = oldSupport.match(/[?&]text=([^&]*)/);
            if (supportMatch) {
                supportText = '?text=' + supportMatch[1];
            }
            supportWA.setAttribute('href', waMeLink + supportText);
        }

        // ── Update receipt page WhatsApp number ──
        document.querySelectorAll('strong').forEach(function (el) {
            if (/^\+?\d[\d\s\-()]+$/.test(el.textContent.trim()) && el.closest && el.closest('p')) {
                // Check if parent mentions WhatsApp
                var parentText = el.closest('p').textContent;
                if (parentText.toLowerCase().includes('whatsapp')) {
                    el.textContent = waDisplay;
                }
            }
        });

        // Store globally for any JS that needs it
        window.ARTEVA_SOCIAL = {
            whatsappNumber: waNum,
            whatsappDisplay: waDisplay,
            instagramHandle: igHandle,
            whatsappApiLink: waApiLink,
            whatsappMeLink: waMeLink,
            instagramLink: igLink
        };
    }

    /**
     * Fetch settings from API (with localStorage caching)
     */
    async function fetchAndApply() {
        // Check cache first
        try {
            var cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                var parsed = JSON.parse(cached);
                if (parsed.timestamp && (Date.now() - parsed.timestamp) < CACHE_TTL) {
                    applySettings(parsed.data);
                    return;
                }
            }
        } catch (e) { /* ignore parse errors */ }

        // Fetch from API
        try {
            var apiBase = window.API_BASE_URL || (window.Config && window.Config.API_BASE_URL) || 'https://arteva-maison-backend-gy1x.onrender.com/api';
            var res = await fetch(apiBase + '/admin/site-settings');
            if (res.ok) {
                var result = await res.json();
                if (result.success && result.data) {
                    // Cache the result
                    localStorage.setItem(CACHE_KEY, JSON.stringify({
                        timestamp: Date.now(),
                        data: result.data
                    }));
                    applySettings(result.data);
                    return;
                }
            }
        } catch (e) {
            // API unreachable — use defaults silently
        }

        // Fallback to defaults (no change needed since HTML already has them)
        applySettings(DEFAULTS);
    }

    // ── Run when DOM is ready ──
    function init() {
        // Small delay to let support widget and other scripts render first
        setTimeout(fetchAndApply, 200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
