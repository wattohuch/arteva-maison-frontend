import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../../contexts/I18nContext';
import LuxuryLoader from './LuxuryLoader';
import {
  getLoadingScreenSnapshot,
  hideLoadingScreen,
  showLoadingScreen,
  subscribeLoadingScreen,
} from './loadingScreenStore';
import './GlobalLoadingScreen.css';

/* ============================================
   ARTÉVA Maison — Global loading screen

   One instance, mounted once, portalled to <body>. Every suspense boundary and
   every async page raises the same screen instead of rendering a loader of its
   own, which is what keeps the waiting state identical everywhere.

   The timing exists to stop it from being noise:

     SHOW_DELAY   a cached route chunk resolves in ~20ms. Showing a splash for
                  that is a flash, so nothing is drawn until the wait is real.
     MIN_VISIBLE  once it *is* drawn it stays long enough to be read, rather
                  than blinking out the instant the promise settles.
     EXIT_MS      matches the leave animation so the node is removed only after
                  it has finished fading.
   ============================================ */

const SHOW_DELAY = 140;
const MIN_VISIBLE = 620;
const EXIT_MS = 520;

export default function GlobalLoadingScreen() {
  const { t } = useI18n();
  const { active, options } = useSyncExternalStore(
    subscribeLoadingScreen,
    getLoadingScreenSnapshot,
    getLoadingScreenSnapshot
  );

  const [phase, setPhase] = useState('hidden'); // hidden | visible | leaving
  const shownAt = useRef(0);

  useEffect(() => {
    if (active) {
      if (phase === 'visible') return undefined;
      // Already on screen and leaving — bring it straight back rather than
      // fading out and in again behind a second wait.
      const delay = phase === 'leaving' ? 0 : SHOW_DELAY;
      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setPhase('visible');
      }, delay);
      return () => clearTimeout(timer);
    }

    if (phase !== 'visible') return undefined;
    const held = Date.now() - shownAt.current;
    const timer = setTimeout(
      () => setPhase('leaving'),
      Math.max(0, MIN_VISIBLE - held)
    );
    return () => clearTimeout(timer);
  }, [active, phase]);

  useEffect(() => {
    if (phase !== 'leaving') return undefined;
    const timer = setTimeout(() => setPhase('hidden'), EXIT_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === 'hidden') return null;

  return createPortal(
    <div
      className="lux-screen"
      data-phase={phase}
      role="status"
      aria-live="polite"
      aria-busy={phase !== 'leaving'}
    >
      <div className="lux-screen__silk" aria-hidden="true" />
      <LuxuryLoader
        title={options.title || t('loading')}
        subtitle={options.subtitle || t('please_wait')}
      />
    </div>,
    document.body
  );
}

/**
 * Suspense fallback. Renders no loader of its own — it raises the global
 * screen and leaves a spacer so the document keeps its height while the chunk
 * is in flight, which is what stops the page behind it from shifting.
 */
export function SuspenseLoader({ title, subtitle }) {
  useEffect(() => {
    showLoadingScreen({ title, subtitle });
    return () => hideLoadingScreen();
  }, [title, subtitle]);

  return <div className="route-suspense-spacer" aria-hidden="true" />;
}
