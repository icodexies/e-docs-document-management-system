export const USER_ROLES = ["member", "admin"];
export const EMAIL_MAX = 254;
export const FULL_NAME_MAX = 160;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;
export const TEXT_MAX = 120;

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

/** Pure validation for the admin "Add user" form. The Edge Function repeats it. */
export function validateNewUser(draft) {
  const email = normalizeEmail(draft?.email);
  if (!email) return { ok: false, error: "Enter the email address." };
  if (email.length > EMAIL_MAX || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const fullName = String(draft?.fullName ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (fullName.length < 2 || fullName.length > FULL_NAME_MAX) {
    return { ok: false, error: "Enter the full name (2–160 characters)." };
  }

  const password = typeof draft?.password === "string" ? draft.password : "";
  if (password && (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)) {
    return { ok: false, error: "The temporary password must be 8–72 characters." };
  }

  const department = String(draft?.department ?? "").trim();
  const position = String(draft?.position ?? "").trim();
  if (department.length > TEXT_MAX || position.length > TEXT_MAX) {
    return {
      ok: false,
      error: "Department and position must be 120 characters or fewer.",
    };
  }

  const role = String(draft?.role ?? "member").trim().toLowerCase();
  if (!USER_ROLES.includes(role)) {
    return { ok: false, error: "Choose Member or Admin." };
  }

  return {
    ok: true,
    value: { email, password, fullName, department, position, role },
  };
}
