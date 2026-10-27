import test from "node:test";
import assert from "node:assert/strict";
import {
  MEMBER_PAGES,
  canAccessPage,
  isPageActive,
  visibleMemberPages,
} from "../../src/routes/memberPages.js";
import { ROLES } from "../../src/routes/roles.js";

// Expected access is written independently of the page definitions.
const expectedPages = {
  [ROLES.MEMBER]: [
    "dashboard",
    "documents",
    "awaiting",
    "upload",
    "profile",
    "document",
    "sign",
  ],
  [ROLES.ADMIN]: [
    "dashboard",
    "documents",
    "awaiting",
    "upload",
    "profile",
    "users",
    "document",
    "sign",
  ],
};

for (const [role, pageIds] of Object.entries(expectedPages)) {
  test(`${role} can access exactly their assigned pages`, () => {
    for (const page of MEMBER_PAGES) {
      assert.equal(
        canAccessPage(page, role),
        pageIds.includes(page.id),
        `${role}: ${page.label}`,
      );
    }
  });
}

test("missing and unknown roles cannot access any page", () => {
  for (const role of [null, undefined, "", "unknown", "MEMBER", "staff"]) {
    for (const page of MEMBER_PAGES) {
      assert.equal(canAccessPage(page, role), false);
    }
  }
});

test("the sidebar hides detail routes but keeps them guarded", () => {
  const memberVisible = visibleMemberPages(ROLES.MEMBER).map((page) => page.id);
  assert.deepEqual(memberVisible, [
    "dashboard",
    "documents",
    "awaiting",
    "upload",
    "profile",
  ]);

  const adminVisible = visibleMemberPages(ROLES.ADMIN).map((page) => page.id);
  assert.deepEqual(adminVisible, [
    "dashboard",
    "documents",
    "awaiting",
    "upload",
    "profile",
    "users",
  ]);

  assert.equal(
    canAccessPage(
      MEMBER_PAGES.find((page) => page.id === "document"),
      ROLES.MEMBER,
    ),
    true,
  );
  assert.equal(
    canAccessPage(
      MEMBER_PAGES.find((page) => page.id === "sign"),
      ROLES.MEMBER,
    ),
    true,
  );
});

test("upload and documents do not highlight each other", () => {
  const documents = MEMBER_PAGES.find((page) => page.id === "documents");
  const upload = MEMBER_PAGES.find((page) => page.id === "upload");
  const awaiting = MEMBER_PAGES.find((page) => page.id === "awaiting");

  assert.equal(isPageActive(documents, "/documents"), true);
  assert.equal(isPageActive(upload, "/documents"), false);

  assert.equal(isPageActive(upload, "/documents/new"), true);
  assert.equal(isPageActive(upload, "/documents/new/"), true);
  assert.equal(isPageActive(documents, "/documents/new"), false);

  // A detail page still belongs to the Documents tab; the sign screen still
  // belongs to Awaiting signature.
  assert.equal(isPageActive(documents, "/documents/123"), true);
  assert.equal(isPageActive(upload, "/documents/123"), false);
  assert.equal(isPageActive(awaiting, "/sign/abc"), true);
});

test("page definitions stay unique and complete", () => {
  assert.equal(
    new Set(MEMBER_PAGES.map((page) => page.id)).size,
    MEMBER_PAGES.length,
  );
  assert.equal(
    new Set(MEMBER_PAGES.map((page) => page.path)).size,
    MEMBER_PAGES.length,
  );
  for (const page of MEMBER_PAGES) {
    assert.ok(page.label, "every page has a label");
    assert.ok(
      Array.isArray(page.allowedRoles) && page.allowedRoles.length > 0,
      "every page lists at least one allowed role",
    );
    assert.equal(typeof page.hidden, "boolean", "hidden is explicit");
  }
});
