import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { API_BASE_URL } from '../../api/client';
import { showToast } from '../../components/ui/Toast';
import Toast from '../../components/ui/Toast';
import Loader from '../../components/ui/Loader';
import {
  GridIcon, BagIcon, UserIcon, HomeIcon, MenuIcon, CloseIcon, SparkleIcon,
  ImageIcon, FolderIcon, CarIcon, SendIcon, ChartIcon, TagIcon,
  ReceiptIcon, GlobeIcon, TicketIcon, PhoneIcon, CoinsIcon,
} from '../../components/ui/Icons';
import './AdminLayout.css';

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
const ReceiptGenerator = lazy(() => import('./receipt/ReceiptGenerator'));
const RevenueSection = lazy(() => import('./sections/RevenueSection'));
const RevenueGate = lazy(() => import('./sections/RevenueGate'));

const playAdminChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24); // G5
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn('Audio alert error:', e);
  }
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef(null);

  // Revenue belongs to the shop owner. `superuser` is the developer account —
  // it administers everything else but is deliberately kept out of the takings,
  // so it does NOT count as an owner here.
  const isOwner = user?.role === 'owner';

  const navItems = [
    { to: '/admin/dashboard', Icon: SparkleIcon, label: t('dashboard') },
    { to: '/admin/products', Icon: GridIcon, label: t('products') },
    { to: '/admin/hero-slides', Icon: ImageIcon, label: 'Hero Slides' },
    { to: '/admin/browse-collections', Icon: GridIcon, label: 'Browse Collections' },
    { to: '/admin/categories', Icon: FolderIcon, label: 'Categories' },
    { to: '/admin/orders', Icon: BagIcon, label: t('orders') },
    { to: '/admin/receipt-generator', Icon: ReceiptIcon, label: 'Receipt Generator' },
    ...(isOwner ? [{ to: '/admin/revenue', Icon: CoinsIcon, label: 'Revenue' }] : []),
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

  // Close sidebar on route change
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

  // Global Socket.IO Listener for Admin Dashboard
  useEffect(() => {
    const backendOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
    const socket = io(backendOrigin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join_admin_room');
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    const handleRealtimeOrderEvent = (eventName, data) => {
      playAdminChime();
      showToast(`⚡ Live Socket: ${eventName} received!`, 'info');
      // Dispatch browser custom event for child sections (OrdersSection, DashboardSection)
      window.dispatchEvent(new CustomEvent('admin_realtime_order', { detail: { eventName, data } }));
    };

    socket.on('new_order', (data) => handleRealtimeOrderEvent('New Order Placed', data));
    socket.on('order_status_update', (data) => handleRealtimeOrderEvent('Order Status Updated', data));
    socket.on('driver_order_update', (data) => handleRealtimeOrderEvent('Driver Update', data));
    socket.on('driver_new_assignment', (data) => handleRealtimeOrderEvent('Driver Assignment', data));

    return () => {
      socket.disconnect();
    };
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="admin-topbar-title" style={{ margin: 0 }}>{current?.label || t('admin_dashboard')}</h1>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: socketConnected ? '#059669' : '#d97706', background: socketConnected ? '#ecfdf5' : '#fffbeb', padding: '3px 10px', borderRadius: 16, border: '1px solid currentColor' }}>
              {socketConnected ? '🟢 Live Socket Active' : '🟡 Socket Reconnecting...'}
            </span>
          </div>
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
              <Route path="receipt-generator" element={<ReceiptGenerator />} />
              {/* The gate refuses non-owners and demands the revenue password
                  before RevenueSection is ever mounted. */}
              <Route path="revenue" element={<RevenueGate><RevenueSection /></RevenueGate>} />
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
