import { getSessionPersistence, setSessionPersistence } from "./authStorage.js";

// Keep the Supabase SDK out of the first public-page bundle.
export async function getSupabase() {
  const { supabase } = await import("../../lib/supabase/client.js");
  return supabase;
}

// Raw errors never reach the screen — they are mapped to friendly sentences.
function mapLoginError(error) {
  const message = String(error?.message ?? "");
  if (message.includes("Invalid login credentials")) {
    return new Error("Incorrect email or password.");
  }
  if (message.includes("Email not confirmed")) {
    return new Error("Confirm your email address first — check your inbox.");
  }
  if (message.toLowerCase().includes("rate limit") || message.includes("Too many")) {
    return new Error("Too many attempts. Wait a minute and try again.");
  }
  return new Error("Couldn't sign in. Check your connection and try again.");
}

export async function login({ email, password, remember = false }) {
  const supabase = await getSupabase();
  const previousPersistence = getSessionPersistence();
  setSessionPersistence(remember);
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw mapLoginError(error);
  } catch (error) {
    setSessionPersistence(previousPersistence);
    throw error;
  }
}

export async function logout() {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// The signed-in user's own profile (the database returns only this row).
export async function getMyProfile(userId, signal) {
  const supabase = await getSupabase();
  let request = supabase
    .from("profiles")
    .select(
      "id, full_name, role, department, position, signature_path, signature_updated_at, avatar_url, is_active",
    )
    .eq("user_id", userId);
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request.maybeSingle();
  if (error) {
    if (error.code === "42501") {
      throw new Error(
        "Your account can't read its profile. Contact an administrator.",
      );
    }
    if (["PGRST205", "42P01"].includes(error.code)) {
      throw new Error(
        "The profile table isn't set up yet. Apply the E-Docs database migration.",
      );
    }
    throw new Error("Couldn't load your profile. Check your connection and try again.");
  }
  if (!data) throw new Error("No profile is linked to this account.");
  return data;
}
