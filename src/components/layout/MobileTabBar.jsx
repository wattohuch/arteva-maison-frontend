import { NavLink } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { HomeIcon, GridIcon, HeartIcon, UserIcon } from '../ui/Icons';
import './MobileTabBar.css';

/**
 * Native-app style bottom navigation. Mobile only — hidden from ≥769px by CSS,
 * so it costs nothing on desktop beyond a single hidden element.
 */
export default function MobileTabBar() {
  const { t } = useI18n();
  const { isLoggedIn } = useAuth();
  const { count: wishlistCount } = useWishlist();

  const tabs = [
    { to: '/', label: t('home'), Icon: HomeIcon, end: true },
    { to: '/collections', label: t('categories'), Icon: GridIcon },
    { to: '/wishlist', label: t('wishlist'), Icon: HeartIcon, badge: wishlistCount },
    { to: isLoggedIn ? '/profile' : '/account', label: t('account'), Icon: UserIcon },
  ];

  return (
    <nav className="tabbar" aria-label="Mobile navigation">
      <div className="tabbar-inner">
        {tabs.map(({ to, label, Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `tab-item ${isActive ? 'is-active' : ''}`}
          >
            <span className="tab-icon">
              <Icon size={21} />
              {badge > 0 && <span className="tab-badge">{badge}</span>}
            </span>
            <span className="tab-label">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
