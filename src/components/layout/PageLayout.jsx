import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import MobileTabBar from './MobileTabBar';
import Toast from '../ui/Toast';
import FloatingCurrencySelector from './FloatingCurrencySelector';
import FloatingActions from './FloatingActions';
import PageTransition from '../transitions/RouteTransition';
import { SuspenseLoader } from '../ui/loading';
import './PageLayout.css';

/**
 * The persistent storefront shell.
 *
 * Header, footer, tab bar, cart drawer and the floating actions live outside
 * the animated slot and are never remounted by navigation — only the page
 * inside <PageTransition> leaves and arrives.
 *
 * The suspense boundary sits *inside* that slot on purpose. A boundary above
 * the shell would hide the header and footer for as long as a route chunk took
 * to arrive, which is exactly the blink this replaces. Scroll restoration lives
 * in RouteTransitionProvider, where it can fire on the swap rather than on the
 * URL change.
 */
export default function PageLayout() {
  return (
    <>
      <Header />
      <PageTransition as="main" className="page-main">
        <Suspense fallback={<SuspenseLoader />}>
          <Outlet />
        </Suspense>
      </PageTransition>
      <Footer />
      <MobileTabBar />
      <Toast />
      <FloatingCurrencySelector />
      <FloatingActions />
    </>
  );
}
