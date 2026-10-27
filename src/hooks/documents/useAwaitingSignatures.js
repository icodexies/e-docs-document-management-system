import { useCallback, useEffect, useState } from "react";
import { listAwaitingSignatures } from "../../services/documents/documentService.js";

export function useAwaitingSignatures({ profileId }) {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({
    key: "",
    error: "",
    items: [],
    hasNext: false,
    total: 0,
    pageCount: 0,
  });
  const key = `${profileId}:${page}:${revision}`;

  useEffect(() => {
    if (!profileId) return undefined;
    const controller = new AbortController();
    let active = true;

    listAwaitingSignatures({ profileId, page }, controller.signal)
      .then((data) => {
        if (active) setResult({ key, error: "", ...data });
      })
      .catch((error) => {
        if (!active || error.name === "AbortError") return;
        setResult({
          key,
          error: error.message || "Couldn't load your signature requests.",
          items: [],
          hasNext: false,
          total: 0,
          pageCount: 0,
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [profileId, page, key]);

  const loading = Boolean(profileId) && result.key !== key;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  return {
    loading,
    error: loading ? "" : result.error,
    items: loading ? [] : result.items,
    hasNext: !loading && result.hasNext,
    total: loading ? 0 : result.total,
    pageCount: loading ? 0 : result.pageCount,
    page,
    setPage,
    refresh,
  };
}
