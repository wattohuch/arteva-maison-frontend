/** Dashboard metric tile. */
export default function StatCard({ Icon, label, value, tone = 'gold' }) {
  return (
    <div className={`admin-stat-card tone-${tone}`}>
      <span className="admin-stat-icon"><Icon size={20} /></span>
      <div className="admin-stat-body">
        <span className="admin-stat-value">{value}</span>
        <span className="admin-stat-label">{label}</span>
      </div>
    </div>
  );
}
