import { Authenticated, Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import {
  ErrorComponent,
  RefineSnackbarProvider,
  ThemedLayout,
  useNotificationProvider,
} from "@refinedev/mui";
import Navkit from "@taruvi/navkit";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import routerProvider, { DocumentTitleHandler } from "@refinedev/react-router";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router";
import { taruviClient } from "./taruviClient";
import {
  taruviDataProvider,
  taruviAuthProvider,
  taruviStorageProvider,
  taruviAppProvider,
  taruviUserProvider,
} from "./providers/refineProviders";
import { CustomSider, ErrorBoundary, UnsavedChangesDialog } from "./components";
import { LoginRedirect } from "./components/auth/LoginRedirect";
import { ColorModeContextProvider, ColorModeContext } from "./contexts/color-mode";
import { AppSettingsProvider, useAppSettings } from "./contexts/app-settings";
import { useContext, useRef, useEffect } from "react";
import { Login } from "./pages/login";

// User-facing pages
import { Dashboard } from "./pages/dashboard";
import { ResourceList, ResourceShow } from "./pages/resources";
import { BookingList } from "./pages/bookings";

// Admin — Organizations
import { OrganizationList, OrganizationCreate, OrganizationEdit } from "./pages/organizations";

// Admin — Resource Types
import { ResourceTypeList, ResourceTypeCreate, ResourceTypeEdit } from "./pages/resource-types";

// Admin — Manage Resources (CRUD)
import { AdminResourceList, AdminResourceCreate, AdminResourceEdit } from "./pages/admin/resources";

// Admin — Availability
import { AvailabilityList, AvailabilityCreate, AvailabilityEdit } from "./pages/availability";

// Admin — All Bookings
import { AdminBookingList } from "./pages/admin/bookings";

// Icons
import ExploreIcon from "@mui/icons-material/Explore";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BusinessIcon from "@mui/icons-material/Business";
import CategoryIcon from "@mui/icons-material/Category";
import InventoryIcon from "@mui/icons-material/Inventory";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventNoteIcon from "@mui/icons-material/EventNote";

const AppContent = () => {
  const { setMode } = useContext(ColorModeContext);
  const navRef = useRef<HTMLDivElement>(null);
  const { settings } = useAppSettings();

  useEffect(() => {
    if (navRef.current) {
      const height = navRef.current.offsetHeight;
      document.documentElement.style.setProperty("--nav-height", `${height}px`);
    }
  }, []);

  return (
    <>
      <div
        ref={navRef}
        data-nav-container
        style={{ position: "sticky", top: 0, zIndex: 1300, width: "100%" }}
      >
        <Navkit client={taruviClient} getTheme={(theme) => setMode(theme)} />
      </div>
      <RefineSnackbarProvider>
        <DevtoolsProvider>
          <Refine
            dataProvider={{
              default: taruviDataProvider,
              storage: taruviStorageProvider,
              app: taruviAppProvider,
              user: taruviUserProvider,
            }}
            notificationProvider={useNotificationProvider}
            routerProvider={routerProvider}
            authProvider={taruviAuthProvider}
            resources={[
              // ── User-facing ───────────────────────────────────────────
              {
                name: "resources",
                list: "/resources",
                show: "/resources/:id",
                meta: { label: "Browse Resources", icon: <ExploreIcon /> },
              },
              {
                name: "bookings",
                list: "/my-bookings",
                meta: { label: "My Bookings", icon: <BookmarkIcon /> },
              },
              // ── Admin ─────────────────────────────────────────────────
              {
                name: "organizations",
                list: "/organizations",
                create: "/organizations/new",
                edit: "/organizations/:id/edit",
                meta: { label: "Organizations", icon: <BusinessIcon />, canDelete: true },
              },
              {
                name: "resource_types",
                list: "/resource-types",
                create: "/resource-types/new",
                edit: "/resource-types/:id/edit",
                meta: { label: "Resource Types", icon: <CategoryIcon />, canDelete: true },
              },
              {
                // "admin_resources" is the nav identifier; actual DB table is "resources"
                // All hooks inside use resource: "resources" directly.
                name: "admin_resources",
                list: "/admin/resources",
                create: "/admin/resources/new",
                edit: "/admin/resources/:id/edit",
                meta: { label: "Manage Resources", icon: <InventoryIcon />, canDelete: true },
              },
              {
                name: "availability",
                list: "/availability",
                create: "/availability/new",
                edit: "/availability/:id/edit",
                meta: { label: "Availability", icon: <CalendarMonthIcon />, canDelete: true },
              },
              {
                name: "admin_bookings",
                list: "/admin/bookings",
                meta: { label: "All Bookings", icon: <EventNoteIcon /> },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
              projectId: "obEpHJ-M7JimA-31GF1J",
            }}
          >
            <Routes>
              {/* Auth routes */}
              <Route
                element={
                  <Authenticated key="login-route" fallback={<Outlet />}>
                    <Navigate to="/" replace />
                  </Authenticated>
                }
              >
                <Route path="/login" element={<Login />} />
              </Route>

              {/* Authenticated routes */}
              <Route
                element={
                  <Authenticated key="authenticated-inner" fallback={<LoginRedirect />}>
                    <ThemedLayout
                      Header={() => null}
                      Sider={CustomSider}
                      initialSiderCollapsed={true}
                    >
                      <Box sx={{ ml: { xs: 0, md: "72px" }, transition: "margin-left 0.2s ease-in-out" }}>
                        <ErrorBoundary>
                          <Outlet />
                        </ErrorBoundary>
                      </Box>
                    </ThemedLayout>
                  </Authenticated>
                }
              >
                {/* Dashboard */}
                <Route index element={<Dashboard />} />

                {/* User-facing */}
                <Route path="resources" element={<ResourceList />} />
                <Route path="resources/:id" element={<ResourceShow />} />
                <Route path="my-bookings" element={<BookingList />} />

                {/* Admin — Organizations */}
                <Route path="organizations" element={<OrganizationList />} />
                <Route path="organizations/new" element={<OrganizationCreate />} />
                <Route path="organizations/:id/edit" element={<OrganizationEdit />} />

                {/* Admin — Resource Types */}
                <Route path="resource-types" element={<ResourceTypeList />} />
                <Route path="resource-types/new" element={<ResourceTypeCreate />} />
                <Route path="resource-types/:id/edit" element={<ResourceTypeEdit />} />

                {/* Admin — Manage Resources */}
                <Route path="admin/resources" element={<AdminResourceList />} />
                <Route path="admin/resources/new" element={<AdminResourceCreate />} />
                <Route path="admin/resources/:id/edit" element={<AdminResourceEdit />} />

                {/* Admin — Availability */}
                <Route path="availability" element={<AvailabilityList />} />
                <Route path="availability/new" element={<AvailabilityCreate />} />
                <Route path="availability/:id/edit" element={<AvailabilityEdit />} />

                {/* Admin — All Bookings */}
                <Route path="admin/bookings" element={<AdminBookingList />} />

                {/* Fallback */}
                <Route path="*" element={<ErrorComponent />} />
              </Route>
            </Routes>

            <RefineKbar />
            <UnsavedChangesDialog />
            <DocumentTitleHandler handler={() => settings?.displayName || "Resource Calendar"} />
          </Refine>
          <DevtoolsPanel />
        </DevtoolsProvider>
      </RefineSnackbarProvider>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ColorModeContextProvider>
          <AppSettingsProvider>
            <CssBaseline />
            <GlobalStyles styles={{ html: { WebkitFontSmoothing: "auto" } }} />
            <AppContent />
          </AppSettingsProvider>
        </ColorModeContextProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
