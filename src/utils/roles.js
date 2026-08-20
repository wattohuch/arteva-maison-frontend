/**
 * ARTÉVA Maison — who can reach what, for the storefront's own links.
 *
 * One definition, so the header, the profile page and the route guards cannot
 * drift apart. They already had: the profile tile listed
 * `['admin', 'owner', 'superuser']`, the header's link checked
 * `role === 'admin'` alone — so an owner signing in on a phone was never
 * offered the dashboard at all — and neither knew about `cashier`, which left
 * counter staff with a working /admin route and no way to reach it short of
 * typing the URL.
 *
 * None of this is a permission. Every /admin route is guarded by RequireRole
 * and, independently, by the server on every request. These helpers decide
 * whether to OFFER a link, never whether to allow it.
 */

/** Roles with somewhere to go in the admin panel. */
export const STAFF_ROLES = ['cashier', 'admin', 'owner', 'superuser'];

/** Roles with the full dashboard, as opposed to the cashier's single screen. */
export const FULL_ADMIN_ROLES = ['admin', 'owner', 'superuser'];

export function isStaff(role) {
  return STAFF_ROLES.includes(role);
}

export function isFullAdmin(role) {
  return FULL_ADMIN_ROLES.includes(role);
}

export function isCashier(role) {
  return role === 'cashier';
}

/**
 * Where a staff member's link should point, and what it should say.
 *
 * A cashier's destination is the till, not the dashboard: sending them to
 * /admin would bounce them to the receipt generator anyway, and calling it
 * "Admin Dashboard" would promise a panel they cannot open.
 *
 * @param {string} role
 * @param {(key: string) => string} t  translator
 * @returns {{ to: string, label: string }|null} null when there is nothing to offer
 */
export function staffDestination(role, t) {
  if (isCashier(role)) {
    return { to: '/admin/receipt-generator', label: t('new_invoice') };
  }
  if (isFullAdmin(role)) {
    return { to: '/admin', label: t('admin_dashboard_btn') };
  }
  return null;
}
