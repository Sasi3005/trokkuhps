import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCustomerAuth } from "../auth/useCustomerAuth";

export default function RequireCustomer() {
  const { user, loading } = useCustomerAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="customer-auth-loading" role="status">
        กำลังตรวจสอบบัญชี…
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}