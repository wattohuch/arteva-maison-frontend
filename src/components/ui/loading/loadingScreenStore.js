/* ============================================
   ARTÉVA Maison — Loading screen store

   A three-line external store rather than context, so *any* async work can
   raise the loading screen — a suspense fallback, a slow checkout submit, an
   imperative call from a page — without threading a provider through it.

   Requests are ref-counted: two boundaries suspending at once raise it once,
   and the screen only leaves when the last of them resolves.
   ============================================ */

let requests = 0;
let options = {};
let snapshot = { active: false, options };

const listeners = new Set();

function emit() {
  // A fresh object per change, a stable one between changes — that is the
  // contract `useSyncExternalStore` checks on every render.
  snapshot = { active: requests > 0, options };
  listeners.forEach((listener) => listener());
}

/** Raise the loading screen. Pair every call with `hideLoadingScreen`. */
export function showLoadingScreen(opts) {
  requests += 1;
  if (opts && (opts.title || opts.subtitle)) options = { ...opts };
  emit();
}

/** Release one request. The screen leaves when none are left. */
export function hideLoadingScreen() {
  requests = Math.max(0, requests - 1);
  if (requests === 0) options = {};
  emit();
}

export function subscribeLoadingScreen(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLoadingScreenSnapshot() {
  return snapshot;
}
