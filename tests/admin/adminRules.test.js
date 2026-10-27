import test from "node:test";
import assert from "node:assert/strict";
import {
  USER_ROLES,
  validateNewUser,
} from "../../src/services/admin/adminRules.js";

test("a valid new user is trimmed and normalized", () => {
  const result = validateNewUser({
    email: "  Admin@EDocs.Test ",
    fullName: "  E-Docs   Administrator ",
    password: "",
    department: "  Administration ",
    position: "  System Administrator ",
    role: "admin",
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.email, "admin@edocs.test");
  assert.equal(result.value.fullName, "E-Docs Administrator");
  assert.equal(result.value.password, "");
  assert.equal(result.value.role, "admin");
});

test("a blank password is allowed because the server generates one", () => {
  assert.equal(
    validateNewUser({
      email: "juan@example.com",
      fullName: "Juan Dela Cruz",
      role: "member",
    }).ok,
    true,
  );
});

test("invalid emails, names, passwords and roles are rejected", () => {
  const base = {
    email: "juan@example.com",
    fullName: "Juan Dela Cruz",
    role: "member",
  };

  assert.equal(validateNewUser({ ...base, email: "not-an-email" }).ok, false);
  assert.equal(validateNewUser({ ...base, fullName: "J" }).ok, false);
  assert.equal(validateNewUser({ ...base, password: "short" }).ok, false);
  assert.equal(
    validateNewUser({ ...base, password: "x".repeat(73) }).ok,
    false,
  );
  assert.equal(validateNewUser({ ...base, role: "staff" }).ok, false);
  assert.equal(
    validateNewUser({ ...base, department: "x".repeat(121) }).ok,
    false,
  );
});

test("the allowed roles are Member and Admin only", () => {
  assert.deepEqual(USER_ROLES, ["member", "admin"]);
});
