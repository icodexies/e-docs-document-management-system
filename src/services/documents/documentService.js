import { getSupabase } from "../auth/authService.js";
import {
  buildDashboardMetrics,
  buildDashboardPeriod,
} from "../dashboardMetrics.js";
import { pageCountFromTotal } from "../pagination.js";
import {
  MAX_DOCUMENT_PAGES,
  SIGNING_MODES,
  canSignNow,
  escapeLike,
  validateDocumentTitle,
  validateSignatoryList,
} from "./documentRules.js";

const LIST_SELECT =
  "id,title,status,signing_mode,current_version,page_count,created_at,updated_at,completed_at,document_signatories(status,viewed_at)";

const DETAIL_SELECT = [
  "id",
  "owner_id",
  "owner_name",
  "title",
  "status",
  "signing_mode",
  "current_version",
  "page_count",
  "file_name",
  "file_size",
  "original_path",
  "original_sha256",
  "created_at",
  "updated_at",
  "completed_at",
  "document_signatories(id,profile_id,signer_name,signer_department,signer_position,detected_name,match_score,page_number,x,y,width,height,sign_order,status,viewed_at,signed_at,decline_reason)",
  "document_versions(id,version_number,storage_path,sha256,created_by_name,created_at)",
  "document_events(id,action,detail,actor_name,created_at)",
].join(",");

const SIGNING_SELECT = [
  "id",
  "document_id",
  "profile_id",
  "signer_name",
  "signer_department",
  "signer_position",
  "detected_name",
  "match_score",
  "page_number",
  "x",
  "y",
  "width",
  "height",
  "sign_order",
  "status",
  "viewed_at",
  "signed_at",
  "decline_reason",
  "document:documents(id,owner_id,owner_name,title,status,signing_mode,current_version,page_count,original_path,original_sha256,document_versions(version_number,storage_path,sha256))",
].join(",");

function mapReadError(error) {
  if (error?.name === "AbortError") return error;
  if (error?.code === "42501") {
    return new Error("Your account can't read this document.");
  }
  if (error?.code === "PGRST202") {
    return new Error("The E-Docs database migration hasn't been applied.");
  }
  if (["PGRST205", "42P01"].includes(error?.code)) {
    return new Error("The E-Docs database migration hasn't been applied.");
  }
  return new Error("Couldn't load the document. Check your connection and try again.");
}

function mapWriteError(error, fallback = "Couldn't save the change. Try again.") {
  if (error?.name === "AbortError") return error;
  if (error?.code === "42501") {
    return new Error(error.message || "Your account can't change this document.");
  }
  if (error?.code === "P0001" || error?.code === "55000") {
    return new Error(error.message || fallback);
  }
  if (error?.code === "23505") {
    return new Error("The same person or signing order is listed twice.");
  }
  if (error?.code === "23514") {
    return new Error("One of the signature fields is invalid. Check the box and try again.");
  }
  if (error?.code === "PGRST202") {
    return new Error("The E-Docs database migration hasn't been applied.");
  }
  if (["PGRST205", "42P01"].includes(error?.code)) {
    return new Error("This feature needs database setup. Contact an administrator.");
  }
  return new Error(fallback);
}

function assertPageCount(pageCount) {
  const number = Number(pageCount);
  if (!Number.isInteger(number) || number < 1 || number > MAX_DOCUMENT_PAGES) {
    throw new Error(`A document must have between 1 and ${MAX_DOCUMENT_PAGES} pages.`);
  }
  return number;
}

export async function createDocumentDraft({ title, pageCount, signingMode }) {
  const checked = validateDocumentTitle(title);
  if (!checked.ok) throw new Error(checked.error);
  if (!SIGNING_MODES.includes(signingMode)) {
    throw new Error("Choose a valid signing mode.");
  }
  const pages = assertPageCount(pageCount);

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      title: checked.value,
      page_count: pages,
      signing_mode: signingMode,
    })
    .select("id,title,status,created_at")
    .single();
  if (error) throw mapWriteError(error, "Couldn't create the document.");
  return data;
}

export async function uploadOriginal({
  documentId,
  userId,
  file,
  sha256,
  pageCount,
}) {
  if (!documentId || !userId) throw new Error("Please log in again.");
  if (!/^[0-9a-f]{64}$/.test(String(sha256 ?? ""))) {
    throw new Error("Couldn't verify the PDF's fingerprint.");
  }
  const pages = assertPageCount(pageCount);

  const supabase = await getSupabase();
  const path = `${userId}/${documentId}/original.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, {
      contentType: "application/pdf",
      upsert: true,
      cacheControl: "3600",
    });
  if (uploadError) {
    throw mapWriteError(uploadError, "Couldn't upload the PDF. Try again.");
  }

  const { data: updated, error: updateError } = await supabase
    .from("documents")
    .update({
      original_path: path,
      original_sha256: sha256,
      file_name: file.name,
      file_size: file.size,
      page_count: pages,
    })
    .eq("id", documentId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (updateError) {
    try {
      await supabase.storage.from("documents").remove([path]);
    } catch {
      // The private orphan is harmless; report the real failure.
    }
    throw mapWriteError(updateError, "Couldn't record the uploaded PDF.");
  }
  if (!updated) {
    try {
      await supabase.storage.from("documents").remove([path]);
    } catch {
      // The draft lock is the important part; the file is still private.
    }
    throw new Error("This draft is no longer editable.");
  }

  return { path, sha256 };
}

export async function addDocumentSignatories(documentId, signatories) {
  const ordered = (signatories ?? []).map((signatory, index) => ({
    ...signatory,
    signOrder: index + 1,
  }));
  const checked = validateSignatoryList(ordered);
  if (!checked.ok) throw new Error(checked.error);

  const rows = checked.value.map((signatory, index) => ({
    document_id: documentId,
    profile_id: signatory.profileId,
    signer_name: signatory.fullName,
    signer_department: signatory.department ?? "",
    signer_position: signatory.position ?? "",
    detected_name: signatory.detectedName,
    match_score: signatory.score,
    page_number: signatory.pageNumber,
    x: signatory.x,
    y: signatory.y,
    width: signatory.width,
    height: signatory.height,
    sign_order: index + 1,
  }));

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("document_signatories")
    .insert(rows)
    .select("id");
  if (error) throw mapWriteError(error, "Couldn't add the signatories.");
  return data ?? [];
}

export async function finalizeDocument(documentId) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("finalize_document", {
    p_document_id: documentId,
  });
  if (error) throw mapWriteError(error, "Couldn't send this document.");
  return data;
}

export async function deleteDraft(documentId, originalPath) {
  const supabase = await getSupabase();
  if (originalPath) {
    try {
      await supabase.storage.from("documents").remove([originalPath]);
    } catch {
      // The private orphan is harmless; the row still needs to go.
    }
  }

  const { data, error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error) throw mapWriteError(error, "Couldn't delete this draft.");
  if (!data) throw new Error("Only an unsent draft can be deleted.");
}

export async function getMyDocuments(
  { userId, page = 1, status = "all", search = "", pageSize = 12 } = {},
  signal,
) {
  const supabase = await getSupabase();
  const from = (Math.max(1, page) - 1) * pageSize;
  const to = from + pageSize;

  let request = supabase
    .from("documents")
    .select(LIST_SELECT, { count: "exact" })
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (status && status !== "all") {
    request = request.eq("status", status);
  }
  if (search.trim()) {
    request = request.ilike("title", `%${escapeLike(search.trim())}%`);
  }
  if (signal) request = request.abortSignal(signal);

  const { data, error, count } = await request;
  if (error) throw mapReadError(error);
  const rows = data ?? [];
  return {
    items: rows.slice(0, pageSize),
    hasNext: rows.length > pageSize,
    total: count ?? null,
    pageCount: pageCountFromTotal(count, pageSize),
  };
}

export async function getDocument(documentId, signal) {
  const supabase = await getSupabase();
  let request = supabase
    .from("documents")
    .select(DETAIL_SELECT)
    .eq("id", documentId)
    .order("sign_order", {
      referencedTable: "document_signatories",
      ascending: true,
    })
    .order("version_number", {
      referencedTable: "document_versions",
      ascending: false,
    })
    .order("created_at", {
      referencedTable: "document_events",
      ascending: true,
    })
    .maybeSingle();
  if (signal) request = request.abortSignal(signal);

  const { data, error } = await request;
  if (error) throw mapReadError(error);
  if (!data) {
    throw new Error("Document not found, or your account doesn't have access.");
  }
  return data;
}

export async function getDocumentFileUrl(
  document,
  { expiresIn = 3600, original = false } = {},
) {
  if (!document) return null;

  const versions = Array.isArray(document.document_versions)
    ? document.document_versions
    : [];
  const latest = versions.reduce(
    (best, version) =>
      !best || Number(version.version_number) > Number(best.version_number)
        ? version
        : best,
    null,
  );

  const bucket = original || !latest ? "documents" : "signed-documents";
  const path = original || !latest ? document.original_path : latest.storage_path;
  if (!path) return null;

  const supabase = await getSupabase();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) {
    throw new Error("Couldn't open the document file. Try again.");
  }

  return {
    url: data?.signedUrl ?? null,
    bucket,
    path,
    version: original || !latest ? 0 : Number(latest.version_number),
    sha256: original || !latest ? document.original_sha256 : latest.sha256,
  };
}

export async function listAwaitingSignatures(
  { profileId, page = 1, pageSize = 12 } = {},
  signal,
) {
  const supabase = await getSupabase();
  const from = (Math.max(1, page) - 1) * pageSize;
  const to = from + pageSize;

  let request = supabase
    .from("document_signatories")
    .select(
      "id,status,sign_order,viewed_at,signed_at,created_at,document:documents!inner(id,title,status,page_count,created_at,owner_name)",
      { count: "exact" },
    )
    .eq("profile_id", profileId)
    .in("status", ["pending", "viewed", "signing"])
    .in("document.status", ["pending", "in_progress"])
    .order("created_at", { ascending: false })
    .range(from, to);
  if (signal) request = request.abortSignal(signal);

  const { data, error, count } = await request;
  if (error) throw mapReadError(error);
  const rows = data ?? [];
  return {
    items: rows.slice(0, pageSize),
    hasNext: rows.length > pageSize,
    total: count ?? null,
    pageCount: pageCountFromTotal(count, pageSize),
  };
}

export async function getSigningContext(signatoryId, profileId, signal) {
  const supabase = await getSupabase();
  let request = supabase
    .from("document_signatories")
    .select(SIGNING_SELECT)
    .eq("id", signatoryId)
    .maybeSingle();
  if (signal) request = request.abortSignal(signal);

  const { data: row, error } = await request;
  if (error) throw mapReadError(error);
  if (!row) {
    throw new Error("This signature request was not found, or it isn't yours.");
  }
  if (String(row.profile_id) !== String(profileId)) {
    throw new Error("This signature request isn't yours.");
  }

  let siblingsRequest = supabase
    .from("document_signatories")
    .select("id,sign_order,status")
    .eq("document_id", row.document_id)
    .order("sign_order", { ascending: true });
  if (signal) siblingsRequest = siblingsRequest.abortSignal(signal);

  let profileRequest = supabase
    .from("profiles")
    .select("signature_path")
    .eq("id", row.profile_id)
    .maybeSingle();
  if (signal) profileRequest = profileRequest.abortSignal(signal);

  const [
    { data: siblings, error: siblingsError },
    { data: profileRow, error: profileError },
  ] = await Promise.all([siblingsRequest, profileRequest]);

  if (siblingsError) throw mapReadError(siblingsError);
  if (profileError) throw mapReadError(profileError);

  const hasSignature = Boolean(profileRow?.signature_path);
  const canApprove = canSignNow({
    signingMode: row.document?.signing_mode,
    signOrder: row.sign_order,
    signatories: siblings ?? [],
    documentStatus: row.document?.status,
    signatoryStatus: row.status,
    hasSignature,
  });

  return {
    signatory: row,
    document: row.document,
    signatories: siblings ?? [],
    signaturePath: profileRow?.signature_path ?? null,
    hasSignature,
    canApprove,
  };
}

export async function markDocumentViewed(signatoryId) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("mark_document_viewed", {
    p_signatory_id: signatoryId,
  });
  if (error) throw mapWriteError(error, "Couldn't update the document status.");
  return data;
}

export async function declineDocument(signatoryId, reason) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("decline_document", {
    p_signatory_id: signatoryId,
    p_reason: String(reason ?? "").trim(),
  });
  if (error) throw mapWriteError(error, "Couldn't decline the document.");
  return data;
}

export async function voidDocument(documentId) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("void_document", {
    p_document_id: documentId,
  });
  if (error) throw mapWriteError(error, "Couldn't void the document.");
  return data;
}

export async function signDocument(signatoryId) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.functions.invoke("sign-document", {
    body: { signatory_id: signatoryId },
  });

  if (error) {
    let payload = null;
    try {
      payload = await error.context?.json();
    } catch {
      // Non-JSON error body: keep the generic message below.
    }
    const status = error.context?.status ?? 0;
    let message = payload?.error;
    if (!message) {
      if (status === 404) {
        message = "The signing service isn't deployed yet. Ask an administrator.";
      } else if (status === 401) {
        message = "Please log in again.";
      } else {
        message = "Couldn't sign the document. Try again.";
      }
    }
    const next = new Error(message);
    next.code = payload?.code ?? "";
    next.status = status;
    throw next;
  }

  if (data?.error) {
    const next = new Error(data.error);
    next.code = data.code ?? "";
    throw next;
  }
  return data;
}

async function runCount(builder) {
  const { count, error } = await builder;
  if (error) throw mapReadError(error);
  return count ?? 0;
}

async function runRows(builder) {
  const { data, error } = await builder;
  if (error) throw mapReadError(error);
  return data ?? [];
}

export async function getDashboardSummary({ userId, profileId }, signal) {
  const supabase = await getSupabase();
  const now = new Date();
  const period = buildDashboardPeriod(now);

  const awaiting = supabase
    .from("document_signatories")
    .select("id,document:documents!inner(status)", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .in("status", ["pending", "viewed", "signing"])
    .in("document.status", ["pending", "in_progress"]);
  const inProgress = supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .in("status", ["pending", "in_progress"]);
  const completed = supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .eq("status", "completed");
  const drafts = supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .eq("status", "draft");
  const activity = supabase
    .from("documents")
    .select(
      "id,status,created_at,completed_at,document_signatories(status,viewed_at,signed_at)",
    )
    .eq("owner_id", userId)
    .gte("created_at", period.start.toISOString())
    .order("created_at", { ascending: true })
    .limit(1000);

  const builders = [awaiting, inProgress, completed, drafts, activity];
  if (signal) {
    for (const builder of builders) builder.abortSignal(signal);
  }

  const [
    awaitingCount,
    inProgressCount,
    completedCount,
    draftCount,
    activityRows,
  ] = await Promise.all([
    runCount(awaiting),
    runCount(inProgress),
    runCount(completed),
    runCount(drafts),
    runRows(activity),
  ]);

  return {
    counts: {
      awaiting: awaitingCount,
      inProgress: inProgressCount,
      completed: completedCount,
      drafts: draftCount,
    },
    metrics: buildDashboardMetrics(activityRows, now),
  };
}
