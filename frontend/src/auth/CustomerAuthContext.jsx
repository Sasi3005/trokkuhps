import { useCallback, useEffect, useState } from "react";
import { CustomerAuthContext } from "./customerAuthContext";
const API = (import.meta.env.VITE_API_BASE || "http://localhost:5000").replace(/\/+$/, "");

export function CustomerAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${API}/auth/me`, { credentials: "include" });
      if (!response.ok) { setUser(null); return null; }
      const data = await response.json();
      setUser(data.user || null);
      return data.user || null;
    } catch { setUser(null); return null; }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (alive) setUser(data?.user || null); })
      .catch(() => { if (alive) setUser(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const request = async (path, values = {}) => {
    const response = await fetch(`${API}/auth/${path}`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง");
    setUser(data.user || null);
    return data.user;
  };

  const logout = async () => {
    try { await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" }); }
    finally { setUser(null); }
  };

  const requestOtp = (values) => request("register", values);
  const verifyRegistrationOtp = (values) => request("register/verify-otp", values);
  const resendRegistrationOtp = (values) => request("register/resend-otp", values);

  return <CustomerAuthContext.Provider value={{ user, loading, refresh, register: requestOtp, verifyRegistrationOtp, resendRegistrationOtp, login: (values) => request("login", values), logout }}>{children}</CustomerAuthContext.Provider>;
}

