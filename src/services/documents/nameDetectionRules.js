/**
 * Pure helpers for turning PDF text lines into plausible printed names and
 * signature-field boxes. PDF parsing itself lives in `pdfDetection.js`; this
 * module is deliberately free of pdf.js so it can be tested with node:test.
 */

export const SIGNATURE_LABELS = [
  "SIGNATURE OVER PRINTED NAME/S",
  "SIGNATURE OVER PRINTED NAMES",
  "SIGNATURE OVER PRINTED NAME",
  "NAME OF SIGNATORY",
  "NAME OF APPROVER",
  "RECOMMENDING APPROVAL",
  "PREPARED AND SUBMITTED BY",
  "CERTIFIED CORRECT",
  "PRINTED NAME",
  "REVIEWED BY",
  "APPROVED BY",
  "REQUESTED BY",
  "PREPARED BY",
  "RECEIVED BY",
  "SIGNED BY",
  "APPROVER",
  "CONFORME",
  "NOTED BY",
  "NAME",
];

const REJECT_WORDS = [
  "SIGNATURE",
  "DATE",
  "POSITION",
  "DEPARTMENT",
  "TITLE",
  "ADDRESS",
  "CONTACT",
  "EMAIL",
  "PHONE",
  "APPROVED",
  "APPROVER",
  "REVIEWED",
  "PREPARED",
  "SUBMITTED",
  "NOTED",
  "RECEIVED",
  "CONFORME",
  "CERTIFIED",
  "REQUESTED",
  "RECOMMENDING",
  "PAGE",
  "DOCUMENT",
  "REFERENCE",
  "CONTROL",
  "NUMBER",
  "AMOUNT",
  "TOTAL",
  "REPUBLIC",
  "PHILIPPINES",
  "PROVINCE",
  "BARANGAY",
  "OFFICE",
  "COMPANY",
  "SCHOOL",
  "UNIVERSITY",
  "COLLEGE",
  "NAME",
  "NAMES",
  "OF",
  "THE",
  "THIS",
  "IS",
  "AND",
  "TO",
  "FOR",
  "WITH",
  "FROM",
  "NOT",
  "REAL",
  "SAMPLE",
  "TEST",
  "APPROVAL",
  "SHEET",
  "ARE",
];

const SORTED_LABELS = [...SIGNATURE_LABELS].sort((a, b) => b.length - a.length);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeCandidateText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip labels, parentheticals, underscores and leading list numbers. */
export function cleanNameLine(raw) {
  let text = String(raw ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[_]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";

  text = text.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();

  for (const label of SORTED_LABELS) {
    const pattern = new RegExp(
      `^\\s*${escapeRegExp(label)}\\s*[:\\-–—]?\\s*`,
      "i",
    );
    if (pattern.test(text)) {
      text = text.replace(pattern, "");
      break;
    }
  }

  text = text
    .replace(
      /\s*[|/]\s*(SIGNATURE OVER PRINTED NAME|PRINTED NAME|NAME OF SIGNATORY)\s*$/i,
      "",
    )
    .replace(/^[\s\d.)\-•·]+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[\s,.;:]+|[\s,.;:]+$/g, "");

  return text;
}

/** Is this cleaned string plausible as a person's printed name? */
export function isNameCandidate(value) {
  const clean = cleanNameLine(value);
  if (!clean) return false;
  if (clean.length < 5 || clean.length > 120) return false;
  if (/[@{}<>]|https?:|www\./i.test(clean)) return false;
  if (/\d/.test(clean)) return false;

  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 7) return false;

  const upper = clean.toUpperCase();
  for (const word of REJECT_WORDS) {
    if (new RegExp(`\\b${word}\\b`).test(upper)) return false;
  }

  const nonSpace = clean.replace(/\s/g, "").length;
  const letters = (clean.match(/[A-Za-z\u00C0-\u024F]/g) ?? []).length;
  if (nonSpace === 0 || letters / nonSpace < 0.6) return false;

  for (const token of tokens) {
    if (!/[A-Za-z\u00C0-\u024F]/.test(token) && !/^(JR|SR|II|III|IV)\.?$/i.test(token)) {
      return false;
    }
  }

  return true;
}

/** Generate name-sized windows from a line that may contain several names. */
export function extractNameWindows(raw) {
  const clean = cleanNameLine(raw);
  if (!clean) return [];

  const segments = clean
    .split(/\s+(?:AND|&|\/)\s+/i)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const results = [];

  for (const segment of segments) {
    const tokens = segment.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) continue;

    if (tokens.length <= 7 && isNameCandidate(segment)) {
      results.push(segment);
      continue;
    }

    const selected = [];
    for (let size = Math.min(7, tokens.length); size >= 2; size -= 1) {
      for (let start = 0; start + size <= tokens.length; start += 1) {
        const end = start + size - 1;
        if (selected.some(([from, to]) => start <= to && end >= from)) continue;

        const window = tokens.slice(start, start + size).join(" ");
        if (isNameCandidate(window)) {
          results.push(window);
          selected.push([start, end]);
        }
      }
    }
  }

  return [...new Set(results)];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round5(value) {
  return Math.round(value * 100000) / 100000;
}

/**
 * Default signature box: the blank area directly above the printed name.
 * Coordinates are normalized to the displayed page, origin top-left.
 */
export function candidateBoxFromLine(line, pageWidth, pageHeight, pageNumber = 1) {
  const width = Number(pageWidth) > 0 ? Number(pageWidth) : 1;
  const height = Number(pageHeight) > 0 ? Number(pageHeight) : 1;
  const fontSize = Math.max(Number(line?.fontSize) || 0, Number(line?.height) || 0, 10);
  const lineX = Number(line?.x) || 0;
  const lineY = Number(line?.y) || 0;
  const lineWidth = Number(line?.width) || 0;

  const gap = 1;
  const boxHeightPx = Math.min(Math.max(fontSize * 1.8, 24), height * 0.12);

  // A signature field should look like a signature field, not a full-width
  // table cell. Keep it between 3:1 and 6:1, and let a long printed name
  // stretch it only within that range. This also fixes the old behavior where
  // a short "Pedro reyes" got a 28%-of-page box.
  const boxWidthPx = Math.min(
    Math.max(boxHeightPx * 3, Math.min(lineWidth, boxHeightPx * 6)),
    width * 0.6,
  );

  const normalizedWidth = round5(boxWidthPx / width);
  const normalizedHeight = round5(boxHeightPx / height);

  // Center the field on the printed name, not its left edge.
  const centerX = lineX + lineWidth / 2;
  const x = round5(
    clamp(centerX / width - normalizedWidth / 2, 0, 1 - normalizedWidth),
  );

  // `line.y` is the baseline in pdf.js's top-left viewport coordinates.
  // Put the box above the glyphs, but let it drop further so its bottom edge
  // overlaps the printed name. The extra drop is about 10 px at 16 pt. If
  // there is no room at the top, put the box below the name instead.
  const extraDrop = fontSize * 0.625;
  let boxTop =
    lineY - fontSize * 0.5 - gap - boxHeightPx + extraDrop;
  let y = boxTop / height;

  if (y < 0.01) {
    boxTop = lineY + gap;
    y = boxTop / height;
  }

  y = round5(clamp(y, 0, 1 - normalizedHeight));

  return {
    pageNumber,
    x,
    y,
    width: normalizedWidth,
    height: normalizedHeight,
  };
}

/** Give a line a context score based on nearby signature labels and typography. */
export function scoreLineContext({ line, lines = [], pageWidth = 1 }) {
  let score = 0;
  let label = "";

  const nearby = lines.filter((other) => {
    if (other === line) return false;
    const vertical = Math.abs((Number(other.y) || 0) - (Number(line.y) || 0));
    const horizontal = Math.abs((Number(other.x) || 0) - (Number(line.x) || 0));
    return vertical <= 140 && horizontal <= pageWidth * 0.7;
  });

  const nearbyText = nearby.map((item) => String(item.text ?? "")).join(" ");
  const upperNearby = nearbyText.toUpperCase();

  for (const signatureLabel of SIGNATURE_LABELS) {
    if (signatureLabel === "NAME") continue;
    if (upperNearby.includes(signatureLabel)) {
      score += 0.55;
      label = signatureLabel;
      break;
    }
  }

  if (/_{3,}/.test(nearbyText)) score += 0.1;

  const text = String(line?.text ?? "");
  const upper = text.toUpperCase();
  if (upper === text && /[A-Z]/.test(text)) score += 0.15;

  const fontSize = Number(line?.fontSize) || 0;
  if (fontSize >= 10) score += 0.1;

  const family = String(line?.fontFamily ?? "");
  if (/garamond/i.test(family) || (fontSize >= 14 && fontSize <= 18)) {
    score += 0.1;
  }

  return { score: Math.min(1, score), label };
}

/**
 * Turn extracted PDF lines into deduplicated name candidates with boxes.
 * `lines` items: { text, x, y, width, height, fontSize, fontFamily }
 */
export function selectCandidatesFromLines({
  lines = [],
  pageNumber = 1,
  pageWidth = 1,
  pageHeight = 1,
  maxCandidates = 40,
}) {
  const byName = new Map();

  for (const line of lines) {
    const windows = extractNameWindows(line.text);
    if (windows.length === 0) continue;

    const context = scoreLineContext({ line, lines, pageWidth });

    for (const window of windows) {
      const key = normalizeCandidateText(window);
      if (!key) continue;

      const box = candidateBoxFromLine(line, pageWidth, pageHeight, pageNumber);
      const candidate = {
        text: window,
        pageNumber,
        ...box,
        fontSize: Number(line.fontSize) || 0,
        fontFamily: String(line.fontFamily ?? ""),
        isBold: Boolean(line.isBold),
        contextScore: context.score,
        contextLabel: context.label,
      };

      const previous = byName.get(key);
      if (
        !previous ||
        candidate.contextScore > previous.contextScore ||
        (candidate.contextScore === previous.contextScore &&
          candidate.text.length > previous.text.length)
      ) {
        byName.set(key, candidate);
      }
    }
  }

  return [...byName.values()]
    .sort((a, b) => {
      if (b.contextScore !== a.contextScore) return b.contextScore - a.contextScore;
      return b.text.length - a.text.length;
    })
    .slice(0, maxCandidates);
}

export const STYLE_MIN_SIZE = 14;
export const STYLE_MAX_SIZE = 18;

/**
 * The strict style gate the project asked for: Garamond-like family, bold, and
 * 14–18 pt. pdf.js sometimes cannot expose the font name; in that case the
 * candidate does not pass and the UI shows Manual only. There is no size-only
 * or signature-label fallback.
 */
export function isGaramondBoldStyle(candidate) {
  const family = String(candidate?.fontFamily ?? "").toLowerCase();
  const size = Number(candidate?.fontSize);
  const familyBold = /bold|semibold|demi|black/.test(family);
  const bold = Boolean(candidate?.isBold) || familyBold;

  return (
    family.includes("garamond") &&
    bold &&
    Number.isFinite(size) &&
    size >= STYLE_MIN_SIZE &&
    size <= STYLE_MAX_SIZE
  );
}

function sortCandidates(list) {
  return [...list].sort(
    (a, b) =>
      Number(a.pageNumber) - Number(b.pageNumber) ||
      Number(a.y) - Number(b.y) ||
      Number(b.contextScore) - Number(a.contextScore),
  );
}

/**
 * Returns exactly what the review screen should show:
 *   1. Garamond-like, bold, 14–18 pt names anywhere on the page (strict)
 *   2. Otherwise: nothing (manual entry)
 *
 * Signature labels are useful context for ordering, but they are NOT required.
 * Many real documents have no "Prepared by" / "Approved by" labels at all.
 * If a PDF hides its font metadata, the system does not guess by size alone;
 * that would recreate the old false-positive flood.
 */
export function pickStyleCandidates(candidates = []) {
  const list = Array.isArray(candidates) ? candidates : [];
  const styled = list.filter(isGaramondBoldStyle);

  if (styled.length > 0) {
    return { candidates: sortCandidates(styled), mode: "garamond" };
  }

  return { candidates: [], mode: "none" };
}

const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
]);

export function formatDetectedStyle(candidate) {
  const family = String(candidate?.fontFamily ?? "")
    .replace(/^["']|["']$/g, "")
    .trim();
  const size = Number(candidate?.fontSize);
  const parts = [];
  if (family && !GENERIC_FAMILIES.has(family.toLowerCase())) {
    parts.push(family);
  }
  if (Number.isFinite(size) && size > 0) {
    parts.push(`${Math.round(size * 10) / 10} pt`);
  }
  return parts.join(" · ");
}
