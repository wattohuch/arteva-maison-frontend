import { lazy, Suspense, useState, useEffect } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import Toast from '../../components/ui/Toast';
import Loader from '../../components/ui/Loader';
import {
  GridIcon, BagIcon, UserIcon, HomeIcon, MenuIcon, CloseIcon, SparkleIcon,
  ImageIcon, FolderIcon, CarIcon, SendIcon, ChartIcon, TagIcon,
  ReceiptIcon, GlobeIcon, TicketIcon, PhoneIcon,
} from '../../components/ui/Icons';
import './AdminLayout.css';

/**
 * Admin shell.
 *
 * Sections are real routes (/admin/orders, /admin/products, …) rather than
 * local state, so the browser back button, deep links and refreshes behave.
 * Each section is code-split — opening the dashboard no longer downloads the
 * products form and the users table with it.
 */

const DashboardSection = lazy(() => import('./sections/DashboardSection'));
const OrdersSection = lazy(() => import('./sections/OrdersSection'));
const ProductsSection = lazy(() => import('./sections/ProductsSection'));
const UsersSection = lazy(() => import('./sections/UsersSection'));
const HeroSlidesSection = lazy(() => import('./sections/HeroSlidesSection'));
const BrowseCollectionsSection = lazy(() => import('./sections/BrowseCollectionsSection'));
const CategoriesSection = lazy(() => import('./sections/CategoriesSection'));
const DriversSection = lazy(() => import('./sections/DriversSection'));
const MarketingSection = lazy(() => import('./sections/MarketingSection'));
const AnalyticsSection = lazy(() => import('./sections/AnalyticsSection'));
const DiscountsSection = lazy(() => import('./sections/DiscountsSection'));
const ReceiptsSection = lazy(() => import('./sections/ReceiptsSection'));
const VisitorsSection = lazy(() => import('./sections/VisitorsSection'));
const PromoCodesSection = lazy(() => import('./sections/PromoCodesSection'));
const SocialContactsSection = lazy(() => import('./sections/SocialContactsSection'));

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { to: '/admin/dashboard', Icon: SparkleIcon, label: t('dashboard') },
    { to: '/admin/products', Icon: GridIcon, label: t('products') },
    { to: '/admin/hero-slides', Icon: ImageIcon, label: 'Hero Slides' },
    { to: '/admin/browse-collections', Icon: GridIcon, label: 'Browse Collections' },
    { to: '/admin/categories', Icon: FolderIcon, label: 'Categories' },
    { to: '/admin/orders', Icon: BagIcon, label: t('orders') },
    { to: '/admin/users', Icon: UserIcon, label: t('users') },
    { to: '/admin/drivers', Icon: CarIcon, label: 'Drivers' },
    { to: '/admin/marketing', Icon: SendIcon, label: 'Marketing' },
    { to: '/admin/analytics', Icon: ChartIcon, label: 'Analytics' },
    { to: '/admin/discounts', Icon: TagIcon, label: 'Discounts' },
    { to: '/admin/receipts', Icon: ReceiptIcon, label: 'Receipts' },
    { to: '/admin/visitors', Icon: GlobeIcon, label: 'Visitors' },
    { to: '/admin/promo-codes', Icon: TicketIcon, label: 'Promo Codes' },
    { to: '/admin/social-contacts', Icon: PhoneIcon, label: 'Social Contacts' },
  ];

  // Close the drawer whenever the route changes
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('no-scroll', sidebarOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [sidebarOpen]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const current = navItems.find(n => location.pathname.startsWith(n.to));

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="admin-layout">
      <div
        className={`admin-sidebar-overlay ${sidebarOpen ? 'is-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className={`admin-sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-label="Admin navigation">
        <div className="admin-sidebar-logo">
          <span>ARTÉVA</span>
          <small>{t('admin_dashboard')}</small>
        </div>

        <nav className="admin-sidebar-nav">
          {navItems.map(({ to, Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="admin-nav-icon"><Icon size={18} /></span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button type="button" onClick={() => navigate('/')} className="admin-nav-item">
            <span className="admin-nav-icon"><HomeIcon size={18} /></span>
            <span>{t('back_to_store')}</span>
          </button>
          <button type="button" onClick={handleLogout} className="admin-nav-item admin-nav-logout">
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-menu-toggle"
            onClick={() => setSidebarOpen(v => !v)}
            aria-label={t('menu')}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
          </button>
          <h1 className="admin-topbar-title">{current?.label || t('admin_dashboard')}</h1>
          <div className="admin-topbar-user">
            <span className="admin-topbar-name">{user?.name}</span>
            <span className="admin-topbar-role">{user?.role}</span>
          </div>
        </header>

        <main className="admin-content">
          <Suspense fallback={<div className="admin-loading"><Loader /></div>}>
            <Routes>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardSection />} />
              <Route path="products" element={<ProductsSection />} />
              <Route path="hero-slides" element={<HeroSlidesSection />} />
              <Route path="browse-collections" element={<BrowseCollectionsSection />} />
              <Route path="categories" element={<CategoriesSection />} />
              <Route path="orders" element={<OrdersSection />} />
              <Route path="users" element={<UsersSection />} />
              <Route path="drivers" element={<DriversSection />} />
              <Route path="marketing" element={<MarketingSection />} />
              <Route path="analytics" element={<AnalyticsSection />} />
              <Route path="discounts" element={<DiscountsSection />} />
              <Route path="receipts" element={<ReceiptsSection />} />
              <Route path="visitors" element={<VisitorsSection />} />
              <Route path="promo-codes" element={<PromoCodesSection />} />
              <Route path="social-contacts" element={<SocialContactsSection />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      <Toast />
    </div>
  );
}
