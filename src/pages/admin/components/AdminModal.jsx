import AppSheet from '../../../components/ui/AppSheet';

/**
 * Admin modal.
 *
 * Kept as a name so the existing sections do not all have to change, but it is
 * now a thin adapter over `AppSheet`: what used to render as a small centred
 * popup with its own scrollbar is presented as a full-screen view on phones
 * and tablets, and as a proper panel on desktop.
 *
 * `wide` maps to the default sheet width — the old 580px/820px distinction
 * stopped meaning anything once the layout became responsive.
 */
export default function AdminModal({ open, onClose, title, subtitle, wide, children, footer }) {
  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size={wide ? 'default' : 'compact'}
      footer={footer}
    >
      {children}
    </AppSheet>
  );
}
