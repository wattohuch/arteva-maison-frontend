import {
  createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import './RouteTransition.css';

/* ============================================
   ARTÉVA Maison — Global route transition

   The router used to swap route elements the instant the URL changed, which
   showed as a flash: the old page vanished, the new one painted mid-fetch and
   the shell blinked. This holds the *displayed* location one beat behind the
   real one so a page can leave before its replacement arrives:

       current page → exit (fade) → router swaps → entrance (fade + rise)

   Only the page slot moves. Header, footer, cart drawer and floating actions
   sit outside it and are never remounted.
   ============================================ */

/** How long the outgoing page fades before the router swaps. Deliberately
 *  shorter than the entrance — a slow exit is felt as latency. */
const EXIT_MS = 170;

const RouteTransitionContext = createContext(null);

/** Live `prefers-reduced-motion`, so a mid-session change is honoured. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/**
 * The unit a transition is played for.
 *
 * Everything under /admin and /driver collapses to a single key: those panels
 * own their internal <Routes> and their own section loader, so replaying the
 * shell transition on every sidebar click would fight them.
 */
function transitionKeyFor(pathname) {
  const segment = pathname.split('/')[1];
  if (segment === 'admin' || segment === 'driver') return `/${segment}`;
  return pathname.replace(/\/+$/, '') || '/';
}

export function RouteTransitionProvider({ children }) {
  const location = useLocation();
  const reducedMotion = usePrefersReducedMotion();

  // The location the tree is actually rendering. Trails `location` by one
  // exit animation whenever the transition key changes.
  const [displayLocation, setDisplayLocation] = useState(location);
  const [stage, setStage] = useState('entered');
  const swapTimer = useRef(null);
  const lastScrollKey = useRef(null);

  useEffect(() => {
    if (location === displayLocation) return undefined;

    const sameView = transitionKeyFor(location.pathname)
      === transitionKeyFor(displayLocation.pathname);

    // A query-string change, a hash, an in-panel admin route — or a user who
    // asked for less motion. Swap straight through; there is nothing to leave.
    // `setStage` also covers navigating back to the outgoing page mid-exit,
    // which would otherwise strand it at opacity 0.
    if (sameView || reducedMotion) {
      clearTimeout(swapTimer.current);
      setDisplayLocation(location);
      setStage('entered');
      return undefined;
    }

    setStage('exiting');
    clearTimeout(swapTimer.current);
    swapTimer.current = setTimeout(() => {
      setDisplayLocation(location);
      setStage('entered');
    }, EXIT_MS);

    return undefined;
  }, [location, displayLocation, reducedMotion]);

  useEffect(() => () => clearTimeout(swapTimer.current), []);

  /* Scroll resets at the swap, not when the URL changes — resetting during the
     exit would yank the page the visitor is still looking at. Keyed on the
     transition key so admin's internal navigation keeps its scroll position,
     as it did before this system existed. */
  useLayoutEffect(() => {
    const key = transitionKeyFor(displayLocation.pathname);
    if (lastScrollKey.current === key) return;
    lastScrollKey.current = key;
    window.scrollTo(0, 0);
  }, [displayLocation]);

  const value = useMemo(() => ({
    stage,
    displayLocation,
    reducedMotion,
    transitionKey: transitionKeyFor(displayLocation.pathname),
  }), [stage, displayLocation, reducedMotion]);

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition() {
  const ctx = useContext(RouteTransitionContext);
  if (!ctx) throw new Error('useRouteTransition must be used within RouteTransitionProvider');
  return ctx;
}

/**
 * The animated page slot. Wrap the routed content — never the shared chrome.
 *
 * `motion="page"` — storefront pages: fade + a short rise and settle.
 * `motion="view"` — full-screen panels (admin, driver): opacity only, because
 * they contain position:fixed chrome that a transform would re-anchor.
 */
export default function PageTransition({
  as: Tag = 'div',
  motion = 'page',
  className = '',
  children,
  ...rest
}) {
  const { stage, transitionKey } = useRouteTransition();

  return (
    <Tag
      // Remounting on the displayed key is what replays the entrance and gives
      // each page a clean mount, exactly as the old `key={pathname}` did.
      key={transitionKey}
      className={`route-transition route-transition--${motion} ${className}`.trim()}
      data-stage={stage}
      {...rest}
    >
      {children}
    </Tag>
  );
}
