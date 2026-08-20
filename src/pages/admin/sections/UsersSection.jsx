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

/* Mirrors the User schema's role enum. `cashier` is counter staff: it can
   create an invoice and nothing else, and it is granted and revoked from this
   screen because the person on the till changes. */
const ROLES = ['user', 'cashier', 'admin', 'driver', 'owner', 'superuser'];

/** Plain-language note under each role in the picker. */
const ROLE_HINTS = {
  user: 'Shopper. No dashboard access.',
  cashier: 'Can create invoices only — no order history, customers or revenue.',
  driver: 'Delivery app only.',
  admin: 'Runs the shop. No revenue access.',
  owner: 'Full access, including revenue.',
  superuser: 'System administration. Deliberately excluded from revenue.',
};

/* Roles that can still open this screen. Changing your own account to anything
   outside this set locks you out of the dashboard you are standing in, so the
   select refuses to offer them for your own row. */
const KEEPS_DASHBOARD_ACCESS = ['admin', 'owner', 'superuser'];

/**
 * Which roles this viewer is allowed to hand out, mirroring the rules the API
 * enforces (`updateUserRole`):
 *
 *   - only a superuser can create another superuser;
 *   - owner and superuser can appoint the owner;
 *   - an admin can only manage admin/driver/user.
 *
 * `current` is always included even when it is not assignable, so a row never
 * renders a select with no matching option — a superuser's row used to show
 * blank, which read as "this account has no role".
 */
function assignableRoles(viewerRole, current, isSelf) {
  let roles = ROLES.filter(role => {
    if (role === 'superuser') return viewerRole === 'superuser';
    if (role === 'owner') return viewerRole === 'owner' || viewerRole === 'superuser';
    return true;
  });

  // Keep in step with ADMIN_ASSIGNABLE in the backend's updateUserRole.
  if (viewerRole === 'admin') roles = roles.filter(r => ['admin', 'cashier', 'driver', 'user'].includes(r));
  if (isSelf) roles = roles.filter(r => KEEPS_DASHBOARD_ACCESS.includes(r));

  return roles.includes(current) ? roles : [current, ...roles];
}

export default function UsersSection() {
  const { t } = useI18n();
  const { user: currentUser, refreshUser } = useAuth();
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
    /* Changing your own role changes what you can do the moment it lands —
       stepping down from owner, for instance, closes Revenue behind you. Worth
       a confirmation, but not worth forbidding: handing the shop over to its
       real owner means the outgoing one has to be able to step down. */
    if (userId === currentUser?._id &&
        !window.confirm(`Change your own role to "${role}"? This takes effect immediately and may remove sections from your dashboard.`)) {
      return;
    }

    const previous = users;
    setUsers(prev => prev.map(u => (u._id === userId ? { ...u, role } : u)));
    try {
      await AdminAPI.updateUserRole(userId, role);
      showToast(`${t('role')}: ${role}`, 'success');
      // The sidebar and every role guard read the cached user, which still
      // holds the role this session logged in with. Re-read it so the change
      // shows up now instead of after a log out and back in.
      if (userId === currentUser?._id) await refreshUser();
    } catch (err) {
      setUsers(previous);
      showToast(err.message || t('admin_update_failed'), 'error');
    }
  }, [users, t, currentUser, refreshUser]);

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

  /* `owner` is the one role that opens Revenue, so a second owner is not a
     spare key — it is a second person seeing the takings, and it happens
     quietly, by a role left set on an old account. Say it out loud here, where
     it can be fixed, rather than leaving it to be noticed in Revenue. */
  const owners = useMemo(() => users.filter(u => u.role === 'owner'), [users]);

  return (
    <div className="admin-view">
      <h2 className="admin-view-title">{t('users')} <span className="admin-count">{users.length}</span></h2>

      {owners.length > 1 && (
        <p className="admin-hint" role="status" style={{ color: '#92400E' }}>
          ⚠️ {owners.length} accounts hold the <strong>owner</strong> role — {owners.map(o => o.email).join(', ')}.
          {' '}Every one of them can open Revenue and set its password. Leave it with the shop owner and move the
          others to <strong>admin</strong>.
        </p>
      )}

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
            render: u => {
              const isSelf = u._id === currentUser?._id;
              /* Your own row used to be disabled outright, to stop you removing
                 your own admin rights. That also made the role you hold
                 unchangeable — so an account that had been left as `owner`
                 could not hand ownership over from this screen at all. The
                 protection now comes from the options offered instead: your own
                 row can move between the roles that keep you in the dashboard,
                 and cannot drop to `user` or `driver`. */
              const options = assignableRoles(currentUser?.role, u.role, isSelf);
              return (
                <>
                  <select
                    className="status-select"
                    value={u.role}
                    onChange={e => updateRole(u._id, e.target.value)}
                    aria-label={`${t('role')} — ${u.email}`}
                    title={isSelf ? 'Your own account — you cannot drop below admin here' : undefined}
                  >
                    {options.map(r => (
                      <option key={r} value={r} title={ROLE_HINTS[r]}>{r}</option>
                    ))}
                  </select>
                  {/* What the role actually permits, in words. "cashier" means
                      nothing on its own to whoever is assigning it. */}
                  {ROLE_HINTS[u.role] && (
                    <small className="admin-muted" style={{ display: 'block', marginTop: 2, fontSize: 11 }}>
                      {ROLE_HINTS[u.role]}
                    </small>
                  )}
                </>
              );
            },
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
