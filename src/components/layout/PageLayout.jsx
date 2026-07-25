import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import MobileTabBar from './MobileTabBar';
import Toast from '../ui/Toast';
import FloatingCurrencySelector from './FloatingCurrencySelector';
import FloatingActions from './FloatingActions';
import './PageLayout.css';

export default function PageLayout() {
  const { pathname } = useLocation();

  // Every route change starts at the top — otherwise the router keeps the
  // previous scroll offset and pages appear to open half-way down.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Header />
      {/* keyed by route so each page replays its entrance transition */}
      <main key={pathname} className="page-main">
        <Outlet />
      </main>
      <Footer />
      <MobileTabBar />
      <Toast />
      <FloatingCurrencySelector />
      <FloatingActions />
    </>
  );
}
