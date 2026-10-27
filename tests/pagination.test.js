import test from "node:test";
import assert from "node:assert/strict";
import {
  pageCountFromTotal,
  pageWindow,
} from "../src/services/pagination.js";

test("page counts are derived safely from totals", () => {
  assert.equal(pageCountFromTotal(0, 12), 1);
  assert.equal(pageCountFromTotal(12, 12), 1);
  assert.equal(pageCountFromTotal(13, 12), 2);
  assert.equal(pageCountFromTotal(25, 12), 3);
  assert.equal(pageCountFromTotal(null, 12), null);
  assert.equal(pageCountFromTotal(10, 0), null);
});

test("page numbers stay compact around the current page", () => {
  assert.deepEqual(pageWindow(1, 1), [1]);
  assert.deepEqual(pageWindow(1, 5), [1, 2, 3, 4, 5]);
  assert.ok(pageWindow(5, 20).includes(5));
  assert.ok(pageWindow(5, 20).includes(1));
  assert.ok(pageWindow(5, 20).includes(20));
  assert.ok(pageWindow(5, 20).includes("gap-1"));
  assert.ok(pageWindow(20, 20).includes("gap-1"));
  assert.equal(pageWindow(99, 20).at(-1), 20);
});
