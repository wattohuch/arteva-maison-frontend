import { apiRequest } from '../api/client';

const VISITED_KEY = 'arteva_site_visited';

/**
 * Records one site visit per browser session, for the admin Visitors page.
 *
 * Ported from the pre-React site (assets/js/site-visit-tracker.js) — the call
 * never made it into the React rewrite, so the backend's SiteVisit collection
 * (and the admin dashboard reading it) has been counting almost no real
 * traffic since.
 */
export function trackSiteVisit() {
  try {
    if (sessionStorage.getItem(VISITED_KEY)) return;
    sessionStorage.setItem(VISITED_KEY, '1');
  } catch {
    // Private mode with storage blocked — fall through and track anyway
    // rather than silently dropping the visit.
  }

  apiRequest('/site-visit', {
    method: 'POST',
    body: JSON.stringify({ page: window.location.pathname }),
  }).catch(() => {});
}
