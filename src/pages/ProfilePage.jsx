import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { SparkleIcon, PackageIcon, SearchIcon, BagIcon, CarIcon } from '../components/ui/Icons';
import { PinMark } from '../components/ui/PaymentMarks';
import Button from '../components/ui/Button';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, isLoggedIn, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn) navigate('/account', { replace: true });
  }, [isLoggedIn, navigate]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="section">
      <div className="container profile-container">
        {/* Sidebar */}
        <aside className="profile-sidebar glass-card-component">
          <div className="profile-avatar">
            <span>{(user.name || 'U').charAt(0).toUpperCase()}</span>
          </div>
          <h3 className="profile-name">{user.name}</h3>
          <p className="profile-email">{user.email}</p>

          <nav className="profile-nav">
            <Link to="/profile" className="profile-nav-item active">
              <SparkleIcon size={17} /> {t('sidebar_dashboard')}
            </Link>
            <Link to="/orders" className="profile-nav-item">
              <PackageIcon size={17} /> {t('sidebar_orders')}
            </Link>
            <Link to="/addresses" className="profile-nav-item">
              <PinMark /> {t('sidebar_addresses')}
            </Link>
          </nav>

          <button className="profile-logout" onClick={handleLogout}>
            {t('logout')}
          </button>
        </aside>

        {/* Main */}
        <main className="profile-main">
          <div className="glass-card-component" style={{ padding: 'var(--space-8)' }}>
            <h2 style={{ marginBottom: 'var(--space-2)' }}>{t('welcome_user')}, {user.name}!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-8)' }}>{t('dashboard_desc')}</p>

            <div className="dashboard-grid">
              {/* Staff entry point. Only rendered for privileged roles, and the
                  /admin route is independently guarded by RequireRole plus the
                  server's role checks — this tile is a shortcut, not the gate. */}
              {['admin', 'owner', 'superuser'].includes(user.role) && (
                <Link to="/admin" className="dashboard-card glass-card dashboard-card-staff">
                  <span className="dashboard-icon"><SparkleIcon size={24} /></span>
                  <h4>{t('admin_dashboard_btn')}</h4>
                </Link>
              )}
              {user.role === 'driver' && (
                <Link to="/driver" className="dashboard-card glass-card">
                  <span className="dashboard-icon"><CarIcon size={24} /></span>
                  <h4>{t('driver_dashboard_btn')}</h4>
                </Link>
              )}
              <Link to="/orders" className="dashboard-card glass-card">
                <span className="dashboard-icon"><PackageIcon size={24} /></span>
                <h4>{t('view_orders')}</h4>
              </Link>
              <Link to="/addresses" className="dashboard-card glass-card">
                <span className="dashboard-icon"><PinMark /></span>
                <h4>{t('manage_addresses')}</h4>
              </Link>
              <Link to="/track-order" className="dashboard-card glass-card">
                <span className="dashboard-icon"><SearchIcon size={24} /></span>
                <h4>{t('track_your_order')}</h4>
              </Link>
              <Link to="/checkout" className="dashboard-card glass-card">
                <span className="dashboard-icon"><BagIcon size={24} /></span>
                <h4>{t('checkout')}</h4>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
