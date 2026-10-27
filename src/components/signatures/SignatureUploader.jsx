import { useEffect, useRef, useState } from "react";
import SignaturePad from "./SignaturePad.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import { Spinner } from "../ui/Loading.jsx";
import { validateSignatureFile } from "../../services/documents/documentRules.js";
import { prepareSignatureImage } from "../../services/profile/signatureImage.js";
import {
  getSignatureUrl,
  removeSignatureObject,
  uploadSignature,
} from "../../services/profile/profileService.js";

const TAB_BASE =
  "rounded-full px-3 py-1 text-xs font-semibold transition-colors";
const TAB_ACTIVE = "bg-navy text-white";
const TAB_INACTIVE = "bg-tint text-accent hover:bg-tint/80";
const SECONDARY_BUTTON =
  "rounded-xl border border-slate-300 bg-surface px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-page";

export default function SignatureUploader({ userId, currentPath, onSaved }) {
  const [mode, setMode] = useState("draw");
  const [uploadBlob, setUploadBlob] = useState(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState({ path: "", url: null, error: "" });
  const padRef = useRef(null);

  useEffect(() => {
    if (!currentPath) return undefined;
    let active = true;
    getSignatureUrl(currentPath)
      .then((url) => {
        if (active) setCurrent({ path: currentPath, url, error: "" });
      })
      .catch(() => {
        if (active) {
          setCurrent({
            path: currentPath,
            url: null,
            error: "Couldn't load your current signature.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [currentPath]);

  useEffect(
    () => () => {
      if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    },
    [uploadPreviewUrl],
  );

  const currentUrl =
    currentPath && current.path === currentPath ? current.url : null;
  const currentError =
    currentPath && current.path === currentPath ? current.error : "";
  const currentLoading = Boolean(currentPath) && current.path !== currentPath;

  async function chooseUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const checked = validateSignatureFile(file);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }

    setError("");
    setSuccess("");
    try {
      const { blob } = await prepareSignatureImage(file);
      if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
      setUploadBlob(blob);
      setUploadPreviewUrl(URL.createObjectURL(blob));
    } catch (nextError) {
      setError(nextError.message || "Couldn't prepare that signature image.");
    }
  }

  async function save() {
    if (saving) return;
    setError("");
    setSuccess("");

    let blob;
    if (mode === "draw") {
      if (!padRef.current || padRef.current.isEmpty()) {
        setError("Draw your signature first.");
        return;
      }
      try {
        blob = await padRef.current.toBlob();
        // The drawing canvas is as wide as the card, so trim its transparent
        // margins before storing it. Otherwise the ink is tiny when stamped.
        if (blob) blob = (await prepareSignatureImage(blob)).blob;
      } catch (nextError) {
        setError(
          nextError.message || "Couldn't prepare the signature image.",
        );
        return;
      }
    } else {
      blob = uploadBlob;
    }

    if (!blob) {
      setError(
        mode === "upload"
          ? "Choose a signature image first."
          : "Draw your signature first.",
      );
      return;
    }

    setSaving(true);
    try {
      const { path } = await uploadSignature({ userId, blob });
      if (currentPath && currentPath !== path) {
        await removeSignatureObject(currentPath);
      }
      setSuccess("Signature saved. You can now approve documents.");
      setUploadBlob(null);
      if (uploadPreviewUrl) {
        URL.revokeObjectURL(uploadPreviewUrl);
        setUploadPreviewUrl(null);
      }
      padRef.current?.clear();
      onSaved?.(path);
    } catch (nextError) {
      setError(nextError.message || "Couldn't save the signature.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-page px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">Signature on file</h3>
          {currentPath && <StatusBadge status="signed" label="On file" />}
        </div>

        {currentPath ? (
          currentLoading ? (
            <div
              aria-hidden="true"
              className="mt-3 h-20 w-48 animate-pulse rounded-lg bg-tint motion-reduce:animate-none"
            />
          ) : currentError ? (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {currentError}
            </p>
          ) : currentUrl ? (
            <div className="mt-3 inline-flex max-w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2">
              <img
                src={currentUrl}
                alt="Current signature on file"
                className="max-h-24 w-auto max-w-full object-contain"
              />
            </div>
          ) : null
        ) : (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No signature on file yet. You can't approve documents until you save
            one.
          </p>
        )}

        <p className="mt-2 text-xs text-slate-500">
          Private to you. It is only applied when you approve a document.
        </p>
      </div>

      <div role="group" aria-label="Signature method" className="flex gap-2">
        <button
          type="button"
          aria-pressed={mode === "draw"}
          onClick={() => {
            setMode("draw");
            setError("");
          }}
          className={`${TAB_BASE} ${mode === "draw" ? TAB_ACTIVE : TAB_INACTIVE}`}
        >
          Draw
        </button>
        <button
          type="button"
          aria-pressed={mode === "upload"}
          onClick={() => {
            setMode("upload");
            setError("");
          }}
          className={`${TAB_BASE} ${mode === "upload" ? TAB_ACTIVE : TAB_INACTIVE}`}
        >
          Upload image
        </button>
      </div>

      {mode === "draw" ? (
        <div className="space-y-3">
          <SignaturePad ref={padRef} />
          <button
            type="button"
            onClick={() => padRef.current?.clear()}
            className={SECONDARY_BUTTON}
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            {uploadPreviewUrl ? (
              <img
                src={uploadPreviewUrl}
                alt="Signature preview"
                className="mx-auto max-h-28 w-auto max-w-full object-contain"
              />
            ) : (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-navy">
                No image chosen yet.
              </p>
            )}
          </div>
          <label className={`inline-flex cursor-pointer items-center gap-2 ${SECONDARY_BUTTON}`}>
            Choose an image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={chooseUpload}
              className="sr-only"
            />
          </label>
          <p className="text-xs text-slate-500">
            PNG, JPEG or WebP, up to 2 MB. We remove the white background and
            trim the edges.
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl bg-jade-soft px-3.5 py-2.5 text-sm font-medium text-jade-deep"
        >
          {success}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {saving && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
        {saving ? "Saving…" : "Save signature"}
      </button>
    </div>
  );
}
