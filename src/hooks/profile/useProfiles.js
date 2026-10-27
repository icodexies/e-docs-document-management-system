import { useCallback, useEffect, useState } from "react";
import { adminListProfiles } from "../../services/profile/profileService.js";
import { useDebouncedValue } from "../shared/useDebouncedValue.js";

export function useProfiles({ search = "" } = {}) {
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
  const key = `${debouncedSearch}:${page}:${revision}`;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    adminListProfiles({ page, search: debouncedSearch }, controller.signal)
      .then((data) => {
        if (active) setResult({ key, error: "", ...data });
      })
      .catch((error) => {
        if (!active || error.name === "AbortError") return;
        setResult({
          key,
          error: error.message || "Couldn't load the user list.",
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
  }, [page, debouncedSearch, key]);

  const loading = result.key !== key;
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
