/** Image fallback chain — mirrors original handleImageError logic */
const PLACEHOLDER = '/assets/images/products/placeholder.png';

export function getProductImage(product) {
  if (!product) return PLACEHOLDER;
  if (product.images?.length) {
    const primary = product.images.find(img => img.isPrimary) || product.images[0];
    return primary.url || PLACEHOLDER;
  }
  return product.image || PLACEHOLDER;
}

export function handleImageError(e) {
  const img = e.currentTarget;
  if (img.dataset.fallbackAttempted) {
    img.src = PLACEHOLDER;
    return;
  }
  const src = img.src || '';
  if (src.includes('.jpeg') || src.includes('.jpg')) {
    img.dataset.fallbackAttempted = 'true';
    img.src = src.replace(/\.jpe?g$/i, '.png');
  } else {
    img.dataset.fallbackAttempted = 'true';
    img.src = PLACEHOLDER;
  }
}

/** Resolve backend-relative image URLs to absolute */
export function resolveImageUrl(url, fallback) {
  if (!url) return fallback || PLACEHOLDER;
  if (typeof url !== 'string') return fallback || PLACEHOLDER;
  if (url.startsWith('http')) return url;
  const base = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
    ? 'http://localhost:5000'
    : 'https://arteva-maison-backend-gy1x.onrender.com';
  return base + url;
}
