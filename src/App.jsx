import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/auth/AuthContext.jsx";
import { ThemeProvider } from "./context/theme/ThemeProvider.jsx";
import { LoadingScreen } from "./components/ui/Loading.jsx";
import { PrivateRoute, PublicOnlyRoute } from "./routes/guards.jsx";
import { ACCESS } from "./routes/roles.js";
import { MEMBER_PAGES } from "./routes/memberPages.js";
import PublicLayout from "./layouts/public/PublicLayout.jsx";
import MemberLayout from "./layouts/member/MemberLayout.jsx";
import Home from "./pages/PublicPages/HomePage/Home.jsx";

// Route screens load on demand so the first public page stays light.
const Login = lazy(() => import("./pages/PublicPages/LoginPage/Login.jsx"));
const Unauthorized = lazy(() => import("./pages/Unauthorized.jsx"));

// One entry per member page id (see src/routes/memberPages.js).
const memberScreens = {
  dashboard: lazy(() => import("./pages/PrivatePages/Dashboard/Dashboard.jsx")),
  documents: lazy(() => import("./pages/PrivatePages/Documents/Documents.jsx")),
  upload: lazy(() => import("./pages/PrivatePages/Documents/UploadDocument.jsx")),
  awaiting: lazy(() => import("./pages/PrivatePages/Signatures/AwaitingSignatures.jsx")),
  profile: lazy(() => import("./pages/PrivatePages/Profile/Profile.jsx")),
  users: lazy(() => import("./pages/PrivatePages/Admin/Users.jsx")),
  document: lazy(() => import("./pages/PrivatePages/Documents/DocumentDetail.jsx")),
  sign: lazy(() => import("./pages/PrivatePages/Signatures/SignDocument.jsx")),
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen label="Loading page…" />}>
            <Routes>
              {/* Logged-out screens */}
              <Route element={<PublicOnlyRoute />}>
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                </Route>
                <Route path="/login" element={<Login />} />
              </Route>

              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Signed-in screens */}
              <Route element={<PrivateRoute allowedRoles={ACCESS.member} />}>
                <Route element={<MemberLayout />}>
                  {/* Preserve a friendly /home URL. */}
                  <Route path="/home" element={<Navigate to="/dashboard" replace />} />
                  {MEMBER_PAGES.map((page) => {
                    const Screen = memberScreens[page.id];
                    return (
                      <Route
                        key={page.id}
                        element={<PrivateRoute allowedRoles={page.allowedRoles} />}
                      >
                        <Route path={page.path} element={<Screen />} />
                      </Route>
                    );
                  })}
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
