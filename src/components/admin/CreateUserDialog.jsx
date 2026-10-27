import { useState } from "react";
import ConfirmDialog from "../ui/ConfirmDialog.jsx";
import { Spinner } from "../ui/Loading.jsx";
import { validateNewUser } from "../../services/admin/adminRules.js";
import { adminCreateUser } from "../../services/admin/adminService.js";

const EMPTY = {
  email: "",
  password: "",
  fullName: "",
  department: "",
  position: "",
  role: "member",
};

const INPUT =
  "w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgba(11,19,48,0.02)] placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none";

export default function CreateUserDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  function change(field) {
    return (event) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function submit() {
    if (busy || created) return;
    setError("");

    const checked = validateNewUser(form);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }

    setBusy(true);
    try {
      const result = await adminCreateUser(checked.value);
      setCreated({
        email: result?.email ?? checked.value.email,
        password: result?.temporary_password ?? checked.value.password,
        role: result?.role ?? checked.value.role,
        fullName: checked.value.fullName,
      });
      onCreated?.(result);
    } catch (nextError) {
      setError(nextError.message || "Couldn't create the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={created ? "Account created" : "Create a user"}
      description={
        created
          ? undefined
          : "Create a login and profile. The person can sign in immediately with the temporary password."
      }
      confirmLabel={created ? "Done" : "Create user"}
      busyLabel="Creating…"
      tone="primary"
      busy={busy}
      onCancel={onClose}
      onConfirm={created ? onClose : submit}
    >
      {created ? (
        <div className="space-y-3">
          <p className="rounded-xl bg-jade-soft px-3.5 py-2.5 text-sm text-jade-deep">
            <strong>{created.fullName}</strong> can now sign in as{" "}
            <strong>{created.email}</strong> ({created.role}).
          </p>

          <div className="rounded-xl border border-slate-200 bg-page px-3.5 py-3">
            <p className="text-[11px] text-slate-500">Temporary password</p>
            <p className="mt-1 break-all font-mono text-sm font-semibold text-ink">
              {created.password || "Generated on the server."}
            </p>
          </div>

          <p className="text-xs text-slate-500">
            Copy it now and share it securely. E-Docs does not store the
            password. Ask the person to change it after their first sign-in.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-slate-600 sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={change("email")}
              maxLength={254}
              autoComplete="off"
              placeholder="person@example.com"
              className={INPUT}
            />
          </label>

          <label className="block text-sm text-slate-600 sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold">Full name</span>
            <input
              value={form.fullName}
              onChange={change("fullName")}
              maxLength={160}
              placeholder="Exactly as printed on documents"
              className={INPUT}
            />
          </label>

          <label className="block text-sm text-slate-600 sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold">
              Temporary password (optional)
            </span>
            <input
              type="text"
              value={form.password}
              onChange={change("password")}
              maxLength={72}
              autoComplete="new-password"
              placeholder="Leave blank to generate one"
              className={INPUT}
            />
          </label>

          <label className="block text-sm text-slate-600">
            <span className="mb-1 block text-xs font-semibold">
              Department (optional)
            </span>
            <input
              value={form.department}
              onChange={change("department")}
              maxLength={120}
              placeholder="e.g. Finance"
              className={INPUT}
            />
          </label>

          <label className="block text-sm text-slate-600">
            <span className="mb-1 block text-xs font-semibold">
              Position (optional)
            </span>
            <input
              value={form.position}
              onChange={change("position")}
              maxLength={120}
              placeholder="e.g. Department Head"
              className={INPUT}
            />
          </label>

          <label className="block text-sm text-slate-600 sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold">Role</span>
            <select
              value={form.role}
              onChange={change("role")}
              className={INPUT}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <p className="text-xs text-slate-500 sm:col-span-2">
            Leave the password blank to generate a strong temporary password.
            It is shown once after the account is created.
          </p>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 sm:col-span-2"
            >
              {error}
            </p>
          )}

          {busy && (
            <span className="inline-flex items-center gap-2 text-xs text-slate-500 sm:col-span-2">
              <Spinner className="h-4 w-4" />
              Creating the Auth user and profile…
            </span>
          )}
        </div>
      )}
    </ConfirmDialog>
  );
}
