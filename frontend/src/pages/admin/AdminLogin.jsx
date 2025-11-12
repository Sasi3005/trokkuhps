// src/pages/admin/AdminLogin.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import logo from "../../assets/trok.png";
import "./admin.css";

export default function AdminLogin() {
  const { isAuthenticated, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || "/admin";

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [loading, isAuthenticated, from, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    const u = username.trim();
    const p = password.trim();
    if (!u || !p) return setErr("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");

    try {
      setSubmitting(true);
      const res = await login(u, p);
      if (res?.ok) {
        navigate(from, { replace: true });
      } else {
        setErr(res?.message || "เข้าสู่ระบบไม่สำเร็จ");
      }
    } catch (error) {
      setErr(error?.message || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  // ระหว่างโหลด session: ยังไม่รู้ว่าเคยล็อกอินไหม
  if (loading) return null; // หรือ skeleton

  return (
    <div className="admin-wrap beige">
      <div className="admin-shell">
        <div className="brand-side">
          <img src={logo} alt="ตรอก" />
        </div>

        <div className="login-side">
          <form className="login-card" onSubmit={onSubmit}>
            <div className="avatar">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M4 20c0-4.2 4-6 8-6s8 1.8 8 6" />
              </svg>
            </div>

            <h1 className="welcome">Welcome Admin</h1>

            <label className="field">
              <span className="field-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm7 8a7 7 0 0 0-14 0" />
                </svg>
              </span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoFocus
                disabled={submitting}
              />
            </label>

            <label className="field">
              <span className="field-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17 11H7a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2Z" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                disabled={submitting}
              />
            </label>

            {err && <div className="admin-error soft">{err}</div>}

            <button
              className="btn-beige"
              type="submit"
              disabled={submitting || !username.trim() || !password.trim()}
            >
              {submitting ? "กำลังเข้าสู่ระบบ..." : "Login"}
            </button>

            <div className="admin-links-home">
              <button className="btn-home" onClick={() => window.location.href = "/"}>
                ← กลับหน้าแรก
              </button>
            </div>



          </form>
        </div>
      </div>
    </div>
  );
}
