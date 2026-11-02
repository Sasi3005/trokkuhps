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
   Utils: พก table param ให้ทุกลิงก์
================================ */
function withTable(currentSearch, to) {
  const out = typeof to === "string" ? { pathname: to } : { ...to };
  const toQS  = new URLSearchParams(out.search || "");
  const curQS = new URLSearchParams(currentSearch || "");
  const table =
    toQS.get("table") || toQS.get("tableId") ||
    curQS.get("table") || curQS.get("tableId");

  const next = new URLSearchParams(out.search || "");
  if (table) {
    next.set("table", table);
    next.delete("tableId");
    out.search = `?${next.toString()}`;
  } else if (!out.search) delete out.search;

  return out;
}

// Link ที่แนบ ?table= จาก URL ปัจจุบันให้อัตโนมัติ
function KeepTableLink({ to, ...props }) {
  const loc = useLocation();
  return <Link to={withTable(loc.search, to)} {...props} />;
}

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

  const label = state.ok ? "ระบบพร้อมให้บริการ" : state.code ? "ตรวจพบปัญหาการเชื่อมต่อ" : "กำลังเชื่อมต่อระบบ";

  return (
    <div className={`home-api-status ${state.ok ? "is-online" : "is-checking"}`} role="status" aria-live="polite" title={state.msg}>
      <i aria-hidden="true" />{label}
    </div>
  );
}

/* ================================
   Home + MobileMenu
================================ */
function Home() {
  const [index, setIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const timerRef = useRef(null);
  const slide = HEROES[index];

  const next = () => setIndex((current) => (current + 1) % HEROES.length);
  const prev = () => setIndex((current) => (current - 1 + HEROES.length) % HEROES.length);
  const stopAuto = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };
  const startAuto = () => {
    stopAuto();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timerRef.current = window.setInterval(() => setIndex((current) => (current + 1) % HEROES.length), 5200);
  };

  useEffect(() => {
    startAuto();
    return stopAuto;
  }, [index]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <div className="home-page">
      <header className="home-header">
        <Link to="/" className="home-brand" aria-label="TROK KU KPS หน้าแรก">
          <span className="home-brand__mark" aria-hidden="true"><i /><i /><i /></span>
          <span className="home-brand__word">TROK<small>KU KPS</small></span>
        </Link>
        <nav className="home-nav" aria-label="เมนูหลัก">
          <KeepTableLink to="/foods">อาหาร</KeepTableLink>
          <KeepTableLink to="/snacks">ของทานเล่น</KeepTableLink>
          <KeepTableLink to="/drinks">เครื่องดื่ม</KeepTableLink>
        </nav>
        <div className="home-header__actions">
          <span className="home-open"><i /> เปิดให้บริการ</span>
          <KeepTableLink className="home-booking" to="/booking">จองโต๊ะ <b aria-hidden="true">↗</b></KeepTableLink>
          <Link className="home-admin" to="/admin/login" state={{ from: { pathname: "/admin" } }}>เข้าสู่ระบบแอดมิน <span aria-hidden="true">↗</span></Link>
          <button className="home-menu-toggle" aria-label={menuOpen ? "ปิดเมนู" : "เปิดเมนู"} aria-expanded={menuOpen} aria-controls="home-mobile-menu" onClick={() => setMenuOpen((open) => !open)} type="button">
            <span /><span />
          </button>
        </div>
      </header>

      {menuOpen && <button className="home-menu-scrim" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} type="button" />}
      <aside id="home-mobile-menu" className={`home-mobile-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <div className="home-mobile-menu__top"><span>สำรวจเมนู</span><button onClick={() => setMenuOpen(false)} aria-label="ปิดเมนู" type="button">×</button></div>
        <nav aria-label="เมนูมือถือ">
          <KeepTableLink to="/foods" onClick={() => setMenuOpen(false)}>อาหาร <b>01</b></KeepTableLink>
          <KeepTableLink to="/snacks" onClick={() => setMenuOpen(false)}>ของทานเล่น <b>02</b></KeepTableLink>
          <KeepTableLink to="/drinks" onClick={() => setMenuOpen(false)}>เครื่องดื่ม <b>03</b></KeepTableLink>
          <KeepTableLink className="home-mobile-menu__book" to="/booking" onClick={() => setMenuOpen(false)}>จองโต๊ะ <span>↗</span></KeepTableLink>
          <Link className="home-mobile-menu__admin" to="/admin/login" state={{ from: { pathname: "/admin" } }} onClick={() => setMenuOpen(false)}>เข้าสู่ระบบผู้ดูแล <span>↗</span></Link>
        </nav>
        <span className="home-mobile-menu__note">GOOD FOOD, GOOD MOOD.</span>
      </aside>

      <main>
        <section className="home-hero" aria-roledescription="carousel" aria-label="เมนูเด่นประจำวัน" onMouseEnter={stopAuto} onMouseLeave={startAuto}>
          <div className="home-hero__copy">
            <p className="home-overline"><span /> TROK KU KPS <b>·</b> GOOD FOOD, GOOD MOOD</p>
            <p className="home-hero__eyebrow">เมนูเด่นประจำวัน <span>0{index + 1} / 0{HEROES.length}</span></p>
            <h1>{slide.title.split("\n").map((line, lineIndex, lines) => <span key={line}>{line}{lineIndex < lines.length - 1 && <br />}</span>)}</h1>
            <p className="home-hero__description">อิ่มอร่อยกับเมนูทำสด วัตถุดิบดี และรสชาติที่อยากกลับมาซ้ำ</p>
            <div className="home-hero__price"><span>เริ่มต้นเพียง</span><strong>{slide.price.replace(" บาท", "")}</strong><small>บาท</small></div>
            <div className="home-hero__actions">
              <KeepTableLink className="home-button home-button--primary" to="/foods">เลือกเมนูอาหาร <span>↗</span></KeepTableLink>
              <KeepTableLink className="home-button home-button--quiet" to="/drinks">ดูเครื่องดื่ม</KeepTableLink>
            </div>
            <div className="home-hero__controls" aria-label="ควบคุมเมนูเด่น">
              <button onClick={prev} type="button" aria-label="เมนูก่อนหน้า">←</button>
              {HEROES.map((hero, heroIndex) => <button key={hero.img} className={`home-hero__indicator ${index === heroIndex ? "is-active" : ""}`} onClick={() => setIndex(heroIndex)} aria-label={`ดูเมนูเด่น ${heroIndex + 1}`} aria-pressed={index === heroIndex} type="button" />)}
              <button onClick={next} type="button" aria-label="เมนูถัดไป">→</button>
              <span>เลื่อนเพื่อค้นพบเมนูโปรด</span>
            </div>
          </div>

          <div className="home-hero__art" aria-live="polite">
            <div className="home-hero__art-ring" />
            <span className="home-hero__art-index">TASTE<br />NO. 0{index + 1}</span>
            <img src={slide.img} alt={slide.alt} />
            <span className="home-hero__art-caption">ปรุงสด · เสิร์ฟร้อน</span>
            <span className="home-hero__spark home-hero__spark--one">✳</span>
            <span className="home-hero__spark home-hero__spark--two">✳</span>
          </div>
          <span className="home-hero__side-note">KASETSART UNIVERSITY · KAMPHAENG SAEN</span>
        </section>

        <section className="home-picks" aria-labelledby="home-picks-title">
          <div className="home-picks__heading">
            <div><p>MADE FOR YOUR NEXT BITE</p><h2 id="home-picks-title">จานโปรดที่อยากให้ลอง</h2></div>
            <KeepTableLink to="/foods" className="home-picks__all">ดูเมนูทั้งหมด <span>↗</span></KeepTableLink>
          </div>
          <div className="home-picks__grid">
            {PROMOS.map((item, itemIndex) => (
              <KeepTableLink key={item.id} className="home-dish" to="/foods" aria-label={`เลือก${item.name}`}>
                <div className="home-dish__visual"><img src={item.img} alt={item.name} loading="lazy" /><span className="home-dish__number">0{itemIndex + 1}</span><span className="home-dish__price">{item.price}</span></div>
                <div className="home-dish__info"><h3>{item.name}</h3><span>เลือกจานนี้ <b>↗</b></span></div>
              </KeepTableLink>
            ))}
          </div>
        </section>
      </main>

      <footer className="home-footer"><Link to="/" className="home-footer__brand">TROK <span>KU KPS</span></Link><span>อร่อยง่าย ๆ ใกล้รั้วเกษตร</span><Link to="/admin/login" state={{ from: { pathname: "/admin" } }}>สำหรับผู้ดูแล</Link></footer>
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
