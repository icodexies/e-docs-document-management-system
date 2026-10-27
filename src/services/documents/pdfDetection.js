import { MAX_DOCUMENT_PAGES } from "./documentRules.js";
import {
  normalizeCandidateText,
  pickStyleCandidates,
  selectCandidatesFromLines,
} from "./nameDetectionRules.js";
import { mapPdfError } from "./pdfErrors.js";

const BOLD_FONT_RE = /bold|semibold|demi|black/i;

/**
 * pdf.js only puts the generic CSS fallback (`serif`, `sans-serif`) in
 * `textContent.styles[...].fontFamily`. The embedded PostScript name is on the
 * font object instead.
 *
 * In pdf.js v6 that object only includes `name` when `fontExtraProperties` is
 * true. v4 already exposes it, and unknown options are ignored there. Without
 * this option a real `BCDKEE+Garamond-Bold` reports as `serif`, so the strict
 * gate would reject every name and show "Manual only".
 */
export function pdfLoadingOptions(data) {
  return {
    data,
    isEvalSupported: false,
    useSystemFonts: true,
    fontExtraProperties: true,
  };
}

/** Strip the PDF subset prefix, e.g. `BCDKEE+Garamond-Bold` → `Garamond-Bold`. */
export function normalizePdfFontName(value) {
  return String(value ?? "")
    .trim()
    .replace(/^[A-Z]{6}\+/, "");
}

/**
 * Read the real font metadata for a text run. `commonObjs.get()` throws until
 * the font has been resolved, so the caller must await `getOperatorList()`
 * first and this function keeps a defensive try/catch.
 */
function readFontMetadata(page, item, textContent) {
  const style = textContent.styles?.[item.fontName];
  const cssFontFamily = String(style?.fontFamily ?? "").trim();

  let fontObject;
  try {
    fontObject = page?.commonObjs?.get?.(item.fontName) ?? null;
  } catch {
    fontObject = null;
  }

  let rawFontName;
  let fontBold;
  try {
    rawFontName = String(fontObject?.name ?? "").trim();
    fontBold = Boolean(fontObject?.bold);
  } catch {
    rawFontName = "";
    fontBold = false;
  }

  const pdfFontName = normalizePdfFontName(rawFontName);
  const fontFamily = pdfFontName || cssFontFamily;
  const isBold =
    fontBold ||
    BOLD_FONT_RE.test(pdfFontName) ||
    BOLD_FONT_RE.test(cssFontFamily);

  return {
    cssFontFamily,
    fontBold,
    fontFamily,
    isBold,
    pdfFontName,
    rawFontName,
  };
}

export function buildLines(
  textContent,
  viewport,
  pdfjs,
  page,
  { onFontInfo } = {},
) {
  const items = [];

  for (const item of textContent.items) {
    const text = String(item?.str ?? "");
    if (!text.trim()) continue;

    const transform = pdfjs.Util.transform(viewport.transform, item.transform);
    const x = transform[4];
    const y = transform[5];
    const fontSize =
      Math.hypot(transform[2], transform[3]) ||
      Math.abs(transform[3]) ||
      Number(item.height) ||
      10;
    const width = Math.max(0, Number(item.width) || 0) * viewport.scale;
    const height =
      Math.max(0, Number(item.height) || 0) * viewport.scale || fontSize;
    const font = readFontMetadata(page, item, textContent);

    onFontInfo?.({
      fontNameKey: item.fontName,
      fontSize,
      ...font,
    });

    items.push({
      text,
      x,
      y,
      width,
      height,
      fontSize,
      fontFamily: font.fontFamily,
      isBold: font.isBold,
    });
  }

  if (items.length === 0) return [];

  const groups = [];
  for (const item of items) {
    const tolerance = Math.max(2, item.fontSize * 0.4);
    let group = groups.find(
      (candidate) => Math.abs(candidate.baseline - item.y) <= tolerance,
    );
    if (!group) {
      group = { baseline: item.y, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }

  const lines = [];

  for (const group of groups) {
    group.items.sort((a, b) => a.x - b.x);

    let text = "";
    let previousEnd = null;
    for (const item of group.items) {
      if (previousEnd !== null) {
        const gap = item.x - previousEnd;
        if (gap > Math.max(1, item.fontSize * 0.18)) text += " ";
      }
      text += item.text;
      previousEnd = item.x + item.width;
    }

    const x = Math.min(...group.items.map((item) => item.x));
    const right = Math.max(...group.items.map((item) => item.x + item.width));
    const baseline = Math.min(...group.items.map((item) => item.y));
    const fontSize = Math.max(...group.items.map((item) => item.fontSize));
    const height = Math.max(
      fontSize,
      ...group.items.map((item) => item.height),
    );
    const largest = group.items.reduce(
      (current, item) => (item.fontSize > current.fontSize ? item : current),
      group.items[0],
    );

    lines.push({
      text: text.replace(/\s+/g, " ").trim(),
      x,
      y: baseline,
      width: Math.max(1, right - x),
      height: Math.max(1, height),
      fontSize,
      fontFamily: largest.fontFamily,
      isBold: largest.isBold,
    });
  }

  return lines.sort((a, b) => b.y - a.y || a.x - b.x);
}

/**
 * Extract candidates from a pdf.js document proxy. This is separate from the
 * browser loader so the real-pdf.js integration test can run in Node without
 * the Vite `?url` worker import.
 */
export async function extractCandidatesFromDocument(
  pdf,
  pdfjs,
  { onProgress, onFontInfo } = {},
) {
  if (pdf.numPages > MAX_DOCUMENT_PAGES) {
    throw new Error(
      `This PDF has ${pdf.numPages} pages. The limit is ${MAX_DOCUMENT_PAGES}.`,
    );
  }

  const candidates = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress?.({ page: pageNumber, total: pdf.numPages });

    const page = await pdf.getPage(pageNumber);
    const rotation = ((Number(page.rotate) % 360) + 360) % 360;
    if (rotation !== 0) {
      throw new Error(
        `Page ${pageNumber} is rotated. Rotate the PDF to 0° and upload it again so signatures land in the right place.`,
      );
    }

    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    try {
      await page.getOperatorList();
    } catch {
      // If the operator list is unavailable, the CSS family fallback is still
      // tried. Generic `serif`/`sans-serif` never passes the strict gate.
    }
    const lines = buildLines(textContent, viewport, pdfjs, page, {
      onFontInfo,
    });

    const pageCandidates = selectCandidatesFromLines({
      lines,
      pageNumber,
      pageWidth: viewport.width,
      pageHeight: viewport.height,
    });

    candidates.push(...pageCandidates);
    page.cleanup();
  }

  const unique = new Map();
  for (const candidate of candidates) {
    const key = normalizeCandidateText(candidate.text);
    if (!key) continue;
    const previous = unique.get(key);
    if (!previous || candidate.contextScore > previous.contextScore) {
      unique.set(key, candidate);
    }
  }

  const picked = pickStyleCandidates([...unique.values()]);

  return {
    pageCount: pdf.numPages,
    candidates: picked.candidates.slice(0, 40),
    detectionMode: picked.mode,
  };
}

/**
 * Extract name candidates from a PDF. This reads the text layer only; scans
 * without selectable text return zero candidates and the uploader adds names
 * manually.
 */
export async function extractPdfCandidates(file, { onProgress } = {}) {
  const { pdfjs } = await import("../../lib/pdfjs.js");
  const buffer = await file.arrayBuffer();

  let loadingTask;
  let pdf;
  try {
    loadingTask = pdfjs.getDocument(pdfLoadingOptions(buffer));
    pdf = await loadingTask.promise;
  } catch (error) {
    await loadingTask?.destroy();
    throw mapPdfError(error);
  }

  try {
    const seenFonts = new Set();
    const debugFonts = Boolean(import.meta.env?.DEV);
    const onFontInfo = debugFonts
      ? (info) => {
          const key = [
            info.fontNameKey,
            info.rawFontName,
            info.cssFontFamily,
            info.fontFamily,
            info.isBold,
          ].join("|");
          if (seenFonts.has(key)) return;
          seenFonts.add(key);
          console.debug("[E-Docs] PDF font metadata", {
            fontKey: info.fontNameKey,
            rawFontName: info.rawFontName,
            cssFontFamily: info.cssFontFamily,
            resolvedFamily: info.fontFamily,
            isBold: info.isBold,
            fontSize: Math.round(info.fontSize * 10) / 10,
          });
        }
      : undefined;

    return await extractCandidatesFromDocument(pdf, pdfjs, {
      onProgress,
      onFontInfo,
    });
  } finally {
    // pdf.js v6 exposes destroy() on the loading task, not on PDFDocumentProxy.
    await loadingTask?.destroy();
  }
}
