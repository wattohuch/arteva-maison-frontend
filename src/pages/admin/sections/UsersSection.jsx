import { useState, useEffect, useMemo, useCallback } from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { useAuth } from '../../../contexts/AuthContext';
import { AdminAPI } from '../../../api/admin';
import { formatDate } from '../../../utils/formatters';
import { showToast } from '../../../components/ui/Toast';
import { Input } from '../../../components/ui/Field';
import { SearchIcon, TrashIcon } from '../../../components/ui/Icons';
import AdminTable from '../components/AdminTable';
import AdminToolbar from '../components/AdminToolbar';

const ROLES = ['user', 'admin', 'driver', 'owner'];

export default function UsersSection() {
  const { t } = useI18n();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    AdminAPI.getUsers()
      .then(res => { if (!cancelled) setUsers(res.data || []); })
      .catch(err => { if (!cancelled) showToast(err.message || t('admin_load_failed'), 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [t]);

  const updateRole = useCallback(async (userId, role) => {
    const previous = users;
    setUsers(prev => prev.map(u => (u._id === userId ? { ...u, role } : u)));
    try {
      await AdminAPI.updateUserRole(userId, role);
      showToast(`${t('role')}: ${role}`, 'success');
    } catch (err) {
      setUsers(previous);
      showToast(err.message || t('admin_update_failed'), 'error');
    }
  }, [users, t]);

  const deleteUser = useCallback(async (target) => {
    if (!window.confirm(`${t('admin_confirm_delete')} — ${target.email}`)) return;
    const previous = users;
    setUsers(prev => prev.filter(u => u._id !== target._id));
    try {
      await AdminAPI.deleteUser(target._id);
      showToast(t('admin_deleted'), 'success');
    } catch (err) {
      setUsers(previous);
      showToast(err.message || t('admin_delete_failed'), 'error');
    }
  }, [users, t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <div className="admin-view">
      <h2 className="admin-view-title">{t('users')} <span className="admin-count">{users.length}</span></h2>

      <AdminToolbar>
        <Input
          type="search"
          placeholder={t('admin_search_users')}
          aria-label={t('admin_search_users')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<SearchIcon size={17} />}
          wrapperClassName="admin-search field-sm"
        />
      </AdminToolbar>

      <AdminTable
        caption={t('users')}
        loading={loading}
        rows={filtered}
        empty={t('admin_no_users')}
        columns={[
          { key: 'name', header: t('name') },
          { key: 'email', header: t('email') },
          { key: 'phone', header: t('phone'), render: u => u.phone || '—' },
          {
            key: 'role', header: t('role'),
            render: u => (
              <select
                className="status-select"
                value={u.role}
                onChange={e => updateRole(u._id, e.target.value)}
                aria-label={`${t('role')} — ${u.email}`}
                // Removing your own admin rights locks you out of this screen.
                disabled={u._id === currentUser?._id}
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            ),
          },
          { key: 'joined', header: t('joined'), render: u => formatDate(u.createdAt) },
          {
            key: 'actions', header: t('admin_actions'), align: 'end',
            render: u => (
              <button
                type="button"
                className="admin-icon-btn admin-icon-danger"
                onClick={() => deleteUser(u)}
                disabled={u._id === currentUser?._id}
                aria-label={`${t('admin_delete')} — ${u.email}`}
              >
                <TrashIcon size={16} />
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}
