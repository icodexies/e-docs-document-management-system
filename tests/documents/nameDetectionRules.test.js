import test from "node:test";
import assert from "node:assert/strict";
import {
  candidateBoxFromLine,
  cleanNameLine,
  extractNameWindows,
  formatDetectedStyle,
  isGaramondBoldStyle,
  isNameCandidate,
  pickStyleCandidates,
  selectCandidatesFromLines,
  scoreLineContext,
} from "../../src/services/documents/nameDetectionRules.js";

test("printed-name labels are removed from the name line", () => {
  assert.equal(
    cleanNameLine("Signature over Printed Name: JUAN DELA CRUZ"),
    "JUAN DELA CRUZ",
  );
  assert.equal(cleanNameLine("Approved by: Maria Santos"), "Maria Santos");
  assert.equal(
    cleanNameLine("JUAN DELA CRUZ (Signature over Printed Name)"),
    "JUAN DELA CRUZ",
  );
  assert.equal(cleanNameLine("NAME: JUAN DELA CRUZ"), "JUAN DELA CRUZ");
  assert.equal(cleanNameLine("____ JUAN DELA CRUZ"), "JUAN DELA CRUZ");
  assert.equal(cleanNameLine("1. JUAN DELA CRUZ"), "JUAN DELA CRUZ");
  assert.equal(cleanNameLine("Signature over Printed Name:"), "");
});

test("common headers, dates and emails are not names", () => {
  assert.equal(isNameCandidate("JUAN DELA CRUZ"), true);
  assert.equal(isNameCandidate("Maria Santos"), true);
  assert.equal(isNameCandidate("JUAN DELA CRUZ JR"), true);
  assert.equal(isNameCandidate("APPROVED BY"), false);
  assert.equal(isNameCandidate("REPUBLIC OF THE PHILIPPINES"), false);
  assert.equal(isNameCandidate("October 27, 2026"), false);
  assert.equal(isNameCandidate("juan@example.com"), false);
  assert.equal(isNameCandidate("Signature"), false);
  assert.equal(isNameCandidate("JUAN 123"), false);
});

test("name windows are extracted from multi-name lines", () => {
  assert.deepEqual(
    extractNameWindows("Signature over Printed Name: JUAN DELA CRUZ"),
    ["JUAN DELA CRUZ"],
  );

  const twoNames = extractNameWindows("JUAN DELA CRUZ AND MARIA SANTOS");
  assert.ok(twoNames.includes("JUAN DELA CRUZ"));
  assert.ok(twoNames.includes("MARIA SANTOS"));

  const slashNames = extractNameWindows(
    "APPROVED BY: JUAN DELA CRUZ / MARIA SANTOS",
  );
  assert.ok(slashNames.includes("JUAN DELA CRUZ"));
  assert.ok(slashNames.includes("MARIA SANTOS"));

  assert.deepEqual(extractNameWindows("Signature over Printed Name:"), []);
});

test("a stray header word does not hide the name beside it", () => {
  const windows = extractNameWindows("JUAN DELA CRUZ DATE");
  assert.deepEqual(windows, ["JUAN DELA CRUZ"]);
});

test("the default signature box overlaps the printed name from above", () => {
  const line = {
    x: 100,
    y: 200,
    width: 150,
    height: 16,
    fontSize: 16,
  };
  const box = candidateBoxFromLine(line, 600, 800, 2);

  assert.equal(box.pageNumber, 2);
  assert.ok(Math.abs(box.x - 0.16667) < 0.0001);
  assert.ok(Math.abs(box.y - 0.21525) < 0.002);
  assert.ok(Math.abs(box.width - 0.25) < 0.0001);
  assert.ok(Math.abs(box.height - 0.036) < 0.0001);
  assert.ok(box.x + box.width <= 1);
  assert.ok(box.y + box.height <= 1);
  const bottom = (box.y + box.height) * 800;
  assert.ok(bottom > line.y - line.fontSize * 0.85);
  assert.ok(bottom > line.y);
  assert.ok(bottom < line.y + 2);
});

test("a short name gets a compact field centered on the name", () => {
  const line = {
    x: 266.68,
    y: 678.15,
    width: 78.83,
    height: 16,
    fontSize: 16,
  };
  const box = candidateBoxFromLine(line, 612, 1008, 1);

  assert.ok(box.width < 0.28);
  assert.ok(Math.abs(box.width - 0.14118) < 0.0001);
  assert.ok(Math.abs(box.x + box.width / 2 - 0.5001) < 0.002);
  const bottom = (box.y + box.height) * 1008;
  assert.ok(bottom > line.y);
  assert.ok(bottom < line.y + 2);
});

test("a name at the very top gets an in-bounds box below it", () => {
  const box = candidateBoxFromLine(
    { x: 520, y: 20, width: 70, height: 16, fontSize: 16 },
    600,
    800,
    1,
  );
  assert.ok(box.x >= 0 && box.y >= 0);
  assert.ok(box.x + box.width <= 1);
  assert.ok(box.y + box.height <= 1);
  assert.ok(box.y * 800 >= 20);
});

test("a name near the bottom stays in bounds", () => {
  const box = candidateBoxFromLine(
    { x: 520, y: 760, width: 70, height: 16, fontSize: 16 },
    600,
    800,
    1,
  );
  assert.ok(box.x >= 0 && box.y >= 0);
  assert.ok(box.x + box.width <= 1);
  assert.ok(box.y + box.height <= 1);
  assert.ok((box.y + box.height) * 800 > 760);
});

test("context scoring prefers names beside a signature label", () => {
  const line = {
    text: "JUAN DELA CRUZ",
    x: 100,
    y: 270,
    width: 150,
    height: 16,
    fontSize: 16,
    fontFamily: "Garamond-Bold",
  };
  const label = {
    text: "Signature over Printed Name:",
    x: 100,
    y: 300,
    width: 200,
    height: 10,
    fontSize: 10,
  };

  const nearLabel = scoreLineContext({
    line,
    lines: [label, line],
    pageWidth: 600,
  });
  const alone = scoreLineContext({ line, lines: [line], pageWidth: 600 });

  assert.equal(nearLabel.label, "SIGNATURE OVER PRINTED NAME");
  assert.ok(nearLabel.score > alone.score);
  assert.ok(nearLabel.score >= 0.8);
});

test("candidate selection keeps the name and drops dates and labels", () => {
  const lines = [
    {
      text: "Signature over Printed Name:",
      x: 100,
      y: 300,
      width: 200,
      height: 10,
      fontSize: 10,
      fontFamily: "Arial",
    },
    {
      text: "JUAN DELA CRUZ",
      x: 100,
      y: 270,
      width: 150,
      height: 16,
      fontSize: 16,
      fontFamily: "Garamond-Bold",
    },
    {
      text: "October 27, 2026",
      x: 400,
      y: 270,
      width: 100,
      height: 10,
      fontSize: 10,
      fontFamily: "Arial",
    },
  ];

  const candidates = selectCandidatesFromLines({
    lines,
    pageNumber: 2,
    pageWidth: 600,
    pageHeight: 800,
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].text, "JUAN DELA CRUZ");
  assert.equal(candidates[0].pageNumber, 2);
  assert.ok(candidates[0].contextScore >= 0.8);
  assert.ok(candidates[0].x + candidates[0].width <= 1);
  assert.ok(candidates[0].y + candidates[0].height <= 1);
});

test("detected typography is formatted for the review list", () => {
  assert.equal(
    formatDetectedStyle({ fontFamily: '"Garamond"', fontSize: 16 }),
    "Garamond · 16 pt",
  );
  assert.equal(formatDetectedStyle({ fontFamily: "serif", fontSize: 16 }), "16 pt");
  assert.equal(formatDetectedStyle({}), "");
});

test("the strict style gate requires Garamond-like bold 14–18 pt", () => {
  assert.equal(
    isGaramondBoldStyle({
      fontFamily: "Garamond-Bold",
      fontSize: 16,
      isBold: false,
    }),
    true,
  );
  assert.equal(
    isGaramondBoldStyle({ fontFamily: "Garamond", fontSize: 16, isBold: true }),
    true,
  );
  assert.equal(
    isGaramondBoldStyle({
      fontFamily: "Garamond",
      fontSize: 16,
      isBold: false,
    }),
    false,
  );
  assert.equal(
    isGaramondBoldStyle({
      fontFamily: "Garamond-Bold",
      fontSize: 12,
      isBold: true,
    }),
    false,
  );
  assert.equal(
    isGaramondBoldStyle({ fontFamily: "Arial-Bold", fontSize: 16, isBold: true }),
    false,
  );
});

test("underlining does not disqualify a Garamond Bold 14–18 pt name", () => {
  const underlined = {
    text: "UNDERLINED NAME",
    pageNumber: 1,
    y: 0.3,
    contextScore: 0.8,
    contextLabel: "",
    fontFamily: "Garamond-Bold",
    fontSize: 16,
    isBold: true,
    isUnderlined: true,
  };

  assert.equal(isGaramondBoldStyle(underlined), true);

  const picked = pickStyleCandidates([underlined]);
  assert.equal(picked.mode, "garamond");
  assert.deepEqual(
    picked.candidates.map((candidate) => candidate.text),
    ["UNDERLINED NAME"],
  );
});

test("style selection works without any signature label", () => {
  const candidates = [
    {
      text: "MARIA SANTOS",
      pageNumber: 1,
      y: 0.3,
      contextScore: 0.9,
      contextLabel: "",
      fontFamily: "Garamond-Bold",
      fontSize: 16,
      isBold: true,
    },
    {
      text: "JUAN DELA CRUZ",
      pageNumber: 1,
      y: 0.2,
      contextScore: 0.9,
      contextLabel: "",
      fontFamily: "Garamond-Bold",
      fontSize: 16,
      isBold: true,
    },
    {
      text: "SMALL BODY TEXT",
      pageNumber: 1,
      y: 0.5,
      contextScore: 0.3,
      contextLabel: "",
      fontFamily: "Garamond-Bold",
      fontSize: 12,
      isBold: true,
    },
    {
      text: "HEADER NAME",
      pageNumber: 1,
      y: 0.1,
      contextScore: 0.2,
      contextLabel: "",
      fontFamily: "Arial-Bold",
      fontSize: 16,
      isBold: true,
    },
  ];

  const picked = pickStyleCandidates(candidates);
  assert.equal(picked.mode, "garamond");
  assert.deepEqual(
    picked.candidates.map((candidate) => candidate.text),
    ["JUAN DELA CRUZ", "MARIA SANTOS"],
  );
});

test("generic font metadata is not guessed by size alone", () => {
  const picked = pickStyleCandidates([
    {
      text: "JUAN DELA CRUZ",
      pageNumber: 1,
      y: 0.2,
      contextLabel: "",
      fontFamily: "serif",
      fontSize: 16,
      isBold: false,
    },
    {
      text: "BODY TEXT NAME",
      pageNumber: 1,
      y: 0.5,
      contextLabel: "",
      fontFamily: "serif",
      fontSize: 16,
      isBold: false,
    },
  ]);

  assert.deepEqual(picked, { candidates: [], mode: "none" });
});

test("without labels, only Garamond-style names are kept", () => {
  const picked = pickStyleCandidates([
    {
      text: "STYLED NAME",
      pageNumber: 1,
      y: 0.2,
      contextLabel: "",
      fontFamily: "Garamond-Bold",
      fontSize: 16,
      isBold: true,
    },
    {
      text: "PLAIN NAME",
      pageNumber: 1,
      y: 0.4,
      contextLabel: "",
      fontFamily: "Arial",
      fontSize: 12,
      isBold: false,
    },
  ]);

  assert.equal(picked.mode, "garamond");
  assert.deepEqual(
    picked.candidates.map((candidate) => candidate.text),
    ["STYLED NAME"],
  );
});

test("no style or signature context means no automatic candidates", () => {
  const picked = pickStyleCandidates([
    {
      text: "BODY TEXT",
      pageNumber: 1,
      y: 0.4,
      contextLabel: "",
      fontFamily: "Arial",
      fontSize: 12,
      isBold: false,
    },
  ]);

  assert.deepEqual(picked, { candidates: [], mode: "none" });
});
