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

/**
 * Rewrite a Cloudinary URL to deliver a right-sized, modern-format image.
 *
 * Product photos are uploaded at full resolution. Sending a 2000px JPEG to a
 * 180px-wide card on a phone is the single most expensive thing this site
 * does, and it happens once per card. Cloudinary applies transformations from
 * the URL path, so the fix is free — no re-upload, no build step:
 *
 *   f_auto  → WebP/AVIF where the browser supports it
 *   q_auto  → per-image quality, typically 30–60% smaller than the original
 *   w_<n>   → scaled to the width actually needed
 *   c_limit → never upscales past the original
 *
 * Non-Cloudinary URLs (local placeholders, legacy paths) pass through
 * untouched.
 */
export function cloudinaryImage(url, width) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  // Already transformed — don't stack a second set of parameters on top.
  if (/\/upload\/[^/]*(?:f_auto|q_auto|w_\d)/.test(url)) return url;

  const transform = ['f_auto', 'q_auto', 'c_limit', width ? `w_${width}` : null]
    .filter(Boolean)
    .join(',');

  return url.replace('/upload/', `/upload/${transform}/`);
}

/**
 * Build a `srcSet` so the browser picks a width for the device it is on,
 * rather than every phone downloading the desktop image.
 */
export function cloudinarySrcSet(url, widths = [240, 400, 600, 900]) {
  if (!url || !url.includes('res.cloudinary.com')) return undefined;
  return widths.map(w => `${cloudinaryImage(url, w)} ${w}w`).join(', ');
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
