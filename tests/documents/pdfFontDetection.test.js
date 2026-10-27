import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  buildLines,
  extractCandidatesFromDocument,
  normalizePdfFontName,
  pdfLoadingOptions,
} from "../../src/services/documents/pdfDetection.js";
import {
  pickStyleCandidates,
  selectCandidatesFromLines,
} from "../../src/services/documents/nameDetectionRules.js";

const fixturePath = fileURLToPath(
  new URL("../fixtures/real-garamond-names.pdf", import.meta.url),
);

const viewport = {
  transform: [1, 0, 0, 1, 0, 0],
  scale: 1,
  width: 612,
  height: 1008,
};

function textContent(items, fontFamily = "serif") {
  return {
    items,
    styles: { f1: { fontFamily } },
  };
}

function fontPage(fonts) {
  return {
    commonObjs: {
      get(fontName) {
        const value = fonts[fontName];
        if (value instanceof Error) throw value;
        return value;
      },
    },
  };
}

function runItem(fontName = "f1") {
  return {
    str: "PEDRO REYES",
    fontName,
    transform: [16, 0, 0, 16, 100, 200],
    width: 100,
    height: 16,
  };
}

function candidatesFrom(lines) {
  return selectCandidatesFromLines({
    lines,
    pageNumber: 1,
    pageWidth: viewport.width,
    pageHeight: viewport.height,
  });
}

test("real pdf.js resolves Garamond-Bold and finds exactly the two names", async () => {
  const data = new Uint8Array(await readFile(fixturePath));
  const loadingTask = pdfjs.getDocument(pdfLoadingOptions(data));
  const pdf = await loadingTask.promise;

  try {
    const result = await extractCandidatesFromDocument(pdf, pdfjs);

    assert.equal(result.pageCount, 1);
    assert.equal(result.detectionMode, "garamond");
    assert.deepEqual(
      result.candidates.map((candidate) => candidate.text),
      ["Pedro reyes", "Maria Santos"],
    );

    for (const candidate of result.candidates) {
      assert.match(candidate.fontFamily, /garamond/i);
      assert.equal(candidate.fontSize, 16);
      assert.equal(candidate.isBold, true);
      // The names are in the lower half of this page; a correct top-left
      // coordinate system places both boxes above them, not mirrored at the top.
      assert.ok(candidate.y > 0.5);
      assert.ok(candidate.y + candidate.height < 1);
      // The field is compact and centered on the printed name, not a wide
      // left-aligned box.
      assert.ok(candidate.width < 0.2);
      assert.ok(
        Math.abs(candidate.x + candidate.width / 2 - 0.5) < 0.002,
      );
    }

    assert.ok(
      result.candidates.every(
        (candidate) => candidate.text !== "Head of the City college",
      ),
    );
  } finally {
    await loadingTask.destroy();
  }
});

test("subset prefixes are stripped and touching runs are joined", () => {
  assert.equal(
    normalizePdfFontName("BCDKEE+Garamond-Bold"),
    "Garamond-Bold",
  );

  const items = [
    {
      str: "Pedr",
      fontName: "f1",
      transform: [16, 0, 0, 16, 100, 200],
      width: 32,
      height: 16,
    },
    {
      str: "o reyes",
      fontName: "f1",
      transform: [16, 0, 0, 16, 132, 200],
      width: 56,
      height: 16,
    },
  ];

  const lines = buildLines(
    textContent(items),
    viewport,
    pdfjs,
    fontPage({ f1: { name: "BCDKEE+Garamond-Bold" } }),
  );

  assert.equal(lines.length, 1);
  assert.equal(lines[0].text, "Pedro reyes");
  assert.equal(lines[0].fontFamily, "Garamond-Bold");
  assert.equal(lines[0].fontSize, 16);
  assert.equal(lines[0].isBold, true);
});

test("generic CSS metadata and unresolved font objects stay manual", () => {
  const lines = buildLines(
    textContent([runItem()], "serif"),
    viewport,
    pdfjs,
    fontPage({ f1: new Error("not resolved") }),
  );

  assert.equal(lines[0].fontFamily, "serif");
  assert.equal(lines[0].isBold, false);
  assert.deepEqual(pickStyleCandidates(candidatesFrom(lines)), {
    candidates: [],
    mode: "none",
  });
});

test("a bold 16 pt non-Garamond name is rejected", () => {
  const lines = buildLines(
    textContent([runItem()], "sans-serif"),
    viewport,
    pdfjs,
    fontPage({ f1: { name: "BCDIEE+CenturyGothic-Bold" } }),
  );

  assert.equal(lines[0].fontFamily, "CenturyGothic-Bold");
  assert.equal(lines[0].isBold, true);
  assert.deepEqual(pickStyleCandidates(candidatesFrom(lines)), {
    candidates: [],
    mode: "none",
  });
});

test("the loader requests font extra properties for pdf.js v6", () => {
  const options = pdfLoadingOptions(new Uint8Array());

  assert.equal(options.fontExtraProperties, true);
  assert.equal(options.isEvalSupported, false);
  assert.equal(options.useSystemFonts, true);
});
