import { useCallback, useEffect, useState } from "react";
import { getMyDocuments } from "../../services/documents/documentService.js";
import { useDebouncedValue } from "../shared/useDebouncedValue.js";

export function useDocuments({ userId, status = "all", search = "" }) {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const debouncedSearch = useDebouncedValue(search, 350);
  const [result, setResult] = useState({
    key: "",
    error: "",
    items: [],
    hasNext: false,
    total: 0,
    pageCount: 0,
  });
  const key = `${userId}:${status}:${debouncedSearch}:${page}:${revision}`;

  useEffect(() => {
    if (!userId) return undefined;
    const controller = new AbortController();
    let active = true;

    getMyDocuments(
      { userId, page, status, search: debouncedSearch },
      controller.signal,
    )
      .then((data) => {
        if (active) setResult({ key, error: "", ...data });
      })
      .catch((error) => {
        if (!active || error.name === "AbortError") return;
        setResult({
          key,
          error: error.message || "Couldn't load your documents.",
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
  }, [userId, page, status, debouncedSearch, key]);

  const loading = Boolean(userId) && result.key !== key;
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
