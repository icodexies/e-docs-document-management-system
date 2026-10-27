import { useCallback, useEffect, useState } from "react";
import {
  getDocument,
  getDocumentFileUrl,
} from "../../services/documents/documentService.js";

export function useDocument(documentId) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({
    key: "",
    loading: true,
    error: "",
    document: null,
    fileUrl: null,
  });
  const key = `${documentId}:${revision}`;

  useEffect(() => {
    if (!documentId) return undefined;
    const controller = new AbortController();
    let active = true;

    (async () => {
      try {
        const document = await getDocument(documentId, controller.signal);
        if (!active) return;
        const file = await getDocumentFileUrl(document);
        if (!active) return;
        setResult({
          key,
          loading: false,
          error: "",
          document,
          fileUrl: file?.url ?? null,
        });
      } catch (error) {
        if (!active || error.name === "AbortError") return;
        setResult({
          key,
          loading: false,
          error: error.message || "Couldn't load the document.",
          document: null,
          fileUrl: null,
        });
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [documentId, key]);

  const loading = result.key !== key;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  return {
    loading,
    error: loading ? "" : result.error,
    document: loading ? null : result.document,
    fileUrl: loading ? null : result.fileUrl,
    refresh,
  };
}
