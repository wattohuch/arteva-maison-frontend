/** Formatting utilities */

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateAr(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-KW', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function truncate(str, len = 80) {
  if (!str || str.length <= len) return str;
  return str.slice(0, len) + '…';
}

export function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Order status color mapping */
export function getStatusColor(status) {
  const map = {
    pending: '#C9A962',
    confirmed: '#4A90D9',
    processing: '#7B68EE',
    packed: '#20B2AA',
    handed_over: '#FF8C00',
    out_for_delivery: '#FF6347',
    on_the_way: '#FF6347',
    delivered: '#2E8B57',
    cancelled: '#CD5C5C',
    awaiting_payment: '#C9A962',
    payment_expired: '#999',
  };
  return map[status] || '#8B7D6B';
}
