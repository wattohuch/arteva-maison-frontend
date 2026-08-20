/** Dashboard metric tile. */
export default function StatCard({ Icon, label, value, tone = 'gold', hint }) {
  return (
    <div className={`admin-stat-card tone-${tone}`}>
      <span className="admin-stat-icon"><Icon size={20} /></span>
      <div className="admin-stat-body">
        <span className="admin-stat-value">{value}</span>
        <span className="admin-stat-label">{label}</span>
        {/* Secondary figure — "12 today" under an all-time total. Rendered only
            when supplied, so the tiles that have none keep their height. */}
        {hint && <span className="admin-stat-hint">{hint}</span>}
      </div>
    </div>
  );
}
