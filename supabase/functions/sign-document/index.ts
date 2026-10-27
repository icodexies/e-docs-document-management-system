// ============================================================================
// E-Docs — sign-document Edge Function
//
// The only place a signature is applied to a PDF. The frontend cannot stamp
// files; it can only ask this function to do it.
//
// Flow:
//   1. Verify the caller's JWT.
//   2. Claim the signature request atomically (checks ownership, order,
//      document status, and that the profile has a signature on file).
//   3. Download the current PDF, verify its SHA-256 against the database.
//   4. Stamp the stored signature image into the detected field.
//   5. If this is the last signer, append a certificate page.
//   6. Upload the new version and record it atomically via complete_signature.
//
// Deploy:
//   supabase functions deploy sign-document
// or create a function named `sign-document` in the dashboard and paste this.
//
// JWT verification is ON by default (verify_jwt = true).
// ============================================================================

import { Buffer } from "node:buffer";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PNG } from "npm:pngjs@7.0.0";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Claim = {
  signatory_id: string;
  document_id: string;
  owner_id: string;
  profile_id: number;
  profile_name: string;
  signature_path: string;
  signing_mode: string;
  remaining: number;
};

type SignerRow = {
  id: string;
  sign_order: number;
  status: string;
  signed_at: string | null;
  signer_name: string;
};

async function sha256Hex(input: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// pdf-lib's standard fonts use WinAnsi. Normalize common typographic
// characters and replace anything still outside the encoding.
function safeText(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

/**
 * Signature images are often a small drawing on a large transparent canvas.
 * Cropping to the visible pixels before embedding makes the ink fill the field
 * instead of appearing as a tiny mark in the middle.
 */
function trimSignaturePng(input: ArrayBuffer | Uint8Array): Uint8Array {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  try {
    const source = PNG.sync.read(Buffer.from(bytes));
    const { width, height, data } = source;
    let hasTransparency = false;
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] < 250) {
        hasTransparency = true;
        break;
      }
    }

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        const ink = hasTransparency
          ? data[index + 3] > 12
          : data[index] < 245 || data[index + 1] < 245 || data[index + 2] < 245;
        if (!ink) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < minX || maxY < minY) return bytes;

    const padding = 8;
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropWidth = Math.min(width - cropX, maxX - minX + 1 + padding * 2);
    const cropHeight = Math.min(height - cropY, maxY - minY + 1 + padding * 2);

    if (
      cropX === 0 &&
      cropY === 0 &&
      cropWidth === width &&
      cropHeight === height
    ) {
      return bytes;
    }

    const cropped = new PNG({ width: cropWidth, height: cropHeight });
    for (let y = 0; y < cropHeight; y += 1) {
      const sourceStart = ((cropY + y) * width + cropX) * 4;
      const targetStart = y * cropWidth * 4;
      cropped.data.set(
        data.subarray(sourceStart, sourceStart + cropWidth * 4),
        targetStart,
      );
    }

    const result = new Uint8Array(PNG.sync.write(cropped));
    console.log("signature image trimmed", {
      from: `${width}x${height}`,
      to: `${cropWidth}x${cropHeight}`,
    });
    return result;
  } catch (error) {
    console.error("signature trim failed; using original image", error);
    return bytes;
  }
}

function wrapText(
  text: string,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  size: number,
  maxWidth: number,
): string[] {
  const words = safeText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

function signerName(row: SignerRow): string {
  return row.signer_name || "Unknown signer";
}

async function appendCertificate(
  pdfDoc: PDFDocument,
  doc: { id: string; title: string; original_sha256: string | null },
  signers: SignerRow[],
  currentSignatoryId: string,
  completedAt: string,
) {
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.043, 0.075, 0.188);
  const muted = rgb(0.35, 0.38, 0.45);
  const line = rgb(0.82, 0.84, 0.88);
  const left = 56;
  const right = 595.28 - 56;
  const width = right - left;
  let y = 780;

  page.drawText("E-DOCS", { x: left, y, size: 10, font: bold, color: muted });
  y -= 30;
  page.drawText("Certificate of Electronic Signature", {
    x: left,
    y,
    size: 20,
    font: bold,
    color: ink,
  });
  y -= 14;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: line });
  y -= 30;

  const titleLines = wrapText(doc.title, bold, 13, width);
  for (const titleLine of titleLines) {
    page.drawText(titleLine, { x: left, y, size: 13, font: bold, color: ink });
    y -= 18;
  }

  y -= 4;
  page.drawText(`Document ID: ${doc.id}`, { x: left, y, size: 9, font, color: muted });
  y -= 14;
  const originalHash = doc.original_sha256 ?? "not recorded";
  for (const hashLine of wrapText(`Original SHA-256: ${originalHash}`, font, 9, width)) {
    page.drawText(hashLine, { x: left, y, size: 9, font, color: muted });
    y -= 13;
  }

  y -= 18;
  page.drawText("Signatories", { x: left, y, size: 12, font: bold, color: ink });
  y -= 18;

  for (const signer of signers) {
    const isCurrent = signer.id === currentSignatoryId;
    const name = signerName(signer);
    const status = isCurrent ? "signed" : signer.status;
    const signedAt = signer.signed_at ?? (isCurrent ? completedAt : null);
    const timestamp = signedAt ? new Date(signedAt).toISOString() : "not signed";

    page.drawText(`${signer.sign_order}.`, { x: left, y, size: 10, font, color: muted });
    page.drawText(safeText(name), { x: left + 22, y, size: 10, font: bold, color: ink });
    page.drawText(safeText(`${status} - ${timestamp}`), {
      x: left + 22,
      y: y - 13,
      size: 8.5,
      font,
      color: muted,
    });
    y -= 30;

    if (y < 140) break;
  }

  y = 120;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: line });
  y -= 18;
  const note = wrapText(
    "This certificate is generated automatically by E-Docs after the final signature. " +
      "The signed PDF and its SHA-256 hash are recorded in the E-Docs audit trail. " +
      "Verify the file against that record before relying on a printed copy.",
    font,
    8.5,
    width,
  );
  for (const noteLine of note) {
    page.drawText(noteLine, { x: left, y, size: 8.5, font, color: muted });
    y -= 12;
  }

  page.drawText(`Completed: ${new Date(completedAt).toISOString()}`, {
    x: left,
    y: 60,
    size: 8.5,
    font,
    color: muted,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error("missing Supabase runtime secrets");
    return json({ error: "The signing service is not configured." }, 500);
  }

  // 1) Verify the caller's JWT.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Please log in." }, 401);
  }

  const asCaller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: authError,
  } = await asCaller.auth.getUser();
  if (authError || !user) return json({ error: "Please log in again." }, 401);

  // 2) Validate the body before doing any work.
  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 4096) return json({ error: "Request is too large." }, 413);
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return json({ error: "Invalid request." }, 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const signatoryId = String(body.signatory_id ?? "").trim();
  if (!UUID_RE.test(signatoryId)) {
    return json({ error: "Invalid signature request." }, 400);
  }

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const release = async () => {
    const { error } = await service.rpc("release_signature_claim", {
      p_signatory_id: signatoryId,
    });
    if (error) console.error("release_signature_claim failed", error);
  };

  // 3) Atomically claim the request.
  const { data: claimData, error: claimError } = await service.rpc("claim_signature", {
    p_signatory_id: signatoryId,
    p_user_id: user.id,
  });

  if (claimError) {
    console.error("claim_signature failed", claimError);
    if (claimError.code === "ED001") {
      return json(
        {
          error: "Upload your signature before approving this document.",
          code: "SIGNATURE_REQUIRED",
        },
        409,
      );
    }
    if (claimError.code === "55000") {
      return json({ error: claimError.message || "This signature can't be processed yet." }, 409);
    }
    if (claimError.code === "42501") {
      return json({ error: "This signature request is not yours." }, 403);
    }
    return json({ error: "Couldn't start signing. Try again." }, 400);
  }

  const claim = claimData as Claim;
  let uploadedPath: string | null = null;
  let finalized = false;

  try {
    // 4) Load the rows the claim points at.
    const { data: signatory, error: signatoryError } = await service
      .from("document_signatories")
      .select("id, document_id, profile_id, page_number, x, y, width, height, status, sign_order")
      .eq("id", claim.signatory_id)
      .single();
    if (signatoryError || !signatory) {
      console.error("signatory lookup failed", signatoryError);
      await release();
      return json({ error: "Signature request not found." }, 404);
    }

    const { data: doc, error: docError } = await service
      .from("documents")
      .select(
        "id, owner_id, title, original_path, original_sha256, page_count, current_version, status, signing_mode",
      )
      .eq("id", claim.document_id)
      .single();
    if (docError || !doc) {
      console.error("document lookup failed", docError);
      await release();
      return json({ error: "Document not found." }, 404);
    }

    if (!["pending", "in_progress"].includes(doc.status)) {
      await release();
      return json({ error: "This document is not open for signing." }, 409);
    }

    const { data: latestVersion } = await service
      .from("document_versions")
      .select("version_number, storage_path, sha256")
      .eq("document_id", doc.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sourceBucket = latestVersion ? "signed-documents" : "documents";
    const sourcePath = latestVersion ? latestVersion.storage_path : doc.original_path;
    const expectedHash = latestVersion ? latestVersion.sha256 : doc.original_sha256;

    if (!sourcePath || !expectedHash) {
      await release();
      return json({ error: "The document file is not ready. Ask the owner to re-upload it." }, 409);
    }

    // 5) Verify the file has not changed since it was recorded.
    const { data: sourceBlob, error: sourceError } = await service.storage
      .from(sourceBucket)
      .download(sourcePath);
    if (sourceError || !sourceBlob) {
      console.error("source download failed", sourceError);
      await release();
      return json({ error: "Couldn't read the document file. Try again." }, 500);
    }

    const sourceBytes = await sourceBlob.arrayBuffer();
    const actualHash = await sha256Hex(sourceBytes);
    if (actualHash !== String(expectedHash).toLowerCase()) {
      console.error("document hash mismatch", {
        document_id: doc.id,
        expected: expectedHash,
        actual: actualHash,
      });
      await release();
      return json(
        { error: "The document file changed after it was sent. Ask the owner to re-upload it." },
        409,
      );
    }

    // 6) Read the signer's stored signature.
    const { data: signatureBlob, error: signatureError } = await service.storage
      .from("signatures")
      .download(claim.signature_path);
    if (signatureError || !signatureBlob) {
      console.error("signature download failed", signatureError);
      await release();
      return json(
        { error: "Your signature file is missing. Upload it again in your profile." },
        409,
      );
    }

    // 7) Stamp the PDF.
    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(sourceBytes);
    } catch (error) {
      console.error("pdf load failed", error);
      await release();
      return json(
        { error: "This PDF can't be signed. It may be encrypted or damaged." },
        422,
      );
    }

    const pages = pdfDoc.getPages();
    const pageIndex = Number(signatory.page_number) - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) {
      await release();
      return json({ error: "The signature field points at a missing page." }, 422);
    }

    const page = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const boxX = Number(signatory.x) * pageWidth;
    const boxTop = Number(signatory.y) * pageHeight;
    const boxW = Number(signatory.width) * pageWidth;
    const boxH = Number(signatory.height) * pageHeight;
    const boxY = pageHeight - boxTop - boxH;

    if (!Number.isFinite(boxX + boxY + boxW + boxH) || boxW <= 0 || boxH <= 0) {
      await release();
      return json({ error: "The signature field is invalid. Ask the owner to fix it." }, 422);
    }

    let signatureImage;
    try {
      const signatureBytes = trimSignaturePng(
        await signatureBlob.arrayBuffer(),
      );
      signatureImage = await pdfDoc.embedPng(signatureBytes);
    } catch (error) {
      console.error("signature embed failed", error);
      await release();
      return json(
        { error: "Your signature image couldn't be read. Upload it again in your profile." },
        422,
      );
    }

    const scale = Math.min(boxW / signatureImage.width, boxH / signatureImage.height);
    const drawWidth = signatureImage.width * scale;
    const drawHeight = signatureImage.height * scale;

    page.drawImage(signatureImage, {
      x: boxX + (boxW - drawWidth) / 2,
      y: boxY + (boxH - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });

    // 8) On the final signature, append the completion certificate.
    const completed = Number(claim.remaining) === 0;
    if (completed) {
      const { data: signers, error: signersError } = await service
        .from("document_signatories")
        .select("id, sign_order, status, signed_at, signer_name")
        .eq("document_id", doc.id)
        .order("sign_order");
      if (signersError) {
        console.error("signers lookup failed", signersError);
        await release();
        return json({ error: "Couldn't build the completion certificate. Try again." }, 500);
      }
      await appendCertificate(
        pdfDoc,
        { id: doc.id, title: doc.title, original_sha256: doc.original_sha256 },
        (signers ?? []) as SignerRow[],
        signatory.id,
        new Date().toISOString(),
      );
    }

    // 9) Upload the new version.
    const pdfBytes = await pdfDoc.save();
    const newHash = await sha256Hex(pdfBytes);
    const version = (latestVersion?.version_number ?? 0) + 1;
    const newPath = `${doc.owner_id}/${doc.id}/v${version}.pdf`;

    const { error: uploadError } = await service.storage
      .from("signed-documents")
      .upload(newPath, new Blob([pdfBytes], { type: "application/pdf" }), {
        contentType: "application/pdf",
        // A failed run may leave an orphan at this version path; overwriting
        // it is safe because no document_versions row points there yet.
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("signed upload failed", uploadError);
      await release();
      return json({ error: "Couldn't save the signed file. Try again." }, 500);
    }
    uploadedPath = newPath;

    // 10) Record the signature atomically.
    const forwarded = req.headers.get("x-forwarded-for") ?? "";
    const clientIp = forwarded.split(",")[0].trim().slice(0, 64) || "unknown";
    const userAgent = (req.headers.get("user-agent") ?? "unknown").slice(0, 300);

    const { data: completion, error: completionError } = await service.rpc(
      "complete_signature",
      {
        p_signatory_id: signatory.id,
        p_version: version,
        p_storage_path: newPath,
        p_sha256: newHash,
        p_completed: completed,
        p_detail: {
          ip: clientIp,
          user_agent: userAgent,
        },
      },
    );

    if (completionError) {
      console.error("complete_signature failed", completionError);
      await service.storage.from("signed-documents").remove([newPath]);
      uploadedPath = null;
      await release();
      return json(
        {
          error:
            completionError.code === "23505"
              ? "This document changed while signing. Try again."
              : completionError.message || "Couldn't record the signature. Try again.",
        },
        409,
      );
    }

    finalized = true;

    return json({
      ok: true,
      document_id: doc.id,
      version,
      completed: (completion as { completed?: boolean } | null)?.completed ?? completed,
    });
  } catch (error) {
    console.error("sign-document failed", error);
    if (uploadedPath) {
      await service.storage.from("signed-documents").remove([uploadedPath]);
    }
    if (!finalized) await release();
    return json({ error: "Couldn't sign the document. Try again." }, 500);
  }
});
