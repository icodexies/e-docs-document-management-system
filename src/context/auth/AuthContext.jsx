import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContextStore.js";
import { getSupabase, getMyProfile, login, logout } from "../../services/auth/authService.js";

const emptyProfile = { userId: null, data: null, error: null };

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ user: null, loading: true, error: null });
  const [profileState, setProfileState] = useState(emptyProfile);
  const [profileRevision, setProfileRevision] = useState(0);

  useEffect(() => {
    let active = true;
    let subscription;

    (async () => {
      try {
        const supabase = await getSupabase();
        if (!active) return;
        const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (!active) return;
          setSession({ user: nextSession?.user ?? null, loading: false, error: null });
        });
        subscription = data.subscription;
        const { data: current, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error) throw error;
        setSession({ user: current.session?.user ?? null, loading: false, error: null });
      } catch (error) {
        if (active) setSession({ user: null, loading: false, error: error.message });
      }
    })();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const userId = session.user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    let active = true;
    getMyProfile(userId, controller.signal)
      .then((data) => {
        if (active) setProfileState({ userId, data, error: null });
      })
      .catch((error) => {
        if (!active || error.name === "AbortError") return;
        setProfileState({
          userId,
          data: null,
          error: error.message || "Couldn't load your profile.",
        });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [userId, profileRevision]);

  // Derived, so a stale profile from a previous user is never exposed.
  const profile = userId && profileState.userId === userId ? profileState.data : null;
  const profileLoading = Boolean(userId) && profileState.userId !== userId;
  const profileError = userId && profileState.userId === userId ? profileState.error : null;

  // Call after changing the profile or uploading a signature. The current
  // profile stays on screen until the refreshed row arrives.
  const refreshProfile = useCallback(
    () => setProfileRevision((value) => value + 1),
    [],
  );

  const value = useMemo(
    () => ({
      user: session.user,
      profile,
      role: profile?.role ?? null,
      loading: session.loading || profileLoading,
      error: session.error || profileError,
      login,
      logout,
      refreshProfile,
    }),
    [session, profile, profileLoading, profileError, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
