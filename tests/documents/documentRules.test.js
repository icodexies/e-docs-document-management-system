import test from "node:test";
import assert from "node:assert/strict";
import {
  DOCUMENT_FILE_MAX,
  MATCH_THRESHOLD,
  SIGNATURE_FILE_MAX,
  canSignNow,
  clamp,
  clampBox,
  documentProgress,
  escapeLike,
  formatBytes,
  formatDate,
  isUuid,
  percent,
  validateDocumentFile,
  validateDocumentTitle,
  validateSignatureFile,
  validateSignatory,
  validateSignatoryList,
} from "../../src/services/documents/documentRules.js";

const validSignatory = {
  profileId: 12,
  detectedName: "JUAN DELA CRUZ",
  fullName: "Juan Dela Cruz",
  score: 0.96,
  pageNumber: 1,
  x: 0.1,
  y: 0.2,
  width: 0.3,
  height: 0.08,
};

test("titles are trimmed, collapsed and length-checked", () => {
  assert.deepEqual(validateDocumentTitle("  Travel   request  "), {
    ok: true,
    value: "Travel request",
  });
  assert.equal(validateDocumentTitle("   ").ok, false);
  assert.equal(validateDocumentTitle("x".repeat(161)).ok, false);
});

test("document files must be non-empty PDFs under 25 MB", () => {
  assert.equal(
    validateDocumentFile({
      name: "request.pdf",
      type: "application/pdf",
      size: 1024,
    }).ok,
    true,
  );
  assert.equal(
    validateDocumentFile({ name: "request.PDF", type: "", size: 1024 }).ok,
    true,
  );
  assert.equal(
    validateDocumentFile({
      name: "request.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 1024,
    }).ok,
    false,
  );
  assert.equal(
    validateDocumentFile({ name: "empty.pdf", type: "application/pdf", size: 0 })
      .ok,
    false,
  );
  assert.equal(
    validateDocumentFile({
      name: "huge.pdf",
      type: "application/pdf",
      size: DOCUMENT_FILE_MAX + 1,
    }).ok,
    false,
  );
});

test("signature images are raster files under 2 MB", () => {
  assert.equal(
    validateSignatureFile({ name: "sig.png", type: "image/png", size: 500 }).ok,
    true,
  );
  assert.equal(
    validateSignatureFile({ name: "sig.jpg", type: "image/jpeg", size: 500 }).ok,
    true,
  );
  assert.equal(
    validateSignatureFile({ name: "sig.gif", type: "image/gif", size: 500 }).ok,
    false,
  );
  assert.equal(
    validateSignatureFile({
      name: "sig.png",
      type: "image/png",
      size: SIGNATURE_FILE_MAX + 1,
    }).ok,
    false,
  );
});

test("a signatory needs a matched account, 90% score and a valid box", () => {
  assert.equal(validateSignatory(validSignatory).ok, true);
  assert.equal(validateSignatory({ ...validSignatory, profileId: null }).ok, false);
  assert.equal(
    validateSignatory({ ...validSignatory, score: MATCH_THRESHOLD - 0.001 }).ok,
    false,
  );
  assert.equal(
    validateSignatory({ ...validSignatory, fullName: "" }).ok,
    false,
  );
  assert.equal(
    validateSignatory({ ...validSignatory, x: 0.9, width: 0.3 }).ok,
    false,
  );
});

test("a signatory list rejects duplicates and gaps in the order", () => {
  const first = { ...validSignatory, signOrder: 1 };
  const second = {
    ...validSignatory,
    profileId: 13,
    fullName: "Maria Santos",
    detectedName: "MARIA SANTOS",
    signOrder: 2,
  };

  assert.equal(validateSignatoryList([first, second]).ok, true);
  assert.equal(validateSignatoryList([]).ok, false);
  assert.equal(validateSignatoryList([first, { ...first }]).ok, false);
  assert.equal(
    validateSignatoryList([first, { ...second, signOrder: 3 }]).ok,
    false,
  );
});

test("clampBox keeps a field inside the page", () => {
  const box = clampBox({ x: -0.5, y: 0.9, width: 0.8, height: 0.4, pageNumber: 2 });
  assert.equal(box.x, 0);
  assert.equal(box.y, 0.6);
  assert.equal(box.width, 0.8);
  assert.equal(box.height, 0.4);
  assert.equal(box.pageNumber, 2);
  assert.equal(box.x + box.width <= 1, true);
  assert.equal(box.y + box.height <= 1, true);

  const tiny = clampBox({ x: 0, y: 0, width: 0, height: 0 });
  assert.equal(tiny.width, 0.2);
  assert.equal(tiny.height, 0.05);
});

test("sequential mode waits for earlier signers; parallel does not", () => {
  const signatories = [
    { signOrder: 1, status: "pending" },
    { signOrder: 2, status: "pending" },
  ];

  const sequential = canSignNow({
    signingMode: "sequential",
    signOrder: 2,
    signatories,
    documentStatus: "pending",
    signatoryStatus: "pending",
    hasSignature: true,
  });
  assert.equal(sequential.ok, false);
  assert.match(sequential.reason, /earlier/i);

  const parallel = canSignNow({
    signingMode: "parallel",
    signOrder: 2,
    signatories,
    documentStatus: "pending",
    signatoryStatus: "pending",
    hasSignature: true,
  });
  assert.equal(parallel.ok, true);

  const afterFirst = canSignNow({
    signingMode: "sequential",
    signOrder: 2,
    signatories: [
      { signOrder: 1, status: "signed" },
      { signOrder: 2, status: "pending" },
    ],
    documentStatus: "in_progress",
    signatoryStatus: "pending",
    hasSignature: true,
  });
  assert.equal(afterFirst.ok, true);
});

test("a missing signature blocks approval at the UI boundary", () => {
  const result = canSignNow({
    signingMode: "parallel",
    signOrder: 1,
    signatories: [],
    documentStatus: "pending",
    signatoryStatus: "pending",
    hasSignature: false,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /upload your signature/i);
});

test("closed or already-signed requests cannot be signed", () => {
  for (const documentStatus of ["completed", "declined", "void", "draft"]) {
    const result = canSignNow({
      signingMode: "parallel",
      signOrder: 1,
      signatories: [],
      documentStatus,
      signatoryStatus: "pending",
      hasSignature: true,
    });
    assert.equal(result.ok, false);
  }

  const signed = canSignNow({
    signingMode: "parallel",
    signOrder: 1,
    signatories: [],
    documentStatus: "in_progress",
    signatoryStatus: "signed",
    hasSignature: true,
  });
  assert.equal(signed.ok, false);
  assert.match(signed.reason, /already signed/i);
});

test("search input is escaped for PostgREST ilike", () => {
  assert.equal(escapeLike("100%_done\\"), "100\\%\\_done\\\\");
  assert.equal(escapeLike("plain title"), "plain title");
  assert.equal(escapeLike(null), "");
});

test("progress, percentages and byte sizes have stable shapes", () => {
  assert.deepEqual(
    documentProgress([
      { status: "signed" },
      { status: "pending" },
      { status: "pending" },
    ]),
    { total: 3, signed: 1, remaining: 2, percent: 33 },
  );
  assert.deepEqual(documentProgress([]), {
    total: 0,
    signed: 0,
    remaining: 0,
    percent: 0,
  });

  assert.equal(percent(0.956), "95.6%");
  assert.equal(percent(1), "100%");
  assert.equal(percent("nope"), "0%");

  assert.equal(formatBytes(500), "500 B");
  assert.equal(formatBytes(2048), "2 KB");
  assert.equal(formatBytes(1.5 * 1024 * 1024), "1.5 MB");
  assert.equal(formatBytes(null), "Not recorded");
});

test("date helpers never show invalid dates", () => {
  assert.equal(formatDate(null), "Not recorded");
  assert.equal(formatDate("not-a-date"), "Not recorded");
});

test("uuid and clamp helpers are strict", () => {
  assert.equal(isUuid("8f1c1f9e-3e2a-4a9d-9a1e-2b3c4d5e6f70"), true);
  assert.equal(isUuid("not-a-uuid"), false);
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(clamp(-1, 0, 1), 0);
});
