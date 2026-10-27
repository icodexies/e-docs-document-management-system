import { getSupabase } from "../auth/authService.js";
import { escapeLike } from "../documents/documentRules.js";
import { pageCountFromTotal } from "../pagination.js";

function mapProfileError(error, fallback = "Couldn't save your profile. Try again.") {
  if (error?.code === "42501") {
    return new Error(error.message || "Your account can't change this.");
  }
  if (error?.code === "P0001" || error?.code === "23514") {
    return new Error(error.message || fallback);
  }
  if (error?.code === "PGRST202") {
    return new Error("The E-Docs database migration hasn't been applied.");
  }
  if (["PGRST205", "42P01"].includes(error?.code)) {
    return new Error("This feature needs database setup. Contact an administrator.");
  }
  return new Error(fallback);
}

export async function updateMyProfile({ fullName, department, position }) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("update_my_profile", {
    p_full_name: String(fullName ?? "").trim(),
    p_department: String(department ?? "").trim(),
    p_position: String(position ?? "").trim(),
  });
  if (error) throw mapProfileError(error);
  return data;
}

export async function setMyAvatar(url) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("set_my_avatar", {
    p_url: String(url ?? ""),
  });
  if (error) {
    throw mapProfileError(error, "Couldn't save the profile photo.");
  }
  return data?.avatar_url ?? null;
}

export async function uploadMyAvatar({ userId, file }) {
  if (!userId) throw new Error("Please log in again.");
  if (!file) throw new Error("Choose a profile photo.");

  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(String(file.type ?? "").toLowerCase())) {
    throw new Error("Choose a PNG, JPG or WebP image.");
  }
  if (!Number.isFinite(Number(file.size)) || file.size <= 0) {
    throw new Error("That image is empty or unreadable.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Keep the profile photo under 2 MB.");
  }

  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const supabase = await getSupabase();

  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    throw mapProfileError(error, "Couldn't upload the profile photo.");
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export async function uploadSignature({ userId, blob }) {
  if (!userId) throw new Error("Please log in again.");
  const supabase = await getSupabase();
  const path = `${userId}/signature-${Date.now()}.png`;

  const { error: uploadError } = await supabase.storage
    .from("signatures")
    .upload(path, blob, {
      contentType: "image/png",
      upsert: false,
      cacheControl: "0",
    });
  if (uploadError) {
    throw mapProfileError(uploadError, "Couldn't upload the signature. Try again.");
  }

  const { data, error } = await supabase.rpc("set_my_signature", { p_path: path });
  if (error) {
    await supabase.storage.from("signatures").remove([path]);
    throw mapProfileError(error, "Couldn't save the signature. Try again.");
  }
  return { path, data };
}

export async function removeSignatureObject(path) {
  if (!path) return;
  try {
    const supabase = await getSupabase();
    await supabase.storage.from("signatures").remove([path]);
  } catch {
    // The old file is harmless if cleanup fails; it is private and no longer
    // referenced by the profile.
  }
}

export async function getSignatureUrl(path, expiresIn = 3600) {
  if (!path) return null;
  const supabase = await getSupabase();
  const { data, error } = await supabase.storage
    .from("signatures")
    .createSignedUrl(path, expiresIn);
  if (error) throw new Error("Couldn't open your signature image.");
  return data?.signedUrl ?? null;
}

export async function adminListProfiles({ page = 1, search = "", pageSize = 10 } = {}, signal) {
  const supabase = await getSupabase();
  const from = (Math.max(1, page) - 1) * pageSize;
  const to = from + pageSize;

  let request = supabase
    .from("profiles")
    .select(
      "id,full_name,role,department,position,signature_path,signature_updated_at,avatar_url,is_active,created_at",
      { count: "exact" },
    )
    .order("full_name", { ascending: true })
    .range(from, to);

  if (search.trim()) {
    request = request.ilike("full_name", `%${escapeLike(search.trim())}%`);
  }
  if (signal) request = request.abortSignal(signal);

  const { data, error, count } = await request;
  if (error) throw mapProfileError(error, "Couldn't load the user list.");
  const rows = data ?? [];
  return {
    items: rows.slice(0, pageSize),
    hasNext: rows.length > pageSize,
    total: count ?? null,
    pageCount: pageCountFromTotal(count, pageSize),
  };
}

export async function adminSetRole(profileId, role) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("admin_set_role", {
    p_profile_id: profileId,
    p_role: role,
  });
  if (error) throw mapProfileError(error);
  return data;
}

export async function adminSetActive(profileId, active) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("admin_set_active", {
    p_profile_id: profileId,
    p_active: active,
  });
  if (error) throw mapProfileError(error);
  return data;
}
