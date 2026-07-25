import { useState, useEffect, useCallback } from 'react';
import { AdminAPI } from '../../../api/admin';
import Loader from '../../../components/ui/Loader';
import AdminTable from '../components/AdminTable';
import AdminToolbar from '../components/AdminToolbar';
import StatusPill from '../components/StatusPill';

export default function DriversSection() {
  const [drivers, setDrivers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    AdminAPI.getUsers()
      .then(res => {
        const all = res.data || [];
        const d = all.filter(u => u.role === 'driver');
        setDrivers(d);
        setFiltered(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search) { setFiltered(drivers); return; }
    const q = search.toLowerCase();
    setFiltered(drivers.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q) ||
      (d.phone && d.phone.includes(q))
    ));
  }, [search, drivers]);

  return (
    <div className="admin-view">
      <div className="admin-section-header">
        <h2 className="admin-view-title">Drivers <span className="admin-count">{drivers.length}</span></h2>
      </div>

      <AdminToolbar>
        <input
          type="text"
          className="field-input admin-search"
          placeholder="Search drivers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </AdminToolbar>

      <AdminTable
        loading={loading}
        empty={
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>🚗</div>
            <p>No drivers found</p>
            <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>
              Assign the "driver" role to a user from the Users tab
            </p>
          </div>
        }
        rows={filtered}
        columns={[
          { key: 'name', header: 'Name', render: d => <strong>{d.name}</strong> },
          { key: 'email', header: 'Email' },
          { key: 'phone', header: 'Phone', render: d => d.phone || '—' },
          {
            key: 'status', header: 'Status',
            render: () => <StatusPill status="confirmed" />,
          },
          { key: 'orders', header: 'Active Orders', render: () => '—' },
          {
            key: 'joined', header: 'Joined',
            render: d => new Date(d.createdAt).toLocaleDateString(),
          },
        ]}
      />
    </div>
  );
}
