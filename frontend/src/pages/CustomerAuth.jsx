import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useCustomerAuth } from "../auth/useCustomerAuth";
import "./customerAuth.css";

export default function CustomerAuth({ mode = "login" }) {
  const isRegister = mode === "register";
  const { user, loading, login, register, verifyRegistrationOtp, resendRegistrationOtp } = useCustomerAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: "", email: "", phone: "", password: "", confirm: "", otp: "" });
  const [stage, setStage] = useState("details");
  const [pendingEmail, setPendingEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const destination = location.state?.from?.pathname?.startsWith("/booking") || location.state?.from?.pathname === "/confirm"
    ? location.state.from : { pathname: "/booking", search: location.state?.from?.search || "" };
  if (!loading && user) return <Navigate to={destination} replace />;

  const change = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (isRegister && stage === "details" && values.password !== values.confirm) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }
    try {
      setBusy(true);
      if (isRegister && stage === "details") {
        const email = values.email.trim().toLowerCase();
        await register({ name: values.name.trim(), email, phone: values.phone.trim(), password: values.password });
        setPendingEmail(email);
        setValues((current) => ({ ...current, password: "", confirm: "" }));
        setStage("otp");
        setNotice("ส่งรหัสยืนยัน 6 หลักไปยังอีเมลแล้ว รหัสมีอายุ 10 นาที");
        return;
      }
      if (isRegister) {
        await verifyRegistrationOtp({ email: pendingEmail, code: values.otp });
      } else {
        await login({ email: values.email.trim(), password: values.password });
      }
      navigate(destination, { replace: true });
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const resendOtp = async () => {
    setError("");
    setNotice("");
    try {
      setBusy(true);
      await resendRegistrationOtp({ email: pendingEmail });
      setNotice("ส่งรหัส OTP ฉบับใหม่แล้ว กรุณาตรวจสอบอีเมล");
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  return (
    <main className="customer-auth-page">
      <section className="customer-auth-card">
        <Link to="/" className="customer-auth-brand"><span className="customer-auth-brand__mark"><i /><i /><i /></span><span>TROK <small>KU KPS</small></span></Link>
        <p className="customer-auth-kicker">YOUR TABLE IS WAITING</p>
        <h1>{isRegister ? (stage === "otp" ? "ยืนยันอีเมลของคุณ" : "สร้างบัญชีของคุณ") : "ยินดีต้อนรับกลับ"}</h1>
        <p className="customer-auth-intro">
          {isRegister
            ? stage === "otp" ? <>กรอกรหัส 6 หลักที่ส่งไปยัง <strong>{pendingEmail}</strong></> : "สมัครสมาชิกและยืนยันอีเมลก่อนเลือกโต๊ะสำหรับมื้อถัดไป"
            : "เข้าสู่ระบบเพื่อไปต่อและจองโต๊ะที่ต้องการ"}
        </p>
        <form onSubmit={submit} noValidate>
          {isRegister && stage === "details" && <label>ชื่อที่ใช้จอง<input name="name" value={values.name} onChange={change} autoComplete="name" minLength={2} maxLength={100} required disabled={busy} placeholder="ชื่อและนามสกุล" /></label>}
          {(!isRegister || stage === "details") && <label>อีเมล<input name="email" type="email" value={values.email} onChange={change} autoComplete="email" maxLength={190} required disabled={busy} placeholder="you@example.com" /></label>}
          {isRegister && stage === "details" && <label>เบอร์โทรศัพท์<input name="phone" type="tel" value={values.phone} onChange={change} autoComplete="tel" inputMode="numeric" pattern="[0-9]{9,10}" minLength={9} maxLength={10} required disabled={busy} placeholder="กรอกเบอร์โทร 9–10 หลัก" /></label>}
          {isRegister && stage === "details" && <label>รหัสผ่าน<input name="password" type="password" value={values.password} onChange={change} autoComplete="new-password" minLength={8} maxLength={72} required disabled={busy} placeholder="อย่างน้อย 8 ตัวอักษร" /></label>}
          {isRegister && stage === "details" && <label>ยืนยันรหัสผ่าน<input name="confirm" type="password" value={values.confirm} onChange={change} autoComplete="new-password" minLength={8} maxLength={72} required disabled={busy} placeholder="กรอกรหัสผ่านอีกครั้ง" /></label>}
          {!isRegister && <label>รหัสผ่าน<input name="password" type="password" value={values.password} onChange={change} autoComplete="current-password" required disabled={busy} placeholder="รหัสผ่านของคุณ" /></label>}
          {isRegister && stage === "otp" && <label>รหัส OTP<input name="otp" type="text" value={values.otp} onChange={(event) => setValues((current) => ({ ...current, otp: event.target.value.replace(/\D/g, "").slice(0, 6) }))} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required disabled={busy} placeholder="กรอกรหัส 6 หลัก" /></label>}
          {error && <p className="customer-auth-error" role="alert">{error}</p>}
          {notice && <p className="customer-auth-notice" role="status">{notice}</p>}
          <button type="submit" disabled={busy || loading || (isRegister && stage === "otp" && values.otp.length !== 6)}>
            {busy ? "กำลังดำเนินการ…" : isRegister ? stage === "otp" ? "ยืนยันรหัสและสมัครสมาชิก" : "ส่งรหัสยืนยันทางอีเมล" : "เข้าสู่ระบบ"}<span aria-hidden="true">→</span>
          </button>
        </form>
        {isRegister && stage === "otp" ? (
          <div className="customer-auth-otp-actions">
            <button type="button" onClick={resendOtp} disabled={busy}>ส่งรหัสอีกครั้ง</button>
            <button type="button" onClick={() => { setStage("details"); setError(""); setNotice(""); setValues((current) => ({ ...current, otp: "" })); }}>แก้ไขข้อมูลสมัคร</button>
          </div>
        ) : (
          <p className="customer-auth-switch">{isRegister ? "มีบัญชีอยู่แล้ว?" : "ยังไม่มีบัญชี?"} <Link to={isRegister ? "/login" : "/register"} state={{ from: location.state?.from }}>{isRegister ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</Link></p>
        )}
        <Link className="customer-auth-back" to="/">← กลับสู่หน้าร้าน</Link>
      </section>
    </main>
  );
}
