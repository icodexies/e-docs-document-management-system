// Single place to define roles and who can access what.
// Keep the values identical to the `role` check in the profiles table.
export const ROLES = {
  MEMBER: "member",
  ADMIN: "admin",
};

export const ACCESS = {
  member: [ROLES.MEMBER, ROLES.ADMIN],
  admin: [ROLES.ADMIN],
};

export const ROLE_LABELS = {
  [ROLES.MEMBER]: "Member",
  [ROLES.ADMIN]: "Admin",
};
