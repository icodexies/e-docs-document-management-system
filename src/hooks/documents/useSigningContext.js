import { useCallback, useEffect, useState } from "react";
import {
  getDocumentFileUrl,
  getSigningContext,
} from "../../services/documents/documentService.js";
import { getSignatureUrl } from "../../services/profile/profileService.js";

export function useSigningContext(signatoryId, profileId) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({
    key: "",
    loading: true,
    error: "",
    context: null,
    fileUrl: null,
    signatureUrl: null,
  });
  const key = `${signatoryId}:${profileId}:${revision}`;

  useEffect(() => {
    if (!signatoryId || !profileId) return undefined;
    const controller = new AbortController();
    let active = true;

    (async () => {
      try {
        const context = await getSigningContext(
          signatoryId,
          profileId,
          controller.signal,
        );
        if (!active) return;

        const file = await getDocumentFileUrl(context.document);
        if (!active) return;

        let signatureUrl = null;
        if (context.signaturePath) {
          try {
            signatureUrl = await getSignatureUrl(context.signaturePath);
          } catch {
            // The DB flag is authoritative; the preview is optional.
            signatureUrl = null;
          }
        }
        if (!active) return;

        setResult({
          key,
          loading: false,
          error: "",
          context,
          fileUrl: file?.url ?? null,
          signatureUrl,
        });
      } catch (error) {
        if (!active || error.name === "AbortError") return;
        setResult({
          key,
          loading: false,
          error: error.message || "Couldn't load this signature request.",
          context: null,
          fileUrl: null,
          signatureUrl: null,
        });
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [signatoryId, profileId, key]);

  const loading = result.key !== key;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  return {
    loading,
    error: loading ? "" : result.error,
    context: loading ? null : result.context,
    fileUrl: loading ? null : result.fileUrl,
    signatureUrl: loading ? null : result.signatureUrl,
    refresh,
  };
}
