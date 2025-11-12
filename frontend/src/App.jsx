import { useEffect, useRef, useState } from "react";
import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";

// Pages
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
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminReservationDetail from "./pages/admin/AdminReservationDetail";
import AdminFoodMenu from "./pages/admin/AdminFoodMenu";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminReports from "./pages/admin/AdminReports";
import AdminTable from "./pages/admin/AdminTable";

import "./App.css";

/* ================================
   ENV / API BASE (สำคัญ!)
================================ */
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

/* ================================
   Data (ตัวอย่างรูปจาก public/images)
================================ */
const HEROES = [
  {
    img: "/images/p1.png",
    title: "หอมกระทะ กลมกล่อมทุกคำ!\nผัดซีอิ๊วสูตรเด็ด เส้นใหญ่เหนียวนุ่ม",
    price: "50 บาท",
    alt: "ผัดซีอิ๊วสูตรเด็ด",
  },
  {
    img: "/images/a2.png",
    title: "เกี๊ยวซ่าหมู\nกรอบนอก นุ่มใน ไส้หมูชุ่มฉ่ำ",
    price: "50 บาท",
    alt: "เกี๊ยวซ่าหมู",
  },
];

const PROMOS = [
  { id: 1, name: "ข้าวคลุกน้ำพริกปลาทู", price: "50 บาท", img: "/images/p5.png" },
  { id: 2, name: "ข้าวปลาแกะ",          price: "50 บาท", img: "/images/p4.png" },
  { id: 3, name: "ข้าวกุ้งผัดพริกขี้หนูสวน", price: "50 บาท", img: "/images/p3.png" },
  { id: 4, name: "หมี่ไก่ฉีก",            price: "50 บาท", img: "/images/p2.png" },
];

/* ================================
   HealthBadge (ตัวเช็คสุขภาพ API)
================================ */
function HealthBadge() {
  const [state, setState] = useState({ ok: false, msg: "checking...", code: 0 });

  useEffect(() => {
    let abort = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/healthz`, {
          signal: abort.signal,
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        let body = {};
        try { body = await res.json(); } catch {}
        setState({ ok: res.ok, msg: `OK ${res.status} @ ${API_BASE}`, code: res.status });
        console.log("HEALTHZ:", res.status, body);
      } catch (e) {
        setState({ ok: false, msg: `FAIL: ${e?.message || e}`, code: 0 });
        console.warn("HEALTHZ FAIL:", e);
      }
    })();
    return () => abort.abort();
  }, []);

  const style = {
    position: "fixed",
    bottom: 8,
    right: 8,
    zIndex: 9999,
    padding: "6px 10px",
    borderRadius: 10,
    background: state.ok ? "rgba(0,160,80,.92)" : "rgba(200,0,0,.92)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
    boxShadow: "0 4px 18px rgba(0,0,0,.18)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    maxWidth: "60vw",
    lineHeight: 1.4,
  };

  return (
    <div style={style} role="status" aria-live="polite">
      API: {state.msg}
    </div>
  );
}

/* ================================
   Home + MobileMenu
================================ */
function Home() {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const next = () => setIndex((i) => (i + 1) % HEROES.length);
  const prev = () => setIndex((i) => (i - 1 + HEROES.length) % HEROES.length);
  const goTo = (i) => setIndex(i);

  useEffect(() => {
    startAuto();
    return stopAuto;
  }, [index]);

  const startAuto = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    stopAuto();
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % HEROES.length), 4200);
  };
  const stopAuto = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = menuOpen ? "hidden" : "";
    return () => (document.documentElement.style.overflow = "");
  }, [menuOpen]);

  const slide = HEROES[index];

  return (
    <div className="page">
      {/* NAVBAR */}
      <header className="topbar">
        <div className="container">
          <Link to="/" className="brand" aria-label="กลับสู่หน้าแรก">
            <span className="brand__dot" />
            <span className="brand__name">TROK</span>
            <span className="brand__tag">KU KPS</span>
          </Link>

          {/* Desktop nav */}
          <nav className="topnav" aria-label="เมนูหลัก">
            <Link className="topnav__link" to="/foods">เมนูอาหาร</Link>
            <Link className="topnav__link" to="/snacks">ของทานเล่น</Link>
            <Link className="topnav__link" to="/drinks?table=A1">เครื่องดื่ม</Link>
            <Link className="topnav__cta" to="/booking">จองโต๊ะ</Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className="menu-btn"
            aria-label="เปิดเมนู"
            aria-controls="mobile-drawer"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <span className="menu-btn__bar" />
            <span className="menu-btn__bar" />
            <span className="menu-btn__bar" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div
        id="mobile-drawer"
        className={`mobile-drawer ${menuOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="เมนูนำทาง"
      >
        <div className="mobile-drawer__header">
          <span className="brand__name">TROK</span>
          <button className="drawer-close" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} type="button">✕</button>
        </div>
        <nav className="mobile-drawer__nav">
          <Link to="/foods" onClick={() => setMenuOpen(false)}>🍚 เมนูอาหาร</Link>
          <Link to="/snacks" onClick={() => setMenuOpen(false)}>🍟 ของทานเล่น</Link>
          <Link to="/drinks?table=A1" onClick={() => setMenuOpen(false)}>🥤 เครื่องดื่ม</Link>
          <Link className="mobile-drawer__cta" to="/booking" onClick={() => setMenuOpen(false)}>จองโต๊ะ</Link>
        </nav>
      </div>
      {menuOpen && <div className="drawer-backdrop" onClick={() => setMenuOpen(false)} />}

      {/* HERO */}
      <section
        className="hero"
        onMouseEnter={stopAuto}
        onMouseLeave={startAuto}
        aria-roledescription="carousel"
        aria-label="เมนูแนะนำ"
      >
        <div className="hero__bg" aria-hidden />
        <div className="hero__glass">
          <button className="nav-btn left" aria-label="ก่อนหน้า" onClick={prev} type="button">‹</button>

          <div className="hero__imgWrap" aria-live="polite">
            <img src={slide.img} alt={slide.alt} loading="eager" />
          </div>

          <div className="hero__text">
            <p className="hero__eyebrow">เมนูแนะนำประจำวัน</p>
            <h1 className="hero__title">
              {slide.title.split("\n").map((t, i, a) => (
                <span key={i}>
                  {t}
                  {i < a.length - 1 && <br />}
                </span>
              ))}
            </h1>
            <p className="hero__price">เพียง <strong>{slide.price}</strong></p>
            <div className="hero__ctaRow">
              <Link className="btn btn--primary" to="/foods">ดูเมนูอาหาร</Link>
              <Link className="btn btn--ghost" to="/drinks?table=A1">สั่งเครื่องดื่ม</Link>
            </div>
          </div>

          <button className="nav-btn right" aria-label="ถัดไป" onClick={next} type="button">›</button>
        </div>

        <div className="dots" role="tablist" aria-label="ตัวเลือกสไลด์">
          {HEROES.map((_, i) => (
            <button
              key={i}
              className={`dot ${i === index ? "active" : ""}`}
              aria-label={`ไปสไลด์ที่ ${i + 1}`}
              aria-selected={i === index}
              role="tab"
              onClick={() => goTo(i)}
              type="button"
            />
          ))}
        </div>
      </section>

      {/* PROMOTIONS */}
      <section className="section container">
        <h2 className="section__title">
          เมนูแนะนำ
          <span className="section__pulse" aria-hidden />
        </h2>
        <div className="grid">
          {PROMOS.map((p) => (
            <div key={p.id} className="card">
              <div className="card__imgWrap">
                <div className="card__halo" />
                <img src={p.img} alt={p.name} loading="lazy" />
              </div>
              <div className="card__body">
                <h3 className="card__name">{p.name}</h3>
                <span className="badge">{p.price}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Admin link */}
      <div className="container">
        <div className="tiny-admin">
          <Link to="/admin/login" state={{ from: { pathname: "/admin" } }}>
            เข้าสู่ระบบผู้ดูแล
          </Link>
        </div>
      </div>

      {/* Health checker badge */}
      <HealthBadge />
    </div>
  );
}

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
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* รองรับลิงก์ QR เก่า /order?tableId=xx */}
        <Route path="/order" element={<OrderAlias />} />

        <Route path="/booking" element={<Booking />} />
        <Route path="/confirm" element={<ConfirmBooking />} />
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
    </AuthProvider>
  );
}
