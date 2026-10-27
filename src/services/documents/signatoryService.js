import { getSupabase } from "../auth/authService.js";

function mapMatchError(error) {
  if (error?.code === "42501") {
    return new Error("Your account can't search for signatories.");
  }
  if (error?.code === "PGRST202") {
    return new Error("Name matching isn't set up yet. Apply the database migration.");
  }
  if (["PGRST205", "42P01"].includes(error?.code)) {
    return new Error("The E-Docs database migration hasn't been applied.");
  }
  return new Error("Couldn't match names right now. Try again.");
}

/** Top 5 matches for one printed name. Scores below 0.90 are not eligible. */
export async function findSignatoryMatches(name, signal) {
  const supabase = await getSupabase();
  let request = supabase.rpc("find_signatory_matches", {
    p_name: String(name ?? "").trim(),
  });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw mapMatchError(error);
  return data ?? [];
}

/** Batch version for the upload review. `candidate_index` is 1-based. */
export async function findSignatoryMatchesBatch(names, signal) {
  const list = (names ?? []).map((name) => String(name ?? "").trim());
  if (list.length === 0) return [];
  if (list.length > 40) {
    throw new Error("Scan fewer names at once (maximum 40).");
  }

  const supabase = await getSupabase();
  let request = supabase.rpc("find_signatory_matches_batch", { p_names: list });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw mapMatchError(error);
  return data ?? [];
}
