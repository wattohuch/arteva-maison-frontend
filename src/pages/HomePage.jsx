import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useCategories } from '../contexts/CategoriesContext';
import { ProductsAPI } from '../api/products';
import { HeroAPI } from '../api/hero';
import ProductCard from '../components/product/ProductCard';
import CollectionCard from '../components/product/CollectionCard';
import { LuxuryLoader } from '../components/ui/loading';
import { cloudinaryImage, cloudinarySrcSet } from '../utils/imageHelpers';
import {
  ArrowRightIcon, ChevronRightIcon,
  TruckIcon, SparkleIcon, ShieldIcon, SupportIcon,
} from '../components/ui/Icons';
import './HomePage.css';

const HERO_FALLBACK =
  'https://images.unsplash.com/photo-1616046229478-9901c5536a45?q=80&w=2000';

export default function HomePage() {
  const { t, lang } = useI18n();
  const { categories } = useCategories();
  const [heroSlides, setHeroSlides] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [collectionFeatured, setCollectionFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const railRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [heroRes, prodRes, collFeatRes] = await Promise.allSettled([
          HeroAPI.getSlides(),
          ProductsAPI.getFeatured(8),
          ProductsAPI.getCollectionFeatured(12),
        ]);
        if (cancelled) return;
        if (heroRes.status === 'fulfilled' && heroRes.value.data) {
          setHeroSlides(heroRes.value.data);
        }
        if (prodRes.status === 'fulfilled') {
          setFeatured(prodRes.value.data || prodRes.value || []);
        }
        if (collFeatRes.status === 'fulfilled') {
          setCollectionFeatured(collFeatRes.value.data || collFeatRes.value || []);
        }
      } catch { /* fall back to static hero copy */ } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Auto-advance hero
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const scrollRail = useCallback((dir) => {
    const rail = railRef.current;
    if (!rail) return;
    const rtl = document.documentElement.dir === 'rtl';
    rail.scrollBy({ left: dir * rail.clientWidth * 0.8 * (rtl ? -1 : 1), behavior: 'smooth' });
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <LuxuryLoader size="inline" title={t('loading')} subtitle={t('please_wait')} />
      </div>
    );
  }

  const slide = heroSlides[currentSlide];
  const heroTitle = (lang === 'ar' && slide?.titleAr) || slide?.titleEn || t('hero_title');
  const heroSubtitle = (lang === 'ar' && slide?.subtitleAr) || slide?.subtitleEn || t('hero_subtitle');
  const heroDesc = (lang === 'ar' && slide?.descriptionAr) || slide?.descriptionEn || t('hero_desc');

  return (
    <div className="home-page">
      {/* ══ Hero ══ */}
      <section className="hero">
        <div className="hero-media">
          {/* Only the active slide is rendered opaque; the rest cross-fade out */}
          {/* The hero is the LCP element on nearly every visit. Sizing it per
              viewport keeps a phone from downloading a 2000px-wide photo to
              display it 390px wide. */}
          <img
            key={slide?.image || 'fallback'}
            src={cloudinaryImage(slide?.image || HERO_FALLBACK, 1600)}
            srcSet={cloudinarySrcSet(slide?.image, [640, 960, 1280, 1920])}
            sizes="100vw"
            alt=""
            className="hero-image"
            fetchPriority="high"
            decoding="async"
          />
          <div className="hero-scrim" />
        </div>

        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow hero-eyebrow reveal">{heroSubtitle}</span>
            <h1
              className="hero-title reveal reveal-1"
              dangerouslySetInnerHTML={{ __html: heroTitle }}
            />
            <p className="hero-desc reveal reveal-2">{heroDesc}</p>
            <div className="hero-actions reveal reveal-3">
              <Link to="/collections" className="btn btn-primary btn-lg">
                {t('shop_collection')}
                <ArrowRightIcon size={16} />
              </Link>
              <Link to="/products" className="btn btn-on-dark btn-lg">{t('explore')}</Link>
            </div>
          </div>
        </div>

        {heroSlides.length > 1 && (
          <div className="hero-dots" role="tablist" aria-label="Hero slides">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === currentSlide}
                aria-label={`Slide ${i + 1}`}
                className={`hero-dot ${i === currentSlide ? 'is-active' : ''}`}
                onClick={() => setCurrentSlide(i)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ══ Featured collections ══ */}
      {(collectionFeatured.length > 0 ? collectionFeatured : categories).length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-header">
              <div className="section-header-text">
                <h2>{t('featured_collections_title')}</h2>
                <p>{t('featured_collections_subtitle')}</p>
              </div>
              <Link to="/products" className="section-link">
                {t('view_all')}
                <ArrowRightIcon size={15} />
              </Link>
            </div>

            <div className="rail-wrap">
              <div className="collections-rail" ref={railRef}>
                {collectionFeatured.length > 0
                  ? collectionFeatured.map(prod => (
                      <ProductCard key={prod._id || prod.id} product={prod} />
                    ))
                  : categories.map(cat => (
                      <CollectionCard key={cat._id || cat.id || cat.slug} category={cat} />
                    ))}
              </div>

              <button
                className="rail-next"
                onClick={() => scrollRail(1)}
                aria-label={t('next')}
              >
                <ChevronRightIcon size={18} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ══ Categories Grid ══ */}
      {categories.length > 0 && (
        <section className="section section-categories" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-header">
              <div className="section-header-text">
                <h2>{t('categories')}</h2>
                <p>{t('browse_collections')}</p>
              </div>
            </div>
            <div className="home-categories-grid">
              {categories.map(cat => (
                <CollectionCard key={cat._id || cat.id || cat.slug} category={cat} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ New arrivals ══ */}
      {featured.length > 0 && (
        <section className="section section-warm">
          <div className="container">
            <div className="section-header">
              <div className="section-header-text">
                <h2>{t('new_arrivals_title')}</h2>
                <p>{t('new_arrivals_subtitle')}</p>
              </div>
              <Link to="/products" className="section-link">
                {t('view_all')}
                <ArrowRightIcon size={15} />
              </Link>
            </div>

            <div className="products-grid">
              {featured.map(product => (
                <ProductCard key={product._id || product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ Service promises ══ */}
      <section className="assurance">
        <div className="container assurance-grid">
          {[
            { Icon: TruckIcon,   title: t('promise_delivery_title'),  copy: t('promise_delivery_desc') },
            { Icon: SparkleIcon, title: t('promise_exclusive_title'), copy: t('promise_exclusive_desc') },
            { Icon: ShieldIcon,  title: t('promise_secure_title'),    copy: t('promise_secure_desc') },
            { Icon: SupportIcon, title: t('promise_support_title'),   copy: t('promise_support_desc') },
          ].map(({ Icon, title, copy }) => (
            <div className="assurance-item" key={title}>
              <span className="assurance-icon"><Icon size={22} /></span>
              <div>
                <h4>{title}</h4>
                <p>{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
