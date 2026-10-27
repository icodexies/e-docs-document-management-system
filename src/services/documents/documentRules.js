export const DOCUMENT_TITLE_MAX = 160;
export const DOCUMENT_FILE_MAX = 25 * 1024 * 1024;
export const SIGNATURE_FILE_MAX = 2 * 1024 * 1024;
export const MAX_DOCUMENT_PAGES = 200;
export const MAX_SIGNATORIES = 40;
export const MATCH_THRESHOLD = 0.9;

export const SIGNING_MODES = ["sequential", "parallel"];

export const DOCUMENT_STATUSES = [
  "draft",
  "pending",
  "in_progress",
  "completed",
  "declined",
  "void",
];

export const SIGNATORY_STATUSES = [
  "pending",
  "viewed",
  "signing",
  "signed",
  "declined",
];

export const DOCUMENT_STATUS_LABELS = {
  draft: "Draft",
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  declined: "Declined",
  void: "Void",
};

export const SIGNATORY_STATUS_LABELS = {
  pending: "Pending",
  viewed: "Viewed",
  signing: "Signing",
  signed: "Signed",
  declined: "Declined",
};

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const DATE_TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function validateDocumentTitle(value) {
  const title = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!title) return { ok: false, error: "Enter a document title." };
  if (title.length > DOCUMENT_TITLE_MAX) {
    return {
      ok: false,
      error: `Keep the title under ${DOCUMENT_TITLE_MAX} characters.`,
    };
  }
  return { ok: true, value: title };
}

export function validateDocumentFile(file) {
  if (!file) return { ok: false, error: "Choose a PDF file." };
  const name = String(file.name ?? "");
  const type = String(file.type ?? "");
  const isPdf = type === "application/pdf" || /\.pdf$/i.test(name);
  if (!isPdf) return { ok: false, error: "Only PDF files can be uploaded." };
  const size = Number(file.size ?? 0);
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, error: "That file is empty or unreadable." };
  }
  if (size > DOCUMENT_FILE_MAX) {
    return { ok: false, error: "Keep the PDF under 25 MB." };
  }
  return { ok: true, value: file };
}

export function validateSignatureFile(file) {
  if (!file) return { ok: false, error: "Choose a signature image." };
  const type = String(file.type ?? "").toLowerCase();
  const name = String(file.name ?? "");
  const allowed = ["image/png", "image/jpeg", "image/webp"];
  const isImage =
    allowed.includes(type) || /\.(png|jpe?g|webp)$/i.test(name);
  if (!isImage) {
    return { ok: false, error: "Use a PNG, JPEG or WebP image." };
  }
  const size = Number(file.size ?? 0);
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, error: "That image is empty or unreadable." };
  }
  if (size > SIGNATURE_FILE_MAX) {
    return { ok: false, error: "Keep the signature image under 2 MB." };
  }
  return { ok: true, value: file };
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round5(value) {
  return Math.round(value * 100000) / 100000;
}

/** Clamp a normalized field box to the page and keep it usable. */
export function clampBox(box) {
  // Round the size first, then clamp the origin against the rounded size so
  // the stored x + width can never exceed 1.00000 after numeric rounding.
  const width = round5(clamp(Number(box?.width) || 0.2, 0.05, 1));
  const height = round5(clamp(Number(box?.height) || 0.05, 0.03, 1));
  const x = round5(clamp(Number(box?.x) || 0, 0, 1 - width));
  const y = round5(clamp(Number(box?.y) || 0, 0, 1 - height));
  return { ...box, x, y, width, height };
}

export function validateSignatory(signatory) {
  const profileId = signatory?.profileId;
  if (!profileId) {
    return { ok: false, error: "Choose the registered account for this signer." };
  }

  const detectedName = String(signatory?.detectedName ?? "").replace(/\s+/g, " ").trim();
  if (!detectedName || detectedName.length > 160) {
    return { ok: false, error: "Enter the name printed on the document." };
  }

  const fullName = String(signatory?.fullName ?? "").trim();
  if (!fullName) {
    return { ok: false, error: "Choose the matched account." };
  }

  const score = Number(signatory?.score);
  if (!Number.isFinite(score) || score < MATCH_THRESHOLD || score > 1) {
    return { ok: false, error: "Match a registered account at 90% or higher." };
  }

  const pageNumber = Number(signatory?.pageNumber);
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return { ok: false, error: "Choose a valid page for the signature." };
  }

  const box = {
    x: Number(signatory?.x),
    y: Number(signatory?.y),
    width: Number(signatory?.width),
    height: Number(signatory?.height),
  };
  if (
    !Number.isFinite(box.x) ||
    !Number.isFinite(box.y) ||
    !Number.isFinite(box.width) ||
    !Number.isFinite(box.height)
  ) {
    return { ok: false, error: "Place the signature field on the page." };
  }
  if (box.width <= 0 || box.height <= 0) {
    return { ok: false, error: "The signature field is too small." };
  }
  if (box.x < 0 || box.y < 0 || box.x + box.width > 1.0001 || box.y + box.height > 1.0001) {
    return { ok: false, error: "Keep the signature field inside the page." };
  }

  return {
    ok: true,
    value: { ...signatory, detectedName, fullName, score, pageNumber, ...box },
  };
}

export function validateSignatoryList(signatories) {
  const list = Array.isArray(signatories) ? signatories : [];
  if (list.length === 0) {
    return { ok: false, error: "Add at least one signatory." };
  }
  if (list.length > MAX_SIGNATORIES) {
    return { ok: false, error: `A document can have at most ${MAX_SIGNATORIES} signatories.` };
  }

  const checked = [];
  for (const signatory of list) {
    const result = validateSignatory(signatory);
    if (!result.ok) return result;
    checked.push(result.value);
  }

  const profiles = new Set();
  const orders = new Set();
  for (const signatory of checked) {
    if (profiles.has(String(signatory.profileId))) {
      return { ok: false, error: "The same person is listed twice." };
    }
    profiles.add(String(signatory.profileId));
    const order = Number(signatory.signOrder);
    if (Number.isInteger(order)) {
      if (orders.has(order)) {
        return { ok: false, error: "The signing order has duplicates." };
      }
      orders.add(order);
    }
  }

  if (orders.size > 0) {
    for (let index = 1; index <= checked.length; index += 1) {
      if (!orders.has(index)) {
        return { ok: false, error: "The signing order must be 1, 2, 3… with no gaps." };
      }
    }
  }

  return { ok: true, value: checked };
}

/** Whether this signer may act now, given sequential/parallel mode. */
export function canSignNow({
  signingMode = "sequential",
  signOrder,
  signatories = [],
  documentStatus,
  signatoryStatus,
  hasSignature,
}) {
  if (!["pending", "in_progress"].includes(documentStatus)) {
    return { ok: false, reason: "This document is not open for signing." };
  }
  if (signatoryStatus === "signed") {
    return { ok: false, reason: "You have already signed this document." };
  }
  if (signatoryStatus === "declined") {
    return { ok: false, reason: "This request was declined." };
  }
  if (signatoryStatus === "signing") {
    return { ok: false, reason: "This signature is already being processed." };
  }
  if (!hasSignature) {
    return { ok: false, reason: "Upload your signature before approving." };
  }
  if (signingMode === "sequential") {
    const earlier = signatories.filter(
      (item) => Number(item.signOrder) < Number(signOrder) && item.status !== "signed",
    );
    if (earlier.length > 0) {
      return { ok: false, reason: "Waiting for earlier signers." };
    }
  }
  return { ok: true, reason: "" };
}

/** Escape user input for a PostgREST ilike pattern. */
export function escapeLike(value) {
  return String(value ?? "").replace(/[\\%_]/g, (character) => `\\${character}`);
}

export function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return DATE_FORMAT.format(date);
}

export function formatDateTime(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return DATE_TIME_FORMAT.format(date);
}

export function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "Not recorded";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function percent(score) {
  const number = Number(score);
  if (!Number.isFinite(number)) return "0%";
  return `${Math.round(number * 1000) / 10}%`;
}

export function documentProgress(signatories = []) {
  const total = signatories.length;
  const signed = signatories.filter((item) => item.status === "signed").length;
  return {
    total,
    signed,
    remaining: Math.max(0, total - signed),
    percent: total === 0 ? 0 : Math.round((signed / total) * 100),
  };
}

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value ?? ""),
  );
}
