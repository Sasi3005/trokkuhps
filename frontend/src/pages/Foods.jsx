// src/pages/Foods.jsx
import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Foods.css";

/* ========== Config & Utils ========== */
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const FOODS_API = `${API_BASE}/main_dishes`;
const cartKey = (table) => `fd_cart_${table || "unknown"}`;

// แปลงค่าตัวเลขให้ปลอดภัย
function norm(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ทำให้ค้นหาทนต่อช่องว่าง/ตัวพิมพ์เล็กใหญ่
function normText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")          // จัดรูปให้เท่ากัน
    .replace(/\s+/g, " ")       // เว้นวรรคซ้อน
    .trim();
}

// ไฮไลต์ข้อความที่ตรงค้นหา
function highlight(text, q) {
  if (!q) return text;
  const t = String(text || "");
  const i = t.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return t;
  return (
    <>
      {t.slice(0, i)}
      <mark className="fd-mark">{t.slice(i, i + q.length)}</mark>
      {t.slice(i + q.length)}
    </>
  );
}

export default function Foods() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  // ✅ โต๊ะอ่านจาก query (ถ้ายังไม่สแกนให้ว่างได้)
  const tableLabel = sp.get("table")?.trim() || "";

  // ====== โหลดรายการอาหาร ======
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setError(null);
        setLoading(true);

        const res = await fetch(`${FOODS_API}?limit=200`, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const payload = Array.isArray(data) ? data : data.items || [];

        const base = payload.map((d) => {
          const idRaw = d.id ?? d.item_id ?? d.main_id ?? d.menu_id;
          const id = (idRaw !== null && idRaw !== undefined && idRaw !== "")
            ? String(idRaw)
            : `name:${d.name}`;

          const basePrice =
            norm(d.price) ??
            norm(d.default_price) ??
            norm(d.food_price) ??
            0;
          const price = Number(basePrice) + Number(norm(d.extra_price) ?? 0);

          const img = d.image ? `data:image/png;base64,${d.image}` : "/images/foods/placeholder.jpg";

          return {
            id,
            name: d.name,
            price,
            img,
            qty: 0,
            itemNote: "",
          };
        });

        // ✅ merge cart ต่อโต๊ะ
        const saved = sessionStorage.getItem(cartKey(tableLabel));
        if (saved) {
          const parsed = JSON.parse(saved || "[]");
          const byId = Object.fromEntries((Array.isArray(parsed) ? parsed : []).map((x) => [String(x.id), x]));
          for (const it of base) {
            const prev = byId[it.id];
            if (!prev) continue;
            it.qty = Math.max(0, prev.qty ?? 0);
            if (typeof prev.itemNote === "string") it.itemNote = prev.itemNote;
          }
        }

        if (alive) setItems(base);
      } catch (e) {
        if (alive) setError(e.message || "โหลดข้อมูลล้มเหลว");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [tableLabel]);

  // ====== Persist cart ======
  useEffect(() => {
    try {
      sessionStorage.setItem(cartKey(tableLabel), JSON.stringify(items));
    } catch {}
  }, [items, tableLabel]);

  // ====== ค้นหา (เดบาวน์ + sync URL) ======
  const initialQ = sp.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const qTimer = useRef(null);

  useEffect(() => {
    // อ่านเมื่อเปลี่ยน URL ด้วยมือ
    const now = sp.get("q") ?? "";
    setQuery(now);
    setDebouncedQ(now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.get("q")]);

  const onChangeQuery = (v) => {
    setQuery(v);
    if (qTimer.current) clearTimeout(qTimer.current);
    qTimer.current = setTimeout(() => {
      setDebouncedQ(v);
      const next = new URLSearchParams(sp);
      if (v) next.set("q", v);
      else next.delete("q");
      setSp(next, { replace: true });
    }, 220);
  };

  const clearQuery = () => onChangeQuery("");

  // ====== บวก/ลบจำนวน ======
  const dec = (id) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, qty: Math.max(0, it.qty - 1) } : it)));
  const inc = (id) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, qty: it.qty + 1 } : it)));

  // ====== Filtered items ======
  const filtered = useMemo(() => {
    const q = normText(debouncedQ);
    if (!q) return items;
    return items.filter((it) => normText(it.name).includes(q));
  }, [items, debouncedQ]);

  const cartCount = useMemo(() => items.reduce((sum, it) => sum + (it.qty || 0), 0), [items]);
  const cartTotal = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.price || 0) * (it.qty || 0)), 0),
    [items]
  );

  // ====== ไปหน้า Confirm ======
  const goConfirm = () => {
    const selected = items.filter((it) => (it.qty || 0) > 0);
    if (!selected.length) {
      alert("ยังไม่ได้เลือกรายการอาหาร");
      return;
    }

    const keySel = `${cartKey(tableLabel)}_selected`;
    try {
      sessionStorage.setItem(
        keySel,
        JSON.stringify(
          selected.map((x) => ({
            ...x,
            food_id: String(x.id),
            price: Number(x.price),
          }))
        )
      );
      sessionStorage.setItem(cartKey(tableLabel), JSON.stringify(items));
    } catch {}

    navigate(`/foods/confirm?table=${encodeURIComponent(tableLabel)}`, {
      state: {
        items: selected.map((x) => ({
          ...x,
          food_id: String(x.id),
          price: Number(x.price),
        })),
      },
    });
  };

  // ====== UI ======
  return (
    <div className="fd-page">
      {/* Topbar */}
      <header className="fd-topbar" role="banner">
        <button className="fd-back" onClick={() => navigate("/")} aria-label="ย้อนกลับ">‹</button>
        <div className="fd-title">
          <span>หมายเลขโต๊ะ</span>
          <strong>{tableLabel || "—"}</strong>
        </div>
        <button className="fd-cartBtn" onClick={goConfirm} aria-label="ไปยืนยันออเดอร์">
          <span className="fd-cartIcon" aria-hidden>🧺</span>
          <span className="fd-badge" aria-live="polite">{cartCount}</span>
        </button>
      </header>

      {/* Content — ใช้ container แบบกว้าง */}
      <main className="fd-container fd-container--fluid" role="main">
        <h2 className="fd-sectionTitle">เมนูอาหาร</h2>

        {/* ====== Search Bar ====== */}
        <div className="fd-searchWrap" role="search">
          <span className="fd-searchIcon" aria-hidden>🔎</span>
          <input
            className="fd-search"
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder="ค้นหาเมนู เช่น “ข้าว”, “กะเพรา”, “ราเมง”…"
            aria-label="ค้นหาเมนู"
            inputMode="search"
          />
          {query && (
            <button className="fd-clearBtn" onClick={clearQuery} aria-label="ล้างคำค้น">✕</button>
          )}
        </div>

        {/* Result info */}
        {!loading && (
          <div className="fd-resultMeta" aria-live="polite">
            {debouncedQ
              ? <>ผลลัพธ์ <b>{filtered.length}</b> รายการ สำหรับ “{debouncedQ}”</>
              : <>ทั้งหมด <b>{items.length}</b> รายการ</>}
          </div>
        )}

        {error && (
          <div className="fd-error" role="alert">❌ โหลดข้อมูลล้มเหลว: {error}</div>
        )}

        {loading ? (
          <ul className="fd-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={`sk-${i}`} className="fd-card fd-skeleton">
                <div className="fd-thumb sk" />
                <div className="fd-info">
                  <div className="sk sk-line sk-1" />
                  <div className="sk sk-line sk-2" />
                </div>
                <div className="fd-ctrl">
                  <div className="sk sk-pill" />
                </div>
              </li>
            ))}
          </ul>
        ) : filtered.length ? (
          <ul className="fd-grid">
            {filtered.map((it) => (
              <li key={`fd-${it.id}`} className="fd-card">
                <div className="fd-thumbWrap">
                  <img
                    className="fd-thumb"
                    src={it.img}
                    alt={it.name}
                    loading="lazy"
                    onError={(e) => {
                      if (e.currentTarget.src !== "/images/foods/placeholder.jpg") {
                        e.currentTarget.src = "/images/foods/placeholder.jpg";
                      }
                    }}
                  />
                </div>

                <div className="fd-info">
                  <h3 className="fd-name" title={it.name}>{highlight(it.name, debouncedQ)}</h3>
                  <div className="fd-price">{Number(it.price || 0).toFixed(2)} ฿</div>
                </div>

                <div className="fd-ctrl" aria-label={`ตัวควบคุมจำนวน ${it.name}`}>
                  <button className="fd-circle" onClick={() => dec(it.id)} aria-label={`ลด ${it.name}`}>–</button>
                  <span className="fd-qty" aria-live="polite">{it.qty}</span>
                  <button className="fd-circle" onClick={() => inc(it.id)} aria-label={`เพิ่ม ${it.name}`}>+</button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="fd-empty">
            <div className="fd-emptyEmoji" aria-hidden>🍽️</div>
            <div className="fd-emptyTitle">ไม่พบเมนูที่ตรงกับ “{debouncedQ}”</div>
            <div className="fd-emptyHint">ลองพิมพ์ให้สั้นลง เช่น “ข้าว”, “หมู”, “ผัด” หรือกดล้างคำค้น</div>
            <button className="fd-emptyBtn" onClick={clearQuery} aria-label="แสดงเมนูทั้งหมด">แสดงทั้งหมด</button>
          </div>
        )}
      </main>

      {/* Bottom confirm bar */}
      <div className={`fd-bottom ${cartCount ? "show" : ""}`} role="region" aria-live="polite">
        <div className="fd-bottomInfo">
          <span className="fd-bottomCount">{cartCount} รายการ</span>
          <span className="fd-bottomTotal">{cartTotal.toFixed(2)} ฿</span>
        </div>
        <button className="fd-bottomBtn" onClick={goConfirm}>
          ยืนยันออเดอร์
        </button>
      </div>
    </div>
  );
}
