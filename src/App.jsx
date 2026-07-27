import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import PageLayout from './components/layout/PageLayout';
import RequireRole from './components/auth/RequireRole';
import PageTransition, {
  RouteTransitionProvider, useRouteTransition,
} from './components/transitions/RouteTransition';
import { RouteFallback } from './components/ui/loading';
import { trackSiteVisit } from './utils/siteVisit';

// Home is the landing route for nearly every visit, so it stays eager —
// lazy-loading it would only add a round trip before the hero can paint.
import HomePage from './pages/HomePage';

// Everything else is route-split. These were previously eager imports, which
// meant a first-time visitor downloaded the cart, account and detail pages
// before seeing the home page.
const ProductListPage = lazy(() => import('./pages/ProductListPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CollectionsPage = lazy(() => import('./pages/CollectionsPage'));
const CollectionPage = lazy(() => import('./pages/CollectionPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Lazy-loaded pages (secondary)
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AddressesPage = lazy(() => import('./pages/AddressesPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
const OrderTrackingPage = lazy(() => import('./pages/OrderTrackingPage'));
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
// Privacy, returns, terms and data deletion — one component, four documents.
// Meta requires the privacy and data-deletion URLs before Facebook Login can
// go live, and a published returns policy before a Shop is reviewed.
const LegalPage = lazy(() => import('./pages/LegalPage'));
const PaymentErrorPage = lazy(() => import('./pages/PaymentErrorPage'));
const PaymentPendingPage = lazy(() => import('./pages/PaymentPendingPage'));

// Admin & Driver (heavy, lazy-loaded)
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const DriverDashboard = lazy(() => import('./pages/driver/DriverDashboard'));

export default function App() {
  useEffect(() => { trackSiteVisit(); }, []);

  return (
    <RouteTransitionProvider>
      <AppRoutes />
    </RouteTransitionProvider>
  );
}

function AppRoutes() {
  // Routes are matched against the *displayed* location, which trails the URL
  // by one exit animation. Without this the router would swap the page out
  // from under the animation that is playing on it.
  const { displayLocation } = useRouteTransition();

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes location={displayLocation}>
        {/* Main layout routes */}
        <Route element={<PageLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="product/:slug" element={<ProductDetailPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="collection/:slug" element={<CollectionPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="addresses" element={<AddressesPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="order-success" element={<OrderSuccessPage />} />
          <Route path="order/:id/tracking" element={<OrderTrackingPage />} />
          <Route path="track-order" element={<TrackOrderPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="privacy" element={<LegalPage slug="privacy" />} />
          <Route path="terms" element={<LegalPage slug="terms" />} />
          <Route path="returns" element={<LegalPage slug="returns" />} />
          <Route path="data-deletion" element={<LegalPage slug="data-deletion" />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="payment-error" element={<PaymentErrorPage />} />
          <Route path="payment-pending" element={<PaymentPendingPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Admin layout (no header/footer). RequireRole holds rendering until
            the token is verified; the server enforces access independently. */}
        <Route
          path="admin/*"
          element={
            <RequireRole roles={['admin', 'owner', 'superuser']}>
              {/* `view` motion: these panels carry fixed sidebars and toolbars,
                  which a transform on the wrapper would re-anchor. */}
              <PageTransition motion="view">
                <AdminLayout />
              </PageTransition>
            </RequireRole>
          }
        />

        {/* Driver dashboard */}
        <Route
          path="driver"
          element={
            <RequireRole roles={['driver', 'admin', 'owner', 'superuser']}>
              <PageTransition motion="view">
                <DriverDashboard />
              </PageTransition>
            </RequireRole>
          }
        />
      </Routes>
    </Suspense>
  );
}
