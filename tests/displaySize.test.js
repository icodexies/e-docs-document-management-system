import test from "node:test";
import assert from "node:assert/strict";
import {
  DISPLAY_LABELS,
  DISPLAY_SIZES,
} from "../src/context/display/displaySizeStore.js";

test("display size offers exactly three ordered levels", () => {
  assert.deepEqual(DISPLAY_SIZES, ["normal", "large", "larger"]);
  assert.equal(new Set(DISPLAY_SIZES).size, 3);
});

test("every display size has a readable label", () => {
  for (const size of DISPLAY_SIZES) {
    assert.equal(typeof DISPLAY_LABELS[size], "string");
    assert.ok(DISPLAY_LABELS[size].length > 0);
  }
});
