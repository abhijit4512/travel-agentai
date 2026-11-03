import { Route, Routes } from "react-router-dom";
import { AdminAuthProvider } from "../../services/adminAuth";
import Analytics from "./Analytics";
import AdminLayout from "./AdminLayout";
import AdminLogin from "./AdminLogin";
import Bookings from "./Bookings";
import Catalog from "./Catalog";
import { AdminSettings, Audit, Notifications, Reports } from "./Misc";
import Overview from "./Overview";
import { TripDetail, Trips } from "./Trips";
import { UserDetail, Users } from "./Users";
import ImageManager from "./ImageManager";

/** All admin screens live under /admin and are loaded as one separate chunk, so customers never download them. */
export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="users" element={<Users />} /><Route path="users/:id" element={<UserDetail />} />
          <Route path="trips" element={<Trips />} /><Route path="trips/:id" element={<TripDetail />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="analytics" element={<Analytics />} /><Route path="notifications" element={<Notifications />} />
          <Route path="reports" element={<Reports />} /><Route path="audit" element={<Audit />} /><Route path="settings" element={<AdminSettings />} />
          <Route path="images" element={<ImageManager />} />
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}
