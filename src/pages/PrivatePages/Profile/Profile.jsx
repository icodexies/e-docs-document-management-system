import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Avatar from "../../../components/ui/Avatar.jsx";
import Button from "../../../components/ui/Button.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import { Spinner } from "../../../components/ui/Loading.jsx";
import SignatureUploader from "../../../components/signatures/SignatureUploader.jsx";
import { PROFILE_AVATAR_OPTIONS } from "../../../data/profileAvatars.js";
import { useAuth } from "../../../hooks/auth/useAuth.js";
import { ROLE_LABELS } from "../../../routes/roles.js";
import {
  setMyAvatar,
  updateMyProfile,
  uploadMyAvatar,
} from "../../../services/profile/profileService.js";

const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export default function Profile() {
  const { user, profile, role, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const returnParam = searchParams.get("return");
  const returnTo =
    returnParam && returnParam.startsWith("/") && !returnParam.startsWith("//")
      ? returnParam
      : null;

  const [form, setForm] = useState({
    fullName: profile?.full_name ?? "",
    department: profile?.department ?? "",
    position: profile?.position ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoPending, setPhotoPending] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoSuccess, setPhotoSuccess] = useState("");

  if (!profile || !user) return null;

  async function saveProfile(event) {
    event.preventDefault();
    if (saving) return;
    setFormError("");
    setFormSuccess("");

    const fullName = form.fullName.replace(/\s+/g, " ").trim();
    if (fullName.length < 2 || fullName.length > 160) {
      setFormError("Enter your full name (2–160 characters).");
      return;
    }
    if (form.department.length > 120 || form.position.length > 120) {
      setFormError("Department and position must be 120 characters or fewer.");
      return;
    }

    setSaving(true);
    try {
      await updateMyProfile({
        fullName,
        department: form.department,
        position: form.position,
      });
      refreshProfile();
      setFormSuccess("Profile updated. New documents will match the new name.");
    } catch (error) {
      setFormError(error.message || "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function chooseAvatar(url) {
    if (photoBusy) return;
    setPhotoBusy(true);
    setPhotoPending(url || "default");
    setPhotoError("");
    setPhotoSuccess("");
    try {
      await setMyAvatar(url);
      refreshProfile();
      setPhotoSuccess(
        url ? "Profile photo updated." : "Profile photo removed.",
      );
    } catch (error) {
      setPhotoError(error.message || "Couldn't save the profile photo.");
    } finally {
      setPhotoBusy(false);
      setPhotoPending("");
    }
  }

  async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || photoBusy) return;

    if (!AVATAR_TYPES.includes(String(file.type ?? "").toLowerCase())) {
      setPhotoError("Choose a PNG, JPG or WebP image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setPhotoError("Keep the profile photo under 2 MB.");
      return;
    }

    setPhotoBusy(true);
    setPhotoPending("upload");
    setPhotoError("");
    setPhotoSuccess("");
    try {
      const publicUrl = await uploadMyAvatar({ userId: user.id, file });
      if (!publicUrl) throw new Error("The uploaded photo has no public address.");
      await setMyAvatar(publicUrl);
      refreshProfile();
      setPhotoSuccess("Profile photo updated.");
    } catch (error) {
      setPhotoError(error.message || "Couldn't upload the profile photo.");
    } finally {
      setPhotoBusy(false);
      setPhotoPending("");
    }
  }

  const hasSignature = Boolean(profile.signature_path);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Profile"
        title={profile.full_name}
        description={
          [profile.position, profile.department].filter(Boolean).join(" · ") ||
          "Your name and signature are used for document routing."
        }
        actions={
          returnTo ? (
            <Button to={returnTo} variant="secondary">
              Back to the document
            </Button>
          ) : null
        }
      >
        <span className="rounded-full border border-slate-300 bg-surface px-3 py-1.5 text-[11px] font-semibold text-slate-600">
          {ROLE_LABELS[role] ?? role}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
            hasSignature
              ? "border-jade-line bg-jade-soft text-jade-deep"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              hasSignature ? "bg-jade" : "bg-amber-500"
            }`}
          />
          {hasSignature ? "Signature on file" : "Signature needed"}
        </span>
      </PageHeader>

      <section className="rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar
            name={profile.full_name}
            src={profile.avatar_url}
            size="xl"
            className="ring-white"
          />
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
              Profile photo
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Use a profile photo so colleagues can recognize you. Without one,
              the E-Docs default avatar is shown.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-deep ${
                  photoBusy ? "pointer-events-none opacity-60" : ""
                }`}
              >
                {photoBusy && photoPending === "upload" ? (
                  <>
                    <Spinner className="h-4 w-4 border-white/40 border-t-white" />
                    Uploading…
                  </>
                ) : (
                  "Upload photo"
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={photoBusy}
                  onChange={uploadAvatar}
                />
              </label>

              {profile.avatar_url && (
                <button
                  type="button"
                  onClick={() => chooseAvatar("")}
                  disabled={photoBusy}
                  className="rounded-xl border border-slate-300 bg-surface px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-page disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {photoBusy && photoPending === "default"
                    ? "Removing…"
                    : "Remove photo"}
                </button>
              )}
            </div>

            <p className="mt-2 text-[11px] text-slate-500">
              PNG, JPG or WebP up to 2 MB. The photo appears in your header
              and the account directory.
            </p>

            {photoError && (
              <p
                role="alert"
                className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
              >
                {photoError}
              </p>
            )}
            {photoSuccess && (
              <p
                role="status"
                className="mt-2 rounded-xl bg-jade-soft px-3 py-2 text-xs font-medium text-jade-deep"
              >
                {photoSuccess}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="text-xs font-semibold text-ink">
            Choose a preset
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Pick one of the E-Docs preset images — you can change it anytime.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {PROFILE_AVATAR_OPTIONS.map((option) => {
              const active = profile.avatar_url === option.src;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={photoBusy}
                  onClick={() => chooseAvatar(option.src)}
                  title={option.label}
                  aria-label={`Use ${option.label}`}
                  aria-pressed={active}
                  className={`relative h-14 w-14 overflow-hidden rounded-full border-2 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${
                    active
                      ? "border-jade"
                      : "border-slate-200 hover:border-accent/50"
                  }`}
                >
                  <img
                    src={option.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                  {active && (
                    <span
                      className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-jade text-[9px] font-bold text-white dark:text-navy"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
          Your details
        </h2>

        <form onSubmit={saveProfile} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-600 sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold">Full name</span>
            <input
              value={form.fullName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  fullName: event.target.value,
                }))
              }
              maxLength={160}
              required
              className="w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgba(11,19,48,0.02)] placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
              placeholder="Exactly as printed on your documents"
            />
          </label>

          <label className="block text-sm text-slate-600">
            <span className="mb-1 block text-xs font-semibold">
              Department (optional)
            </span>
            <input
              value={form.department}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  department: event.target.value,
                }))
              }
              maxLength={120}
              className="w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgba(11,19,48,0.02)] placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
              placeholder="e.g. Finance"
            />
          </label>

          <label className="block text-sm text-slate-600">
            <span className="mb-1 block text-xs font-semibold">
              Position (optional)
            </span>
            <input
              value={form.position}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  position: event.target.value,
                }))
              }
              maxLength={120}
              className="w-full rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgba(11,19,48,0.02)] placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none"
              placeholder="e.g. Department Head"
            />
          </label>

          <p className="text-xs text-slate-500 sm:col-span-2">
            Changing your name changes how printed names are matched to you.
            Use the name exactly as it appears on documents you sign.
          </p>

          {formError && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 sm:col-span-2"
            >
              {formError}
            </p>
          )}
          {formSuccess && (
            <p
              role="status"
              className="rounded-xl bg-jade-soft px-3.5 py-2.5 text-sm font-medium text-jade-deep sm:col-span-2"
            >
              {formSuccess}
            </p>
          )}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
              {saving ? "Saving…" : "Save details"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span aria-hidden="true" className="h-4 w-1 rounded-full bg-navy" />
              Your signature
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Approvers must have a signature on file. It is stamped only when
              you approve a document.
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
              hasSignature
                ? "bg-jade-soft text-jade-deep"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            {hasSignature ? "On file" : "Not uploaded"}
          </span>
        </div>

        <div className="mt-5">
          <SignatureUploader
            userId={user.id}
            currentPath={profile.signature_path}
            onSaved={() => refreshProfile()}
          />
        </div>
      </section>
    </div>
  );
}
