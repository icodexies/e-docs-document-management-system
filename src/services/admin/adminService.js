import { getSupabase } from "../auth/authService.js";
import { validateNewUser } from "./adminRules.js";

/**
 * Admin-only account creation. The `admin-create-user` Edge Function holds the
 * service role key on the server; the browser only sends the form.
 */
export async function adminCreateUser(draft) {
  const checked = validateNewUser(draft);
  if (!checked.ok) throw new Error(checked.error);

  const supabase = await getSupabase();
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: {
      email: checked.value.email,
      password: checked.value.password,
      full_name: checked.value.fullName,
      department: checked.value.department,
      position: checked.value.position,
      role: checked.value.role,
    },
  });

  if (error) {
    let payload = null;
    try {
      payload = await error.context?.json();
    } catch {
      // Non-JSON error body: use the generic message below.
    }

    const status = error.context?.status ?? 0;
    let message = payload?.error;
    if (!message) {
      if (status === 404) {
        message =
          "The account creation service isn't deployed yet. Deploy admin-create-user.";
      } else if (status === 401) {
        message = "Please log in again.";
      } else if (status === 403) {
        message = "Admin access required.";
      } else {
        message = "Couldn't create the account. Try again.";
      }
    }

    const next = new Error(message);
    next.status = status;
    throw next;
  }

  if (data?.error) throw new Error(data.error);
  return data;
}
