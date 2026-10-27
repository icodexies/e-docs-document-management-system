import { useEffect, useRef, useState } from "react";
import { extractPdfCandidates } from "../../services/documents/pdfDetection.js";
import {
  findSignatoryMatches,
  findSignatoryMatchesBatch,
} from "../../services/documents/signatoryService.js";
import {
  addDocumentSignatories,
  createDocumentDraft,
  finalizeDocument,
  uploadOriginal,
} from "../../services/documents/documentService.js";
import { sha256Hex } from "../../services/documents/hash.js";
import {
  MATCH_THRESHOLD,
  clampBox,
  validateDocumentFile,
  validateDocumentTitle,
  validateSignatoryList,
} from "../../services/documents/documentRules.js";

function makeKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `field-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function titleFromFile(file) {
  const base = String(file?.name ?? "")
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (base || "Untitled document").slice(0, 160);
}

function normalizeMatches(rows) {
  return (rows ?? [])
    .map((row) => ({
      ...row,
      profile_id: Number(row.profile_id),
      score: Number(row.score),
      has_signature: Boolean(row.has_signature),
    }))
    .filter((row) => Number.isFinite(row.profile_id) && Number.isFinite(row.score))
    .sort((a, b) => b.score - a.score);
}

function pickMatch(matches, usedProfiles) {
  const eligible = matches.filter(
    (match) =>
      match.score >= MATCH_THRESHOLD && !usedProfiles.has(String(match.profile_id)),
  );
  const top = eligible[0];
  if (!top) return { auto: null, status: "unmatched" };

  const second = eligible[1];
  if (second && top.score - second.score < 0.03) {
    return { auto: null, status: "review" };
  }
  return { auto: top, status: "matched" };
}

function buildSignatory(candidate, matches, picked) {
  return {
    key: makeKey(),
    detectedName: candidate.text,
    pageNumber: candidate.pageNumber,
    x: candidate.x,
    y: candidate.y,
    width: candidate.width,
    height: candidate.height,
    fontSize: candidate.fontSize ?? 0,
    fontFamily: candidate.fontFamily ?? "",
    contextScore: candidate.contextScore ?? 0,
    matches,
    profileId: picked.auto?.profile_id ?? null,
    fullName: picked.auto?.full_name ?? "",
    department: picked.auto?.department ?? "",
    position: picked.auto?.position ?? "",
    score: picked.auto?.score ?? 0,
    hasSignature: Boolean(picked.auto?.has_signature),
    status: picked.status,
  };
}

export function useDocumentUpload({ userId }) {
  const [file, setFile] = useState(null);
  const [sourceUrl, setSourceUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [signatories, setSignatories] = useState([]);
  const [signingMode, setSigningMode] = useState("sequential");
  const [detecting, setDetecting] = useState(false);
  const [progress, setProgress] = useState({ page: 0, total: 0 });
  const [detectionError, setDetectionError] = useState("");
  const [detectionNote, setDetectionNote] = useState("");
  const [detectionMode, setDetectionMode] = useState("");
  const [matchingKey, setMatchingKey] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const requestIdRef = useRef(0);
  const sourceUrlRef = useRef(null);

  useEffect(
    () => () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    },
    [],
  );

  async function selectFile(nextFile) {
    const checked = validateDocumentFile(nextFile);
    if (!checked.ok) {
      return { ok: false, error: checked.error };
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    const url = URL.createObjectURL(nextFile);
    sourceUrlRef.current = url;

    setFile(nextFile);
    setSourceUrl(url);
    setTitle(titleFromFile(nextFile));
    setPageCount(0);
    setSignatories([]);
    setDetecting(true);
    setProgress({ page: 0, total: 0 });
    setDetectionError("");
    setDetectionNote("");
    setDetectionMode("");
    setSendError("");

    try {
      const result = await extractPdfCandidates(nextFile, {
        onProgress: (nextProgress) => {
          if (requestIdRef.current === requestId) setProgress(nextProgress);
        },
      });

      if (requestIdRef.current !== requestId) return { ok: false, cancelled: true };

      setPageCount(result.pageCount);
      setDetectionMode(result.detectionMode ?? "");

      if (result.candidates.length === 0) {
        setDetecting(false);
        setDetectionNote(
          "No Garamond Bold 14–18 pt names were found. This may be a scan or a PDF that hides its font metadata — add signatories manually and drag their boxes onto the page.",
        );
        return { ok: true, candidates: 0 };
      }

      const rows = await findSignatoryMatchesBatch(
        result.candidates.map((candidate) => candidate.text),
      );
      if (requestIdRef.current !== requestId) return { ok: false, cancelled: true };

      const usedProfiles = new Set();
      const nextSignatories = [];

      for (let index = 0; index < result.candidates.length; index += 1) {
        const candidate = result.candidates[index];
        const matches = normalizeMatches(
          rows.filter((row) => Number(row.candidate_index) === index + 1),
        );

        const rawTop = matches[0];
        if (
          rawTop &&
          rawTop.score >= MATCH_THRESHOLD &&
          usedProfiles.has(String(rawTop.profile_id))
        ) {
          continue;
        }

        const picked = pickMatch(matches, usedProfiles);
        if (picked.auto) usedProfiles.add(String(picked.auto.profile_id));
        nextSignatories.push(buildSignatory(candidate, matches, picked));
      }

      setSignatories(nextSignatories);
      setDetecting(false);

      const unmatchedCount = nextSignatories.filter(
        (signatory) => signatory.status === "unmatched",
      ).length;

      if (nextSignatories.length === 0) {
        setDetectionNote(
          "The names found didn't match an active account at 90% or higher. Add signatories manually or check the account names.",
        );
      } else if (unmatchedCount === nextSignatories.length) {
        setDetectionNote(
          "None of the detected names matched an active account at 90% or higher. Correct a name and press Find account, add a signatory manually, or remove the rows.",
        );
      } else if (
        nextSignatories.some((signatory) => signatory.status !== "matched")
      ) {
        setDetectionNote(
          "Some names need your review. Green rows are ready; amber rows need a person chosen.",
        );
      }

      return { ok: true, candidates: nextSignatories.length };
    } catch (error) {
      if (requestIdRef.current !== requestId) return { ok: false, cancelled: true };
      const message = error.message || "Couldn't scan this PDF. Try another file.";
      setDetectionError(message);
      setDetecting(false);
      return { ok: false, error: message };
    }
  }

  function clearFile() {
    requestIdRef.current += 1;
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    sourceUrlRef.current = null;
    setFile(null);
    setSourceUrl(null);
    setTitle("");
    setPageCount(0);
    setSignatories([]);
    setDetecting(false);
    setProgress({ page: 0, total: 0 });
    setDetectionError("");
    setDetectionNote("");
    setDetectionMode("");
    setSendError("");
  }

  function updateSignatory(key, patch) {
    setSignatories((current) =>
      current.map((item) => {
        if (item.key !== key) return item;

        const nameChanged =
          "detectedName" in patch && patch.detectedName !== item.detectedName;
        const next = { ...item, ...patch };

        // Editing the printed name invalidates the old 90% decision. The
        // uploader must press "Find account" again before sending.
        if (nameChanged) {
          next.profileId = null;
          next.fullName = "";
          next.department = "";
          next.position = "";
          next.score = 0;
          next.hasSignature = false;
          next.status = "review";
        }

        if (["x", "y", "width", "height"].some((field) => field in patch)) {
          return clampBox(next);
        }
        return next;
      }),
    );
  }

  function removeSignatory(key) {
    setSignatories((current) => current.filter((item) => item.key !== key));
  }

  function moveSignatory(key, direction) {
    setSignatories((current) => {
      const index = current.findIndex((item) => item.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function chooseMatch(key, profileId) {
    const current = signatories.find((item) => item.key === key);
    if (!current) return { ok: false, error: "Signatory not found." };

    const match = current.matches.find(
      (item) => String(item.profile_id) === String(profileId),
    );
    if (!match) return { ok: false, error: "Choose one of the detected matches." };
    if (match.score < MATCH_THRESHOLD) {
      return {
        ok: false,
        error: "That match is below 90%. Correct the printed name and find again.",
      };
    }
    if (
      signatories.some(
        (item) =>
          item.key !== key &&
          item.profileId &&
          String(item.profileId) === String(match.profile_id),
      )
    ) {
      return { ok: false, error: "That person is already in the list." };
    }

    setSignatories((items) =>
      items.map((item) =>
        item.key === key
          ? {
              ...item,
              profileId: match.profile_id,
              fullName: match.full_name,
              department: match.department ?? "",
              position: match.position ?? "",
              score: match.score,
              hasSignature: Boolean(match.has_signature),
              status: "matched",
            }
          : item,
      ),
    );
    return { ok: true };
  }

  async function rerunMatch(key) {
    const current = signatories.find((item) => item.key === key);
    if (!current) return { ok: false, error: "Signatory not found." };

    const name = String(current.detectedName ?? "").trim();
    if (name.length < 2) {
      return { ok: false, error: "Enter the name printed on the document first." };
    }

    setMatchingKey(key);
    try {
      const rows = await findSignatoryMatches(name);
      const matches = normalizeMatches(rows);
      const used = new Set(
        signatories
          .filter((item) => item.key !== key && item.profileId)
          .map((item) => String(item.profileId)),
      );

      const rawTop = matches[0];
      if (
        rawTop &&
        rawTop.score >= MATCH_THRESHOLD &&
        used.has(String(rawTop.profile_id))
      ) {
        setSignatories((items) =>
          items.map((item) =>
            item.key === key
              ? {
                  ...item,
                  matches,
                  profileId: null,
                  fullName: "",
                  department: "",
                  position: "",
                  score: 0,
                  hasSignature: false,
                  status: "unmatched",
                }
              : item,
          ),
        );
        return { ok: false, error: "That person is already in the list." };
      }

      const picked = pickMatch(matches, used);
      setSignatories((items) =>
        items.map((item) =>
          item.key === key
            ? {
                ...item,
                matches,
                profileId: picked.auto?.profile_id ?? null,
                fullName: picked.auto?.full_name ?? "",
                department: picked.auto?.department ?? "",
                position: picked.auto?.position ?? "",
                score: picked.auto?.score ?? 0,
                hasSignature: Boolean(picked.auto?.has_signature),
                status: picked.status,
              }
            : item,
        ),
      );

      if (!picked.auto) {
        return {
          ok: false,
          error:
            picked.status === "review"
              ? "More than one account is close. Choose the right person in the list."
              : "No account matched at 90% or higher. Check the spelling or ask an admin to add the account.",
        };
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message || "Couldn't search for this name." };
    } finally {
      setMatchingKey("");
    }
  }

  async function addManualSignatory(name, pageNumber) {
    const clean = String(name ?? "").replace(/\s+/g, " ").trim();
    if (clean.length < 2) {
      return { ok: false, error: "Enter the name printed on the document." };
    }
    if (signatories.length >= 40) {
      return { ok: false, error: "A document can have at most 40 signatories." };
    }

    const safePage = Math.min(
      Math.max(1, Number(pageNumber) || 1),
      Math.max(1, pageCount),
    );

    try {
      const rows = await findSignatoryMatches(clean);
      const matches = normalizeMatches(rows);
      const used = new Set(
        signatories
          .filter((item) => item.profileId)
          .map((item) => String(item.profileId)),
      );

      const top = matches[0];
      if (!top || top.score < MATCH_THRESHOLD) {
        return {
          ok: false,
          error:
            "No active account matched at 90% or higher. Check the name or ask an admin to add the account first.",
        };
      }
      if (used.has(String(top.profile_id))) {
        return { ok: false, error: "That person is already in the list." };
      }

      const picked = pickMatch(matches, used);
      const candidate = {
        text: clean,
        pageNumber: safePage,
        x: 0.55,
        y: 0.78,
        width: 0.35,
        height: 0.08,
        fontSize: 0,
        fontFamily: "",
        contextScore: 0.5,
      };
      const entry = buildSignatory(candidate, matches, picked);
      setSignatories((current) => [...current, entry]);
      return { ok: true, key: entry.key };
    } catch (error) {
      return { ok: false, error: error.message || "Couldn't add this signatory." };
    }
  }

  async function send() {
    if (sending || detecting) {
      return { ok: false, error: "Wait for the scan to finish first." };
    }
    if (!userId) return { ok: false, error: "Please log in again." };

    const checkedTitle = validateDocumentTitle(title);
    if (!checkedTitle.ok) {
      setSendError(checkedTitle.error);
      return { ok: false, error: checkedTitle.error };
    }
    if (!file) {
      setSendError("Choose a PDF first.");
      return { ok: false, error: "Choose a PDF first." };
    }

    const ordered = signatories.map((signatory, index) => ({
      ...signatory,
      signOrder: index + 1,
    }));
    const checked = validateSignatoryList(ordered);
    if (!checked.ok) {
      setSendError(checked.error);
      return { ok: false, error: checked.error };
    }

    setSending(true);
    setSendError("");
    let documentId = null;

    try {
      const draft = await createDocumentDraft({
        title: checkedTitle.value,
        pageCount,
        signingMode,
      });
      documentId = draft.id;

      const buffer = await file.arrayBuffer();
      const hash = await sha256Hex(buffer);

      await uploadOriginal({
        documentId,
        userId,
        file,
        sha256: hash,
        pageCount,
      });
      await addDocumentSignatories(documentId, ordered);
      await finalizeDocument(documentId);

      return { ok: true, documentId };
    } catch (error) {
      const message = error.message || "Couldn't send the document. Try again.";
      setSendError(message);
      return { ok: false, error: message, documentId };
    } finally {
      setSending(false);
    }
  }

  const ready =
    signatories.length > 0 &&
    signatories.every(
      (signatory) =>
        signatory.profileId && Number(signatory.score) >= MATCH_THRESHOLD,
    );
  const unresolvedCount = signatories.filter(
    (signatory) =>
      !signatory.profileId || Number(signatory.score) < MATCH_THRESHOLD,
  ).length;

  return {
    file,
    sourceUrl,
    title,
    setTitle,
    pageCount,
    signatories,
    signingMode,
    setSigningMode,
    detecting,
    progress,
    detectionError,
    detectionNote,
    detectionMode,
    matchingKey,
    sending,
    sendError,
    ready,
    unresolvedCount,
    selectFile,
    clearFile,
    updateSignatory,
    removeSignatory,
    moveSignatory,
    chooseMatch,
    rerunMatch,
    addManualSignatory,
    send,
  };
}
