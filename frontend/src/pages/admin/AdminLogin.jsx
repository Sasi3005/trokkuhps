import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "./admin.css";
import "./AdminLogin.css";

export default function AdminLogin() {
  const { isAuthenticated, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const from = location.state?.from?.pathname || "/admin";

  useEffect(() => {
    if (!loading && isAuthenticated) navigate(from, { replace: true });
  }, [loading, isAuthenticated, from, navigate]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setErr("");
    const user = username.trim();
    const pass = password.trim();
    if (!user || !pass) return setErr("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");

    try {
      setSubmitting(true);
      const result = await login(user, pass);
      if (result?.ok) navigate(from, { replace: true });
      else setErr(result?.message || "เข้าสู่ระบบไม่สำเร็จ");
    } catch (error) {
      setErr(error?.message || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <main className="admin-login-page">
      <div className="admin-login-page__glow admin-login-page__glow--one" aria-hidden="true" />
      <div className="admin-login-page__glow admin-login-page__glow--two" aria-hidden="true" />
      <section className="admin-login" aria-label="เข้าสู่ระบบผู้ดูแล">
        <aside className="admin-login__welcome">
          <Link to="/" className="admin-login__brand" aria-label="กลับสู่หน้าแรก TROK KU KPS">
            <span className="admin-login__brand-mark" aria-hidden="true"><i /><i /><i /></span>
            <span>TROK <small>KU KPS</small></span>
          </Link>
          <div className="admin-login__welcome-copy">
            <p className="admin-login__eyebrow"><span /> STAFF PORTAL</p>
            <h1>จัดการร้าน<br /><em>ได้ในที่เดียว</em></h1>
            <p>ดูแลรายการจอง โต๊ะ เมนู และภาพรวมของร้าน TROK KU KPS ได้อย่างคล่องตัว</p>
          </div>
          <div className="admin-login__features" aria-label="ความสามารถของระบบ">
            <span><b>01</b> จัดการการจอง</span>
            <span><b>02</b> ดูแลเมนูและโต๊ะ</span>
            <span><b>03</b> ตรวจสอบรายงาน</span>
          </div>
          <p className="admin-login__location">KASETSART UNIVERSITY · KAMPHAENG SAEN</p>
        </aside>

        <div className="admin-login__form-area">
          <form className="admin-login__form" onSubmit={onSubmit} noValidate>
            <div className="admin-login__lock" aria-hidden="true">
              <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15" r="1" /></svg>
            </div>
            <p className="admin-login__form-label">WELCOME BACK</p>
            <h2>เข้าสู่ระบบแอดมิน</h2>
            <p className="admin-login__form-intro">กรอกข้อมูลเพื่อเข้าสู่พื้นที่จัดการร้าน</p>

            <label className="admin-login__field">
              <span>ชื่อผู้ใช้</span>
              <div>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c.6-3.7 3.5-5.7 7.5-5.7s6.9 2 7.5 5.7" /></svg>
                <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="ชื่อผู้ใช้" autoComplete="username" autoCapitalize="none" disabled={submitting} />
              </div>
            </label>

            <label className="admin-login__field">
              <span>รหัสผ่าน</span>
              <div>
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="รหัสผ่าน" autoComplete="current-password" disabled={submitting} />
                <button type="button" className="admin-login__password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
                  {showPassword ? "ซ่อน" : "แสดง"}
                </button>
              </div>
            </label>

            {err && <p className="admin-login__error" role="alert">{err}</p>}
            <button className="admin-login__submit" type="submit" disabled={submitting || !username.trim() || !password.trim()}>
              {submitting ? "กำลังเข้าสู่ระบบ..." : <>เข้าสู่ระบบ <span aria-hidden="true">→</span></>}
            </button>
            <Link className="admin-login__back" to="/">← กลับสู่หน้าร้าน</Link>
          </form>
        </div>
      </section>
    </main>
  );
}
