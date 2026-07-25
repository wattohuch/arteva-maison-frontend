import { getStatusColor } from '../../../utils/formatters';

/** Read-only status chip tinted from the shared status palette. */
export default function StatusPill({ status }) {
  const color = getStatusColor(status);
  return (
    <span className="admin-status-pill" style={{ '--pill': color }}>
      {String(status || '').replace(/_/g, ' ')}
    </span>
  );
}
