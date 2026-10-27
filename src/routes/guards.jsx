import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/auth/useAuth.js";
import { hasStoredAuthSession } from "../context/auth/authSessionHint.js";
import { LoadingScreen } from "../components/ui/Loading.jsx";

function ProfileUnavailable({ message, logout }) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // The session may already be gone; reloading settles the state.
      window.location.reload();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-6 text-ink">
      <div className="max-w-sm text-center">
        <p role="alert" className="text-sm font-semibold">
          {message}
        </p>
        <div className="mt-4 flex justify-center gap-4 text-sm underline">
          <button type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
          <button type="button" disabled={loggingOut} onClick={handleLogout}>
            {loggingOut ? "Logging out…" : "Logout"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Logged-out only. Signed-in users are sent to the dashboard. */
export function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading && (location.pathname !== "/" || hasStoredAuthSession())) {
    return <LoadingScreen label="Loading…" />;
  }
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

/** UI access checks. Database policies must enforce these permissions too. */
export function PrivateRoute({ allowedRoles = null }) {
  const { user, profile, role, loading, error, logout } = useAuth();
  if (loading) return <LoadingScreen label="Loading…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) {
    return (
      <ProfileUnavailable
        message={
          error ||
          "No profile is linked to this account. Ask an administrator to create one."
        }
        logout={logout}
      />
    );
  }
  if (profile.is_active === false) {
    return (
      <ProfileUnavailable
        message="Your account has been deactivated. Contact an administrator."
        logout={logout}
      />
    );
  }
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
}
