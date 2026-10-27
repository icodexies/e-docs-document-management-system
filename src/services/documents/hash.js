/**
 * SHA-256 of a file's bytes, as lowercase hex. The same value is stored in
 * `documents.original_sha256` and verified again by the Edge Function before
 * a signature is applied.
 */
export async function sha256Hex(input) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("This browser can't verify file integrity.");
  }
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
