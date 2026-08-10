import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useI18n } from '../../contexts/I18nContext';
import { useCategories } from '../../contexts/CategoriesContext';
import { useWishlist } from '../../contexts/WishlistContext';
import CartDrawer from '../cart/CartDrawer';
import { trackSearch } from '../../utils/metaPixel';
import {
  SearchIcon, UserIcon, HeartIcon, BagIcon,
  MenuIcon, CloseIcon, ChevronDownIcon, ArrowRightIcon,
} from '../ui/Icons';
import './Header.css';

export default function Header() {
  const { isLoggedIn, user } = useAuth();
  const { count } = useCart();
  const { t, lang, setLang } = useI18n();
  const { categories, loading: categoriesLoading, error: categoriesError, getCategoryName } = useCategories();
  const { count: wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileCatOpen, setMobileCatOpen] = useState(false);
  const searchInputRef = useRef(null);

  /* The navbar is translucent-dark while it floats over the hero image and
     switches to light glass once the page scrolls onto a beige surface. */
  const overHero = location.pathname === '/' && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close every overlay on navigation
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setCartOpen(false);
  }, [location.pathname, location.search]);

  // Lock body scroll behind the mobile drawer and the search modal
  useEffect(() => {
    const locked = menuOpen || searchOpen;
    document.body.classList.toggle('no-scroll', locked);
    return () => document.body.classList.remove('no-scroll');
  }, [menuOpen, searchOpen]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setSearchOpen(false);
      setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Search is a standard Meta event and one of the more useful ones for a
      // catalogue this size — it says what people expected to find. It was
      // defined in metaPixel.js but never called from anywhere.
      trackSearch(searchQuery.trim());
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  }, [searchQuery, navigate]);

  return (
    <>
      <header className={`site-header ${overHero ? 'is-over-hero' : 'is-solid'}`}>
        {/* Floating glass navbar */}
        <div className="nav-shell container">
          <nav className="navbar" aria-label="Primary">
            {/* Left — links (desktop) / menu toggle (mobile) */}
            <div className="nav-col nav-col-left">
              <button
                className="nav-icon-btn nav-menu-toggle"
                onClick={() => setMenuOpen(true)}
                aria-label={t('menu')}
                aria-expanded={menuOpen}
              >
                <MenuIcon size={20} />
              </button>

              <ul className="nav-links">
                <li><Link to="/" className="nav-link">{t('home')}</Link></li>

                <li className="nav-dropdown-wrap">
                  <Link to="/collections" className="nav-link nav-link-trigger">
                    {t('categories')}
                    <ChevronDownIcon size={13} className="nav-caret" />
                  </Link>

                  <div className="nav-dropdown" role="menu">
                    {categoriesLoading ? (
                      <div className="dropdown-skeleton" aria-hidden="true">
                        <span /><span /><span />
                      </div>
                    ) : categoriesError && categories.length === 0 ? (
                      <p className="dropdown-note">{t('categories_unavailable')}</p>
                    ) : (
                      categories.map((cat) => {
                        const slug = cat.slug || cat._id;
                        return (
                          <Link
                            key={cat._id || cat.id || slug}
                            to={`/collection/${slug}`}
                            className="dropdown-item"
                            role="menuitem"
                          >
                            <span>{getCategoryName(cat)}</span>
                            <ArrowRightIcon size={14} />
                          </Link>
                        );
                      })
                    )}
                  </div>
                </li>

                <li><Link to="/collections" className="nav-link">{t('collections')}</Link></li>
                <li><Link to="/contact" className="nav-link">{t('contact')}</Link></li>
              </ul>
            </div>

            {/* Center — logo */}
            <div className="nav-col nav-col-center">
              <Link to="/" className="brand" aria-label="ARTÉVA Maison — Home">
                <span className="brand-name">ARTÉVA</span>
                <span className="brand-sub">Maison</span>
              </Link>
            </div>

            {/* Right — actions */}
            <div className="nav-col nav-col-right">
              <div className="lang-switch" role="group" aria-label="Language">
                <button
                  className={`lang-btn ${lang === 'en' ? 'is-active' : ''}`}
                  onClick={() => setLang('en')}
                  aria-pressed={lang === 'en'}
                >EN</button>
                <span className="lang-divider" aria-hidden="true" />
                <button
                  className={`lang-btn ${lang === 'ar' ? 'is-active' : ''}`}
                  onClick={() => setLang('ar')}
                  aria-pressed={lang === 'ar'}
                >AR</button>
              </div>

              <div className="nav-actions">
                {/* Compact one-tap toggle. The full EN | AR pair is hidden on
                    narrow viewports, so this shows the language you'd switch
                    *to* and flips on tap. */}
                <button
                  className="nav-lang-toggle"
                  onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                  aria-label={lang === 'en' ? 'التبديل إلى العربية' : 'Switch to English'}
                >
                  {lang === 'en' ? 'ع' : 'EN'}
                </button>

                <button
                  className="nav-icon-btn"
                  onClick={() => setSearchOpen(true)}
                  aria-label={t('search')}
                >
                  <SearchIcon size={20} />
                </button>

                <Link
                  to={isLoggedIn ? '/profile' : '/account'}
                  className="nav-icon-btn nav-hide-sm"
                  aria-label={t('account')}
                >
                  <UserIcon size={20} />
                </Link>

                <Link to="/wishlist" className="nav-icon-btn nav-hide-sm" aria-label={t('wishlist')}>
                  <HeartIcon size={20} />
                  {wishlistCount > 0 && <span className="nav-badge">{wishlistCount}</span>}
                </Link>

                <button
                  className="nav-icon-btn"
                  onClick={() => setCartOpen(true)}
                  aria-label={`${t('your_cart')} (${count})`}
                >
                  <BagIcon size={20} />
                  {count > 0 && <span className="nav-badge">{count}</span>}
                </button>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* ── Search modal ── */}
      <div
        className={`search-modal ${searchOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('search')}
        aria-hidden={!searchOpen}
      >
        <div className="search-scrim" onClick={() => setSearchOpen(false)} />
        <div className="search-panel">
          <div className="search-panel-head">
            <span className="eyebrow">{t('search')}</span>
            <button className="panel-close" onClick={() => setSearchOpen(false)} aria-label={t('close')}>
              <CloseIcon size={18} />
            </button>
          </div>
          <form onSubmit={handleSearch} className="search-form">
            <SearchIcon size={20} />
            <input
              ref={searchInputRef}
              type="search"
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              tabIndex={searchOpen ? 0 : -1}
            />
            <button type="submit" className="btn btn-primary btn-sm">{t('search')}</button>
          </form>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <div
        className={`mobile-menu-scrim ${menuOpen ? 'is-open' : ''}`}
        onClick={() => setMenuOpen(false)}
      />
      <aside
        className={`mobile-menu ${menuOpen ? 'is-open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="mobile-menu-head">
          <span className="brand-name brand-name-sm">ARTÉVA</span>
          <button className="panel-close" onClick={() => setMenuOpen(false)} aria-label={t('close')}>
            <CloseIcon size={18} />
          </button>
        </div>

        <nav className="mobile-nav">
          <Link to="/" className="mobile-nav-link">{t('home')}</Link>

          <div className="mobile-group">
            <button
              className="mobile-nav-link mobile-group-trigger"
              onClick={() => setMobileCatOpen(o => !o)}
              aria-expanded={mobileCatOpen}
            >
              <span>{t('categories')}</span>
              <ChevronDownIcon size={16} className={`mobile-caret ${mobileCatOpen ? 'is-open' : ''}`} />
            </button>
            <div className={`mobile-sublist ${mobileCatOpen ? 'is-open' : ''}`}>
              {categories.map(cat => (
                <Link
                  key={cat._id || cat.slug}
                  to={`/collection/${cat.slug || cat._id}`}
                  className="mobile-sub-link"
                >
                  {getCategoryName(cat)}
                </Link>
              ))}
            </div>
          </div>

          <Link to="/collections" className="mobile-nav-link">{t('collections')}</Link>
          <Link to="/products" className="mobile-nav-link">{t('view_all_products')}</Link>
          <Link to="/wishlist" className="mobile-nav-link">{t('wishlist')}</Link>
          <Link to="/contact" className="mobile-nav-link">{t('contact')}</Link>
          <Link to={isLoggedIn ? '/profile' : '/account'} className="mobile-nav-link">{t('account')}</Link>
          {isLoggedIn && user?.role === 'admin' && (
            <Link to="/admin" className="mobile-nav-link">{t('admin_dashboard')}</Link>
          )}
        </nav>

        <div className="mobile-menu-foot">
          <button
            className={`lang-btn ${lang === 'en' ? 'is-active' : ''}`}
            onClick={() => setLang('en')}
          >English</button>
          <span className="lang-divider" aria-hidden="true" />
          <button
            className={`lang-btn ${lang === 'ar' ? 'is-active' : ''}`}
            onClick={() => setLang('ar')}
          >العربية</button>
        </div>
      </aside>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
