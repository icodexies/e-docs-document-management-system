// ============================================================================
// E-Docs — admin-create-user Edge Function
//
// The E-Docs equivalent of LIRC's `provision-accounts`: an admin can create a
// login + profile from the Users page. Supabase injects the service role key
// into this function; the browser never receives it.
//
// Flow:
//   1. Verify the caller's JWT.
//   2. Verify the caller is an active admin.
//   3. Validate the new user.
//   4. Create the Auth user with email_confirm: true (or a generated password).
//   5. The on_auth_user_created trigger creates the profile; update its name,
//      department, position and role.
//   6. If the profile update fails, delete the Auth user again.
//
// Deploy:
//   supabase functions deploy admin-create-user
// or create a function named `admin-create-user` in the dashboard and paste
// this file. Keep JWT verification ON.
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ["member", "admin"];
const norm = (value: unknown) =>
  String(value ?? "").trim().replace(/\s+/g, " ");

// No look-alike characters (0/O, 1/l/I).
function generatePassword(length = 14) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("missing Supabase runtime secrets");
    return json({ error: "Account provisioning is not configured." }, 503);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) The caller must be a signed-in, active admin.
  const token = (req.headers.get("Authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return json({ error: "Sign in as an admin first." }, 401);

  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);
  if (authError || !user) return json({ error: "Sign in as an admin first." }, 401);

  const { data: caller, error: callerError } = await admin
    .from("profiles")
    .select("id, role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (callerError) {
    console.error("caller lookup failed", callerError);
    return json({ error: "Couldn't check your access. Try again." }, 500);
  }
  if (!caller || caller.role !== "admin" || !caller.is_active) {
    return json({ error: "Admin access required." }, 403);
  }

  // 2) Validate the body with hard caps before touching Auth.
  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 8192) return json({ error: "Request is too large." }, 413);
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return json({ error: "Invalid request." }, 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const email = norm(body.email).toLowerCase();
  const fullName = norm(body.full_name);
  const department = norm(body.department);
  const position = norm(body.position);
  const role = norm(body.role).toLowerCase() || "member";
  const passwordInput =
    typeof body.password === "string" ? body.password : "";

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: "Enter a valid email address." }, 400);
  }
  if (fullName.length < 2 || fullName.length > 160) {
    return json({ error: "Enter the full name (2–160 characters)." }, 400);
  }
  if (department.length > 120 || position.length > 120) {
    return json(
      { error: "Department and position must be 120 characters or fewer." },
      400,
    );
  }
  if (!ROLES.includes(role)) {
    return json({ error: "Role must be Member or Admin." }, 400);
  }
  if (passwordInput && (passwordInput.length < 8 || passwordInput.length > 72)) {
    return json(
      { error: "The temporary password must be 8–72 characters." },
      400,
    );
  }

  const generated = !passwordInput;
  const password = passwordInput || generatePassword();

  // 3) Create the Auth user. The profile trigger runs on auth.users insert.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    const exists = /already|registered|exists/i.test(createError?.message ?? "");
    if (exists) {
      return json({ error: "An account with this email already exists." }, 409);
    }
    console.error("createUser failed", createError);
    return json({ error: "Couldn't create the account. Try again." }, 500);
  }

  // 4) Update the profile the trigger just created.
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: fullName,
      department,
      position,
      role,
    })
    .eq("user_id", created.user.id)
    .select("id")
    .maybeSingle();

  if (profileError || !profile) {
    console.error("profile update failed", profileError);
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: "Couldn't save the profile. Try again." }, 500);
  }

  return json({
    ok: true,
    user_id: created.user.id,
    profile_id: profile.id,
    email,
    role,
    // Only returned when the server generated it. The admin must hand it over
    // securely; it is never stored by this function.
    ...(generated ? { temporary_password: password } : {}),
  });
});
