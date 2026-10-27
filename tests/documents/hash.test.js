import test from "node:test";
import assert from "node:assert/strict";
import { sha256Hex } from "../../src/services/documents/hash.js";

const ABC_HASH =
  "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

test("hashes bytes as lowercase SHA-256", async () => {
  const bytes = new TextEncoder().encode("abc");
  assert.equal(await sha256Hex(bytes), ABC_HASH);
});

test("accepts an ArrayBuffer as well", async () => {
  const bytes = new TextEncoder().encode("abc");
  assert.equal(await sha256Hex(bytes.buffer), ABC_HASH);
});

test("different bytes produce a different hash", async () => {
  const first = await sha256Hex(new TextEncoder().encode("a"));
  const second = await sha256Hex(new TextEncoder().encode("b"));
  assert.notEqual(first, second);
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.match(second, /^[0-9a-f]{64}$/);
});
