import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// Pages
import ModernHome from "./components/ModernHome";
import ExperienceShell from "./components/ExperienceShell";
import Booking from "./pages/booking";
import ConfirmBooking from "./pages/confirmBooking";
import Drinks from "./pages/drinks";
import ConfirmDrinks from "./pages/ConfirmDrinks";
import Snacks from "./pages/Snacks";
import ConfirmSnacks from "./pages/ConfirmSnacks";
import Foods from "./pages/Foods";
import ConfirmFoods from "./pages/ConfirmFoods";
import DrinkPayment from "./pages/DrinkPayment";
import Success from "./pages/Success";

import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RequireCustomer from "./components/RequireCustomer";
import CustomerAuth from "./pages/CustomerAuth";
import { CustomerAuthProvider } from "./auth/CustomerAuthContext.jsx";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminReservationDetail from "./pages/admin/AdminReservationDetail";
import AdminFoodMenu from "./pages/admin/AdminFoodMenu";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminReports from "./pages/admin/AdminReports";
import AdminTable from "./pages/admin/AdminTable";

import "./App.css";

/* ================================
   /order alias → /drinks (แปลง tableId → table)
================================ */
function OrderAlias() {
  const loc = useLocation();
  const sp = new URLSearchParams(loc.search);
  const table = sp.get("table") || sp.get("tableId");
  const next = new URLSearchParams(loc.search);
  if (table != null) {
    next.set("table", table);
    next.delete("tableId");
  }
  return <Navigate to={{ pathname: "/drinks", search: `?${next.toString()}` }} replace />;
}

/* ================================
   App (Routes)
================================ */
export default function App() {
  return (
    <CustomerAuthProvider>
    <AuthProvider>
      <ExperienceShell>
      <Routes>
        <Route path="/" element={<ModernHome />} />
        <Route path="/login" element={<CustomerAuth />} />
        <Route path="/register" element={<CustomerAuth mode="register" />} />
        {/* รองรับลิงก์ QR เก่า /order?tableId=xx */}
        <Route path="/order" element={<OrderAlias />} />

        <Route element={<RequireCustomer />}>
          <Route path="/booking" element={<Booking />} />
          <Route path="/confirm" element={<ConfirmBooking />} />
        </Route>
        <Route path="/drinks" element={<Drinks />} />
        <Route path="/success" element={<Success />} />
        <Route path="/drinks/confirm" element={<ConfirmDrinks />} />
        <Route path="/drinks/payment" element={<DrinkPayment />} />
        <Route path="/snacks" element={<Snacks />} />
        <Route path="/snacks/confirm" element={<ConfirmSnacks />} />
        <Route path="/foods" element={<Foods />} />
        <Route path="/foods/confirm" element={<ConfirmFoods />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/reservation/:id" element={<AdminReservationDetail />} />
          <Route path="/admin/menu" element={<AdminFoodMenu />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/tables" element={<AdminTable />} />
        </Route>
      </Routes>
      </ExperienceShell>
    </AuthProvider>
    </CustomerAuthProvider>
  );
}
