import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import PageLayout from './components/layout/PageLayout';
import RequireRole from './components/auth/RequireRole';
import Loader from './components/ui/Loader';

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
const PaymentErrorPage = lazy(() => import('./pages/PaymentErrorPage'));
const PaymentPendingPage = lazy(() => import('./pages/PaymentPendingPage'));

// Admin & Driver (heavy, lazy-loaded)
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const DriverDashboard = lazy(() => import('./pages/driver/DriverDashboard'));

function LazyFallback() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Loader /></div>;
}

export default function App() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Routes>
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
              <AdminLayout />
            </RequireRole>
          }
        />

        {/* Driver dashboard */}
        <Route
          path="driver"
          element={
            <RequireRole roles={['driver', 'admin', 'owner', 'superuser']}>
              <DriverDashboard />
            </RequireRole>
          }
        />
      </Routes>
    </Suspense>
  );
}
