import { ACCESS } from "./roles.js";

// The signed-in pages. The sidebar, the route table and the access test all
// read from this list: adding a page = one entry here + one screen in App.jsx.
export const MEMBER_PAGES = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    allowedRoles: ACCESS.member,
    hidden: false,
  },
  {
    id: "documents",
    label: "Documents",
    path: "/documents",
    allowedRoles: ACCESS.member,
    hidden: false,
  },
  {
    id: "awaiting",
    label: "Awaiting signature",
    path: "/awaiting",
    allowedRoles: ACCESS.member,
    hidden: false,
  },
  {
    id: "upload",
    label: "New document",
    path: "/documents/new",
    allowedRoles: ACCESS.member,
    hidden: false,
  },
  {
    id: "profile",
    label: "Profile & signature",
    path: "/profile",
    allowedRoles: ACCESS.member,
    hidden: false,
  },
  {
    id: "users",
    label: "Users",
    path: "/admin/users",
    allowedRoles: ACCESS.admin,
    hidden: false,
  },
  {
    id: "document",
    label: "Document",
    path: "/documents/:id",
    allowedRoles: ACCESS.member,
    hidden: true,
  },
  {
    id: "sign",
    label: "Sign document",
    path: "/sign/:signatoryId",
    allowedRoles: ACCESS.member,
    hidden: true,
  },
];

export function canAccessPage(page, role) {
  return Boolean(role) && page.allowedRoles.includes(role);
}

export function visibleMemberPages(role) {
  return MEMBER_PAGES.filter(
    (page) => !page.hidden && canAccessPage(page, role),
  );
}

/**
 * Which sidebar item should be highlighted for a pathname.
 *
 * This must be explicit: `/documents` is a prefix of `/documents/new`, so a
 * plain NavLink would highlight the Documents and Upload tabs at the same time.
 * A document detail (`/documents/:id`) still belongs to Documents; the sign
 * screen (`/sign/:id`) still belongs to Awaiting signature.
 */
export function isPageActive(page, pathname) {
  if (!page) return false;
  const path = String(pathname ?? "").replace(/\/+$/, "") || "/";

  if (page.id === "documents") {
    return (
      path === "/documents" ||
      (path.startsWith("/documents/") && path !== "/documents/new")
    );
  }
  if (page.id === "upload") {
    return path === "/documents/new";
  }
  if (page.id === "awaiting") {
    return path === "/awaiting" || path.startsWith("/sign/");
  }
  return path === page.path;
}
