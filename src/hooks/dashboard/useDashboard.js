import { useCallback, useEffect, useState } from "react";
import { getDashboardSummary } from "../../services/documents/documentService.js";

export function useDashboard({ userId, profileId }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({
    key: "",
    loading: true,
    error: "",
    data: null,
  });
  const key = `${userId}:${profileId}:${revision}`;

  useEffect(() => {
    if (!userId || !profileId) return undefined;
    const controller = new AbortController();
    let active = true;

    getDashboardSummary({ userId, profileId }, controller.signal)
      .then((data) => {
        if (active) setResult({ key, loading: false, error: "", data });
      })
      .catch((error) => {
        if (!active || error.name === "AbortError") return;
        setResult({
          key,
          loading: false,
          error: error.message || "Couldn't load your dashboard.",
          data: null,
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [userId, profileId, key]);

  const loading = result.key !== key;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  return {
    loading,
    error: loading ? "" : result.error,
    data: loading ? null : result.data,
    refresh,
  };
}
