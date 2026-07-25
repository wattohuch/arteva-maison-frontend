import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Loader from '../ui/Loader';

/**
 * Route guard for role-restricted areas.
 *
 * Renders nothing but a loader until the stored token has been verified, so
 * privileged UI is never painted on the strength of a `role` field read out of
 * localStorage. This is a UX guard only — the server independently enforces
 * access on every /api/admin and /api/driver route via `protect` + `admin`.
 */
export default function RequireRole({ roles, children, redirectTo = '/account' }) {
  const { isLoggedIn, user, authChecked } = useAuth();
  const location = useLocation();

  if (!authChecked) {
    return (
      <div className="page-loading">
        <Loader />
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
